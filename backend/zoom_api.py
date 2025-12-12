"""
Zoom Cloud Recordings API endpoints
Provides sync, list, download, and skip functionality for Zoom recordings.
"""

import os
import json
import base64
import requests
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path

router = APIRouter(prefix="/api/zoom", tags=["zoom"])

# Configuration from environment
ZOOM_ACCOUNT_ID = os.environ.get('ZOOM_ACCOUNT_ID')
ZOOM_CLIENT_ID = os.environ.get('ZOOM_CLIENT_ID')
ZOOM_CLIENT_SECRET = os.environ.get('ZOOM_CLIENT_SECRET')
AZURE_CONNECTION_STRING = os.environ.get('AZURE_BLOB_CONNECTION_STRING')
AZURE_CONTAINER = 'zoom-recordings'

# Index path for persistent storage
TRANSCRIPTS_DIR = Path("/app/data/transcripts")
INDEX_PATH = TRANSCRIPTS_DIR / "index.json"
RECORDINGS_CACHE_PATH = TRANSCRIPTS_DIR / "recordings_cache.json"
SKIPPED_IDS_PATH = TRANSCRIPTS_DIR / "skipped_ids.json"

def load_zoom_index():
    if not INDEX_PATH.exists():
        return {}
    try:
        return json.loads(INDEX_PATH.read_text("utf-8"))
    except (json.JSONDecodeError, OSError, UnicodeDecodeError, TypeError):
        return {}

def save_zoom_index(items):
    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")

def load_recordings_cache():
    """Load recordings from persistent cache."""
    if not RECORDINGS_CACHE_PATH.exists():
        return {}
    try:
        return json.loads(RECORDINGS_CACHE_PATH.read_text("utf-8"))
    except (json.JSONDecodeError, OSError, UnicodeDecodeError, TypeError):
        return {}

def save_recordings_cache(recordings):
    """Save recordings to persistent cache."""
    RECORDINGS_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    RECORDINGS_CACHE_PATH.write_text(json.dumps(recordings, ensure_ascii=False, indent=2), encoding="utf-8")

def load_skipped_ids():
    """Load skipped IDs from persistent storage."""
    if not SKIPPED_IDS_PATH.exists():
        return set()
    try:
        return set(json.loads(SKIPPED_IDS_PATH.read_text("utf-8")))
    except (json.JSONDecodeError, OSError, UnicodeDecodeError, TypeError):
        return set()

def save_skipped_ids(ids):
    """Save skipped IDs to persistent storage."""
    SKIPPED_IDS_PATH.parent.mkdir(parents=True, exist_ok=True)
    SKIPPED_IDS_PATH.write_text(json.dumps(list(ids), ensure_ascii=False), encoding="utf-8")


def get_transcribed_zoom_ids():
    items = load_zoom_index()
    return {item.get("zoom_id") for item in items if item.get("source") == "zoom" and item.get("zoom_id")}

# In-memory storage for recordings (in production, use database)
_recordings_cache = load_recordings_cache()
_skipped_ids = load_skipped_ids()


class RecordingItem(BaseModel):
    zoom_id: str
    topic: str
    date: str
    duration: int
    file_type: str
    status: str
    download_url: Optional[str] = None


class RecordingsResponse(BaseModel):
    recordings: List[RecordingItem]


def get_zoom_access_token():
    """Get OAuth access token from Zoom using Server-to-Server OAuth."""
    if not all([ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET]):
        raise HTTPException(status_code=500, detail="Zoom credentials not configured")

    url = "https://zoom.us/oauth/token"
    credentials = f"{ZOOM_CLIENT_ID}:{ZOOM_CLIENT_SECRET}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()

    headers = {
        "Authorization": f"Basic {encoded_credentials}",
        "Content-Type": "application/x-www-form-urlencoded"
    }

    data = {
        "grant_type": "account_credentials",
        "account_id": ZOOM_ACCOUNT_ID
    }

    response = requests.post(url, headers=headers, data=data, timeout=30)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Failed to get Zoom token: {response.text}")

    return response.json()['access_token']


def list_zoom_recordings(access_token, days_back=30):
    """List all cloud recordings from Zoom."""
    from_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')
    to_date = datetime.now().strftime('%Y-%m-%d')

    url = "https://api.zoom.us/v2/users/me/recordings"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {"from": from_date, "to": to_date, "page_size": 100}

    response = requests.get(url, headers=headers, params=params, timeout=60)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Failed to list recordings: {response.text}")

    return response.json()


