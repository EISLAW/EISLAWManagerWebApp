# VM Storage Migration Research (STORAGE-001)

## 1. Executive Summary
- VM disk (`/dev/root`) is 69% used (20G/29G). The dominant movable data is **2.2G of Outlook email `.eml` archives** under `clients/Unassigned/emails` (≈1,799 files). Other notable consumers: Git repo objects (1.2G), system logs (289M under `/var/log`, 231M journal), and lingering npm/node/playwright caches (~48M). Application databases are small (<5M).
- No evidence of SharePoint or Blob offloading for email content; email JSON/EML and indexes are stored on the VM filesystem. Database schemas already anticipate remote storage (`azure_blob` in `recordings`, SharePoint URLs), so introducing Blob URLs aligns with current patterns.
- Docker storage usage could not be measured (docker CLI timed out), but expect additional footprint in `/var/lib/docker` from images/volumes. Include Docker cleanup in the plan to reclaim space.
- Recommendation: Move email payloads (EML/JSON) and any future file exports/backups to Azure Blob (Hot tier) with lifecycle policies to Cool after 30–60 days. Keep DB/indexes locally; store blob URLs in DB tables. Target disk use drop to <40% with recurring log/docker cleanup.

## 2. Current State Analysis (VM)

| Path | Size | Contents | Purpose | Move? |
| --- | --- | --- | --- | --- |
| `/home/azureuser/EISLAWManagerWebApp/clients/Unassigned/emails` | 2.2G | Outlook `.eml` payloads + nested folders (≈1,799 files) | Email archive per client | **Yes → Blob** |
| `/home/azureuser/EISLAWManagerWebApp/.git/objects` | 1.2G | Git packs | Source control | No (run `git gc` to slim) |
| `/home/azureuser/EISLAWManagerWebApp/data` | 4.1M | SQLite DBs (`eislaw.db` 3.8M), backups, tasks.json | App data | Keep (DB stays on disk) |
| `/home/azureuser/EISLAWManagerWebApp/rag_local/chroma_legal` | 17M | Chroma SQLite/vector data | Local RAG cache | Maybe (could move to managed search later) |
| `/home/azureuser/langfuse/.git` | 64M | Langfuse repo | Observability tooling | Keep |
| `/home/azureuser/.local/lib`, `.npm`, `node_modules` | ~48M combined | Python/npm caches, playwright-core | Tooling caches | Clean periodically |
| `/var/log/journal` | 231M | Systemd journals | OS logs | Trim/rotate; optionally ship to Blob |
| `/var/log` (other) | 58M | sysstat, azure agent, apt | OS logs | Trim/rotate |
| `/home/azureuser/EISLAWManagerWebApp/tests`, `frontend`, `docs` | <15M each | Code/tests/docs | Keep |
| Docker data (`/var/lib/docker`, unknown) | (unmeasured) | Images, volumes, logs | Runtime | **Cleanup** (prune images/volumes once measured) |

Disk commands executed:
- `df -h` → `/dev/root` 20G used / 9.1G free (69%).
- `du -h --max-depth=2 /home/azureuser | sort -hr | head -20` (see sizes above).
- `du -h --max-depth=2 ~/EISLAWManagerWebApp | sort -hr | head -20` (clients/emails dominates).
- `find ~/EISLAWManagerWebApp -type f (eml|pdf|docx)` → EML files in clients tree.
- `find /home/azureuser -type f -size +10M` → large EMLs and `rag_local/chroma.sqlite3`.
- `sudo du -h --max-depth=1 /var/log` → 289M total (231M journal).
- `docker system df` and `/var/lib/docker` sizing timed out (needs follow-up with sudo and longer timeout).

## 3. File Categorization & Decision Matrix

