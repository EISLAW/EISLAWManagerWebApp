-- recordings table
CREATE TABLE IF NOT EXISTS recordings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    zoom_id TEXT UNIQUE,
    zoom_meeting_id TEXT,
    topic TEXT NOT NULL,
    date TEXT,
    start_time TEXT,
    duration_minutes INTEGER,
    file_type TEXT,
    file_size_mb REAL,
    download_url TEXT,
    azure_blob TEXT,
    local_path TEXT,
    status TEXT DEFAULT 'pending',
    error TEXT,
    client_id TEXT,
    domain TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    downloaded_at TEXT,
    transcribed_at TEXT,
    synced_at TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX IF NOT EXISTS idx_recordings_zoom_id ON recordings(zoom_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_date ON recordings(date);
CREATE INDEX IF NOT EXISTS idx_recordings_client ON recordings(client_id);

-- transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    recording_id TEXT,
    title TEXT,
    content TEXT,
    segments TEXT,
    language TEXT DEFAULT 'he',
    model_used TEXT,
    status TEXT DEFAULT 'draft',
    domain TEXT,
    client_id TEXT,
    tags TEXT,
    file_path TEXT,
    audio_path TEXT,
    word_count INTEGER,
    duration_seconds INTEGER,
    hash TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    published_at TEXT,
    reviewed_by TEXT,
    FOREIGN KEY (recording_id) REFERENCES recordings(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE INDEX IF NOT EXISTS idx_transcripts_recording ON transcripts(recording_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_status ON transcripts(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_client ON transcripts(client_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_hash ON transcripts(hash);

-- rag_documents table
CREATE TABLE IF NOT EXISTS rag_documents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    transcript_id TEXT NOT NULL,
    chunk_index INTEGER,
    chunk_text TEXT NOT NULL,
    meilisearch_id TEXT,
    embedding_model TEXT,
    indexed_at TEXT,
    FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rag_docs_transcript ON rag_documents(transcript_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_meili ON rag_documents(meilisearch_id);