@router.post("/sync")
async def sync_from_zoom():
    """Sync recordings from Zoom Cloud, checking Azure for already-downloaded files."""
    global _recordings_cache

    try:
        access_token = get_zoom_access_token()
        data = list_zoom_recordings(access_token, days_back=30)

        # Get list of existing blobs in Azure to check what's already downloaded
        existing_blobs = set()
        try:
            from azure.storage.blob import BlobServiceClient
            blob_service = BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING, connection_timeout=300, read_timeout=600)
            container_client = blob_service.get_container_client(AZURE_CONTAINER)
            for blob in container_client.list_blobs(name_starts_with="pending/"):
                # Extract zoom_id from blob name (format: pending/date_topic_zoomid.ext)
                parts = blob.name.rsplit('_', 1)
                if len(parts) == 2:
                    zoom_id_with_ext = parts[1]
                    zoom_id = zoom_id_with_ext.rsplit('.', 1)[0]
                    existing_blobs.add(zoom_id)
        except Exception as e:
            print(f"Warning: Could not check Azure blobs: {e}")

        meetings = data.get('meetings', [])
        recordings = []

        for meeting in meetings:
            meeting_id = meeting.get('uuid', '')
            topic = meeting.get('topic', 'Untitled')
            start_time = meeting.get('start_time', '')
            duration = meeting.get('duration', 0)

            for rec in meeting.get('recording_files', []):
                file_type = rec.get('file_type', '')
                if file_type not in ['M4A', 'MP4']:
                    continue

                zoom_id = rec.get('id', '')

                # Get transcribed IDs from index
                transcribed_ids = get_transcribed_zoom_ids()

                # Determine status based on what we know
                if zoom_id in _skipped_ids:
                    status = 'skipped'
                elif zoom_id in transcribed_ids:
                    status = 'transcribed'  # Already transcribed!
                elif zoom_id in existing_blobs:
                    status = 'completed'  # In Azure, ready to transcribe
                else:
                    status = 'in_zoom'

                recording = {
                    'zoom_id': zoom_id,
                    'topic': topic,
                    'date': start_time[:10] if start_time else '',
                    'duration': duration,
                    'file_type': file_type,
                    'status': status,
                    'download_url': rec.get('download_url', '')
                }
                recordings.append(recording)
                _recordings_cache[zoom_id] = recording

        save_recordings_cache(_recordings_cache)
        return {"success": True, "count": len(recordings)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recordings", response_model=RecordingsResponse)
async def get_recordings():
    """Get list of cached recordings."""
    recordings = list(_recordings_cache.values())
    # Sort by date descending
    recordings.sort(key=lambda x: x.get('date', ''), reverse=True)
    return {"recordings": recordings}


@router.get("/transcripts")
async def get_transcripts():
    """Get list of transcribed Zoom recordings from the index."""
    items = load_zoom_index()
    # Filter for zoom source and return as transcripts
    zoom_transcripts = [item for item in items if item.get("source") == "zoom"]
    # Sort by date descending
    zoom_transcripts.sort(key=lambda x: x.get('date', ''), reverse=True)
    return {"transcripts": zoom_transcripts}

@router.get("/transcripts/{transcript_id}")
async def get_transcript(transcript_id: str):
    """Get a specific transcript by ID."""
    items = load_zoom_index()
    for item in items:
        if item.get("id") == transcript_id or item.get("zoom_id") == transcript_id:
            transcript_content = item.get("transcript", "")
            if isinstance(transcript_content, list):
                transcript_content = " ".join(
                    seg.get("text", str(seg)) if isinstance(seg, dict) else str(seg)
                    for seg in transcript_content
                )
            return {"content": transcript_content, "title": item.get("title", "Zoom Recording"), "date": item.get("date", "")}
    raise HTTPException(status_code=404, detail="Transcript not found")


@router.post("/download/{zoom_id}")
async def download_recording(zoom_id: str):
    """Download a recording from Zoom to Azure."""
    global _recordings_cache

    if zoom_id not in _recordings_cache:
        raise HTTPException(status_code=404, detail="Recording not found")

    recording = _recordings_cache[zoom_id]

    try:
        # Update status
        _recordings_cache[zoom_id]['status'] = 'downloading'

        access_token = get_zoom_access_token()
        download_url = recording.get('download_url', '')

        if not download_url:
            raise HTTPException(status_code=400, detail="No download URL")

        # Download the file
        headers = {"Authorization": f"Bearer {access_token}"}
        response = requests.get(download_url, headers=headers, stream=True, timeout=300)

        if response.status_code != 200:
            _recordings_cache[zoom_id]['status'] = 'failed'
            raise HTTPException(status_code=500, detail="Download failed")

        # Upload to Azure Blob Storage
        from azure.storage.blob import BlobServiceClient

        blob_service = BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING, connection_timeout=300, read_timeout=600)
        container_client = blob_service.get_container_client(AZURE_CONTAINER)

        # Create filename
        topic = recording.get('topic', 'Untitled')
        safe_topic = "".join(c for c in topic if c.isalnum() or c in ' -_').strip()[:50]
        date_str = recording.get('date', datetime.now().strftime('%Y-%m-%d'))
        extension = recording.get('file_type', 'M4A').lower()
        blob_name = f"pending/{date_str}_{safe_topic}_{zoom_id}.{extension}"

        blob_client = container_client.get_blob_client(blob_name)
        blob_client.upload_blob(response.content, overwrite=True)

        _recordings_cache[zoom_id]['status'] = 'completed'
        return {"success": True, "blob_name": blob_name}

    except HTTPException:
        raise
    except Exception as e:
        _recordings_cache[zoom_id]['status'] = 'failed'
        # Convert error to user-friendly message
        raw_error = str(e).lower()
        error_msg = "Download failed"
        if 'timeout' in raw_error or 'timed out' in raw_error:
            error_msg = "Download timeout - the file is large. Try again or use a shorter recording."
        elif 'blob' in raw_error and 'not found' in raw_error:
            error_msg = "File not found in storage. Try downloading the recording again."
        elif 'api key' in raw_error or 'invalid' in raw_error:
            error_msg = "Gemini API error - check API key configuration."
        elif 'connection' in raw_error:
            error_msg = "Connection error - check network and try again."
        elif 'quota' in raw_error or 'limit' in raw_error:
            error_msg = "API quota exceeded - try again later."
        raise HTTPException(status_code=500, detail=error_msg)