| File Type / Location | Current Location | Should Move? | Target | Rationale |
| --- | --- | --- | --- | --- |
| Email EML payloads | `clients/*/emails/*.eml` | Yes | Azure Blob (`eislaw-emails`) | Largest movable set; immutable; safe to URL-reference |
| Email JSON bodies | `clients/*/emails/*.json` | Yes | Azure Blob (`eislaw-emails/json`) | Same lifecycle as EML; reduces disk churn |
| Email index DB | `clients/email_index.sqlite` | Keep local | VM disk | Small (FTS), benefits from low latency; rebuildable |
| Client folder pointers | `clients/*` folder metadata | Keep | DB only | Store SharePoint/Blob URLs, not files |
| Recording media | `recordings/` or `local_path` in DB (future) | Yes (new writes) | Azure Blob (`eislaw-media`) | Already modeled with `azure_blob`; heavy files |
| Transcript text files | `transcripts/*.txt` (if generated) | Yes (new writes) | Azure Blob (`eislaw-transcripts`) | Durable storage; keep DB references |
| Backups/exports | `data/backups`, ad-hoc exports | Yes | Azure Blob (`eislaw-backups/exports`) | Free disk + centralizes retention |
| Logs (archives) | Rotated `/var/log` / app logs | Maybe | Azure Blob (`eislaw-logs`) | Keep 7–14 days locally; archive to Blob |
| Databases (`data/*.db`) | VM disk | Keep | VM disk | Small, transactional; avoid latency |
| Git/Repos | VM disk | Keep | VM disk | Source control; can be GC’d |

## 4. Database Impact (path ↔ URL mapping)

| Table | Column(s) | Current Use | Proposed Change |
| --- | --- | --- | --- |
| `messages` (email_index.sqlite) | `json_path`, `eml_path` | Local filesystem paths | Store Blob URL in new `json_url`, `eml_url`; keep local path optional until cutover |
| `recordings` | `local_path`, `azure_blob` | Local file path + optional blob field | Make `azure_blob` required for new items; migrate `local_path` files to Blob and backfill `azure_blob` |
| `transcripts` | `file_path`, `audio_path` | Local file references | Add `file_url`, `audio_url`; migrate files to Blob; keep hash/duration in DB |
| `clients` | `sharepoint_url`, `local_folder` | Folder pointers | Ensure SharePoint remains source for docs; no migration needed |
| `tasks` | `attachments` JSON (may include `local_path`), `client_folder_path` | Potential file references | Enforce attachments as SharePoint/Blob links; deprecate local paths |
| `agent_audit_log` | `output_data` may include temp file refs | No schema change | Ensure blob URLs logged, not temp paths |

Migration note: keep dual columns during transition (path + url) and add data migration scripts to backfill URLs before removing path usage in code.

## 5. Azure Blob Architecture

- **Storage account**: `eislawstorage` (or dedicated `eislawfiles`) with private endpoints enabled.
- **Containers & layout**
  - `eislaw-emails/{client_slug}/{thread_id}/{message_id}.eml`
  - `eislaw-emails-json/{client_slug}/{thread_id}/{message_id}.json`
  - `eislaw-media/{client_slug}/{recording_id}.{ext}`
  - `eislaw-transcripts/{client_slug}/{transcript_id}.txt`
  - `eislaw-backups/{date}/eislaw.db`, `tasks.json`, exports
  - `eislaw-logs/{service}/{yyyy}/{mm}/{dd}/...`
- **Access/auth**: Prefer managed identity from VM/app; fall back to connection string stored in `secrets.local.json`. Use user delegation SAS for signed URLs to clients.
- **Lifecycle**: Hot tier default; transition to Cool after 30–60 days for emails/media; optional delete after 1–2 years for logs/exports. Enable versioning + soft delete on containers.
- **Python pattern**
```python
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
from datetime import datetime, timedelta

blob_service = BlobServiceClient.from_connection_string(CONN_STR)
blob = blob_service.get_blob_client("eislaw-emails", f"{client_slug}/{msg_id}.eml")
blob.upload_blob(eml_bytes, overwrite=True, content_type="message/rfc822")
blob_url = blob.url  # store in DB

sas = generate_blob_sas(
    account_name=blob_service.account_name,
    container_name="eislaw-emails",
    blob_name=f"{client_slug}/{msg_id}.eml",
    account_key=blob_service.credential.account_key,
    permission=BlobSasPermissions(read=True),
    expiry=datetime.utcnow() + timedelta(hours=24),
)
signed_url = f\"{blob_url}?{sas}\"
```
- **SDKs**: `azure-storage-blob>=12`; retry policy enabled; multipart upload for >256MB.
- **Security**: Private containers, IP allowlist to app/CI, encryption-at-rest on, require HTTPS, rotate keys quarterly if using connection strings.

