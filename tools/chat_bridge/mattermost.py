"""
Mattermost REST API Client for Chat Bridge

This module provides a REST API client for posting replies and fetching posts
from Mattermost. Used by the bidirectional bridge for responding to CEO commands.

Reference: PRD_MATTERMOST_BIDIRECTIONAL.md sections 10.2, 10.5, 11

API Endpoints Used:
- GET /api/v4/posts/{post_id} - Fetch post for context extraction
- POST /api/v4/posts - Create reply in thread

Authentication:
- Personal Access Token via Authorization: Bearer header
- Token stored in secrets.local.json under mattermost.api_token
"""

import logging
from typing import Optional
import requests
from datetime import datetime

from .models import MattermostPost, BridgeResponse
from .config import get_config, Config

# Configure logging
logger = logging.getLogger(__name__)

# Timeout for all HTTP requests (seconds)
REQUEST_TIMEOUT = 5


class MattermostClient:
    """
    REST API client for Mattermost server.

    Provides methods for:
    - Fetching posts by ID (for context extraction)
    - Posting threaded replies (for bot responses)

    All methods have graceful error handling - they return error responses
    rather than raising exceptions, allowing the bridge to continue operation
    even when Mattermost is unavailable.

    Example:
        config = get_config()
        client = MattermostClient(
            base_url=config.mattermost.base_url,
            api_token=config.mattermost.api_token
        )

        # Fetch parent message
        parent = client.get_post("abc123xyz")

        # Post reply
        response = client.post_reply(
            channel_id="channel123",
            parent_id="abc123xyz",
            message="Task acknowledged!"
        )
    """

    def __init__(self, base_url: str, api_token: str):
        """
        Initialize Mattermost client.

        Args:
            base_url: Mattermost server URL (e.g., http://localhost:8065)
            api_token: Personal access token or bot token for authentication
        """
        self.base_url = base_url.rstrip('/')
        self.api_token = api_token
        self._session: Optional[requests.Session] = None

    @property
    def session(self) -> requests.Session:
        """Lazy-loaded requests session with auth headers."""
        if self._session is None:
            self._session = requests.Session()
            self._session.headers.update({
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json",
            })
        return self._session

    def _api_url(self, endpoint: str) -> str:
        """Build full API URL from endpoint path."""
        return f"{self.base_url}/api/v4{endpoint}"

    def get_post(self, post_id: str) -> Optional[MattermostPost]:
        """
        Fetch a post by ID.

        Used to get parent message content for context extraction
        (task ID, agent name, message type, etc.).

        Args:
            post_id: Mattermost post ID

        Returns:
            MattermostPost if successful, None if failed

        API: GET /api/v4/posts/{post_id}
        """
        if not post_id:
            logger.warning("get_post called with empty post_id")
            return None

        url = self._api_url(f"/posts/{post_id}")

        try:
            response = self.session.get(url, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()

            data = response.json()
            return MattermostPost(
                id=data.get("id", ""),
                create_at=data.get("create_at", 0),
                update_at=data.get("update_at", 0),
                edit_at=data.get("edit_at", 0),
                delete_at=data.get("delete_at", 0),
                user_id=data.get("user_id", ""),
                channel_id=data.get("channel_id", ""),
                root_id=data.get("root_id", ""),
                parent_id=data.get("parent_id", ""),
                message=data.get("message", ""),
                type=data.get("type", ""),
                hashtags=data.get("hashtags", ""),
                props=data.get("props", {}),
            )

        except requests.Timeout:
            logger.error(f"Mattermost API timeout fetching post {post_id} after {REQUEST_TIMEOUT}s")
            return None

        except requests.HTTPError as e:
            if e.response is not None and e.response.status_code == 404:
                logger.warning(f"Post {post_id} not found")
            else:
                logger.error(f"Mattermost API HTTP error fetching post {post_id}: {e}")
            return None

        except requests.RequestException as e:
            logger.error(f"Mattermost API error fetching post {post_id}: {e}")
            return None

        except Exception as e:
            logger.error(f"Unexpected error fetching post {post_id}: {e}")
            return None

    def post_reply(
        self,
        channel_id: str,
        parent_id: str,
        message: str,
        props: Optional[dict] = None
    ) -> BridgeResponse:
        """
        Post a reply to a message thread.

        Creates a new post as a reply to an existing thread. Uses root_id
        to attach the reply to the thread.

        Args:
            channel_id: Channel where the thread exists
            parent_id: Post ID to reply to (becomes root_id for thread)
            message: Message content (supports markdown)
            props: Optional additional properties (attachments, etc.)

        Returns:
            BridgeResponse with success/error status

        API: POST /api/v4/posts
        Payload: {"channel_id": ..., "message": ..., "root_id": ...}
        """
        if not channel_id:
            return BridgeResponse(
                success=False,
                message="",
                error_code="MISSING_CHANNEL_ID"
            )

        if not message:
            return BridgeResponse(
                success=False,
                message="",
                error_code="EMPTY_MESSAGE"
            )

        url = self._api_url("/posts")

        payload = {
            "channel_id": channel_id,
            "message": message,
        }

        # Only set root_id if we're replying to a thread
        if parent_id:
            payload["root_id"] = parent_id

        if props:
            payload["props"] = props

        try:
            response = self.session.post(url, json=payload, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()

            data = response.json()
            post_id = data.get("id", "unknown")

            logger.info(f"Posted reply to thread {parent_id} in channel {channel_id}: post_id={post_id}")

            return BridgeResponse(
                success=True,
                message=f"Reply posted (post_id: {post_id})",
                channel=channel_id,
            )

        except requests.Timeout:
            logger.error(f"Mattermost API timeout posting reply after {REQUEST_TIMEOUT}s")
            return self._handle_error(
                "Chat service timeout - reply not posted",
                "TIMEOUT"
            )

        except requests.HTTPError as e:
            status_code = e.response.status_code if e.response is not None else "unknown"
            logger.error(f"Mattermost API HTTP error posting reply: {status_code} - {e}")
            return self._handle_error(
                f"HTTP error {status_code}: {str(e)}",
                f"HTTP_{status_code}"
            )

        except requests.RequestException as e:
            logger.error(f"Mattermost API error posting reply: {e}")
            return self._handle_error(
                f"Network error: {str(e)}",
                "NETWORK_ERROR"
            )

        except Exception as e:
            logger.error(f"Unexpected error posting reply: {e}")
            return self._handle_error(
                f"Unexpected error: {str(e)}",
                "UNKNOWN_ERROR"
            )

    def post_message(
        self,
        channel_id: str,
        message: str,
        props: Optional[dict] = None
    ) -> BridgeResponse:
        """
        Post a new message (not a reply) to a channel.

        Convenience method for posting standalone messages.

        Args:
            channel_id: Channel to post to
            message: Message content (supports markdown)
            props: Optional additional properties

        Returns:
            BridgeResponse with success/error status
        """
        return self.post_reply(channel_id, "", message, props)

    def _handle_error(self, message: str, error_code: str) -> BridgeResponse:
        """
        Create error response for failed operations.

        Provides consistent error response format for graceful degradation.
        The bridge continues operation even when chat is unavailable.

        Args:
            message: Human-readable error message
            error_code: Machine-readable error code

        Returns:
            BridgeResponse with error details
        """
        return BridgeResponse(
            success=False,
            message=message,
            error_code=error_code,
            emoji=":warning:"
        )

    def health_check(self) -> bool:
        """
        Check if Mattermost server is reachable.

        Returns:
            True if server responds, False otherwise
        """
        try:
            # Use the ping endpoint if available, or just check base URL
            response = self.session.get(
                f"{self.base_url}/api/v4/system/ping",
                timeout=REQUEST_TIMEOUT
            )
            return response.status_code == 200
        except Exception:
            return False

    def close(self):
        """Close the HTTP session."""
        if self._session:
            self._session.close()
            self._session = None

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - close session."""
        self.close()


def get_client() -> MattermostClient:
    """
    Factory function to create a configured MattermostClient.

    Loads configuration from config.py (which reads secrets.local.json).

    Returns:
        Configured MattermostClient instance

    Example:
        client = get_client()
        post = client.get_post("abc123")
    """
    config = get_config()
    return MattermostClient(
        base_url=config.mattermost.base_url,
        api_token=config.mattermost.api_token
    )


# Async compatibility wrappers (for future async support)
# Note: Currently using synchronous requests for simplicity.
# These can be converted to aiohttp if async is needed.

async def async_get_post(post_id: str) -> Optional[MattermostPost]:
    """
    Async wrapper for get_post (currently runs synchronously).

    Provided for API compatibility with async bridge code.
    Can be converted to true async with aiohttp later.
    """
    client = get_client()
    try:
        return client.get_post(post_id)
    finally:
        client.close()


async def async_post_reply(
    channel_id: str,
    parent_id: str,
    message: str
) -> BridgeResponse:
    """
    Async wrapper for post_reply (currently runs synchronously).

    Provided for API compatibility with async bridge code.
    """
    client = get_client()
    try:
        return client.post_reply(channel_id, parent_id, message)
    finally:
        client.close()