@router.post("/skip/{zoom_id}")
async def skip_recording(zoom_id: str):
    """Mark a recording as skipped."""
    global _recordings_cache, _skipped_ids

    _skipped_ids.add(zoom_id)
    save_skipped_ids(_skipped_ids)  # Persist to disk

    if zoom_id in _recordings_cache:
        _recordings_cache[zoom_id]['status'] = 'skipped'

    return {"success": True}

@router.post("/transcribe/{zoom_id}")
async def transcribe_recording(zoom_id: str):
    """Transcribe a downloaded recording using Gemini."""
    global _recordings_cache

    if zoom_id not in _recordings_cache:
        raise HTTPException(status_code=404, detail="Recording not found")

    recording = _recordings_cache[zoom_id]

    if recording.get('status') != 'completed':
        raise HTTPException(status_code=400, detail="Recording must be downloaded first")

    try:
        # Update status
        _recordings_cache[zoom_id]['status'] = 'transcribing'

        # Import the transcribe function from main
        from backend.main import gemini_transcribe_audio, gemini_transcribe_with_speaker_id
        from azure.storage.blob import BlobServiceClient
        import tempfile

        # Get the blob name from the recording
        topic = recording.get('topic', 'Untitled')
        safe_topic = "".join(c for c in topic if c.isalnum() or c in ' -_').strip()[:50]
        date_str = recording.get('date', '')
        extension = recording.get('file_type', 'M4A').lower()
        blob_name = f"pending/{date_str}_{safe_topic}_{zoom_id}.{extension}"

        # Download from Azure to temp file
        blob_service = BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING, connection_timeout=300, read_timeout=600)
        container_client = blob_service.get_container_client(AZURE_CONTAINER)
        blob_client = container_client.get_blob_client(blob_name)

        with tempfile.NamedTemporaryFile(suffix=f'.{extension}', delete=False) as tmp:
            tmp.write(blob_client.download_blob().readall())
            tmp_path = tmp.name

        # Transcribe
        topic = recording.get('topic', '')
        transcript = gemini_transcribe_with_speaker_id(tmp_path, topic)

        # Clean up temp file
        import os
        os.unlink(tmp_path)

        # Save transcript to cache
        _recordings_cache[zoom_id]['status'] = 'transcribed'
        _recordings_cache[zoom_id]['transcript'] = transcript

        # Save to persistent index
        items = load_zoom_index()
        # Remove any existing entry for this zoom_id
        items = [item for item in items if item.get("zoom_id") != zoom_id]
        # Add new entry
        items.append({
            "id": f"zoom_{zoom_id}",
            "zoom_id": zoom_id,
            "source": "zoom",
            "title": recording.get('topic', 'Untitled'),
            "date": recording.get('date', ''),
            "duration": recording.get('duration', 0),
            "file_type": recording.get('file_type', ''),
            "transcript": transcript,
            "status": "transcribed"
        })
        save_zoom_index(items)

        return {"success": True, "transcript": transcript}

    except HTTPException:
        raise
    except Exception as e:
        _recordings_cache[zoom_id]['status'] = 'failed'
        # Convert error to user-friendly message
        raw_error = str(e).lower()
        error_msg = "Download failed"
        if 'timeout' in raw_error or 'timed out' in raw_error:
            error_msg = "Download timeout - the file is large. Try again or use a shorter recording."
        elif 'blob' in raw_error and 'not found' in raw_error:
            error_msg = "File not found in storage. Try downloading the recording again."
        elif 'api key' in raw_error or 'invalid' in raw_error:
            error_msg = "Gemini API error - check API key configuration."
        elif 'connection' in raw_error:
            error_msg = "Connection error - check network and try again."
        elif 'quota' in raw_error or 'limit' in raw_error:
            error_msg = "API quota exceeded - try again later."
        raise HTTPException(status_code=500, detail=error_msg)