## 6. Migration Plan (Phased)

**Phase 0 – Preparation (1–2 days)**
- Measure Docker footprint (`sudo docker system df --verbose`) and set target free space (>50%).
- Enable/verify log rotation (`journalctl --vacuum-time=30d`, app logrotate).
- Create inventory of file refs: export list of EML/JSON files and counts per client.

**Phase 1 – Blob Setup (0.5 day)**
- Provision storage account + containers above; enable lifecycle rules (Hot→Cool 45d, delete logs after 180d).
- Add secrets/managed identity bindings; add config entries in `secrets.local.json` and `.env`.

**Phase 2 – Code Updates (1–2 days)**
- Add `backend/services/blob_storage.py` helper (upload/download, signed URLs, content-type mapping).
- Update email ingestion to write EML/JSON to Blob and persist blob URLs in `messages` table (new columns).
- Update recording/transcript writers to prefer Blob; expose signed URLs via API.
- Extend tests for blob URL presence and fallback handling.

**Phase 3 – Database & Backfill (1–2 days)**
- Schema migrations: add `json_url`, `eml_url` to `messages`; `file_url`, `audio_url` to `transcripts`; enforce `azure_blob` in `recordings`.
- Backfill: stream EML/JSON files to Blob, update DB rows; verify hashes/sizes.
- Rebuild `email_index.sqlite` to reference blob URLs (keep local paths temporarily for rollback).

**Phase 4 – Cleanup & Observability (0.5–1 day)**
- Delete/move local EML/JSON after checksum verification and backup snapshot.
- Prune Docker images/volumes; vacuum Git repo (`git gc`).
- Trim journals (`journalctl --vacuum-time=30d`); set logrotate for app logs.
- Add monitoring: alert on disk >80%, blob failures, upload latency.

**Phase 5 – Rollout & Policy**
- Document operator runbook for blob issues/rotations.
- Schedule weekly cron to vacuum logs and monthly Docker prune.
- Optional: blob inventory reports and cost alerts at $10/month threshold.

## 7. Cost Analysis (rough, Azure East US)

| Item | Current (VM disk) | Proposed (Blob Hot+Cool) | Notes |
| --- | --- | --- | --- |
| VM managed disk (128GB) | ~$25–40/mo | Could downsize after cleanup | Based on standard SSD pricing |
| Blob storage 5GB (initial email move) | $0 | ~$0.09/mo (Hot) | $0.018/GB-month |
| Blob storage 50GB (emails+media) | $0 | ~$0.92/mo (Hot) | Cool tier: ~$0.51/mo after 45d |
| Egress (internal use) | $0 | ~$0 (same region) | |
| Transactions | $0 | <$0.50/mo | Assuming light access patterns |
| **Estimated net** | ~$25–40/mo | ~$12–20/mo after disk downsize | Save ~$13–20/mo; + durability |

Assumptions: 50GB total movable data (emails + future media); Cool after 45d for 80% of objects; same-region access; no CDN.

## 8. Risks & Mitigations
- **Data loss during migration** → Mitigate with checksums (MD5) before delete, keep 30-day local backup, run in batches with retry logging.
- **URL breakage** → Dual-write period (path + blob URL) with feature flag; backfill updates DB before cleanup.
- **Access/latency issues** → Use managed identity and retry policies; cache signed URLs; consider CDN if public sharing grows.
- **Docker/log bloat persists** → Add scheduled `docker system prune --volumes` (with allowlist) and journal vacuum cron; monitor disk.
- **Compliance/privacy** → Private containers, time-bound SAS, lifecycle deletion for sensitive content; audit logging of downloads.

## 9. Recommendations & Next Steps
- Approve Blob storage account + containers; decide lifecycle (30 vs 60 days to Cool).
- Implement Phase 0–2 immediately; prioritize email ingestion dual-write and schema additions.
- Schedule backfill of existing EML/JSON within a maintenance window; take backup of `data/` and `clients/email_index.sqlite` before move.
- After cleanup, reassess disk; consider shrinking root disk or moving to stateless container + mounted data disk/Blobfuse2 for email cache if needed.
