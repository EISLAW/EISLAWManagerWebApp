<!-- Project: SystemCore | Full Context: docs/System_Definition.md -->
# Versioning & Environment Display

Purpose
- Provide a single source of truth for how versions are defined, bumped, surfaced in the UI, and verified.
- Ensure every teammate (and AI agents) can unambiguously identify the exact build in use.

Single Source Of Truth (SSOT)
- This file (docs/VERSION.md) is the canonical versioning policy reference.
- The global index (docs/INDEX.md) links here. Other docs may reference but must not redefine policy.

What the UI Shows
- Header badge: `<ENV> • FE v<feVersion> (<feCommit>) • BE <beVersion> (<beCommit>)`.
  - ENV is one of: LOCAL, STAGING, PROD.
  - Example: `LOCAL • FE v1.8.0 (a1b2c3d) • BE 0.4.2 (9f8e7d)`.

Where Versions Come From
- Frontend (FE)
  - Semantic version: `frontend/package.json` → `version`.
  - Commit SHA: injected at build time by CI (e.g., `VITE_COMMIT_SHA`).
  - Build time (optional): injected by CI (e.g., `VITE_BUILD_TIME`).
- Backend (BE)
  - Semantic version: constant (e.g., `__version__`) or env var in the service.
  - `/health` endpoint returns `{ version, commit, buildTime }`.
  - Commit SHA and build time injected by CI.

Ownership & Update Process
- Human-chosen semantic versions with release notes; CI supplies SHA/time.
- FE bump
  1) Update `frontend/package.json` `version`.
  2) Commit with message `chore(release): FE vX.Y.Z`.
  3) CI builds with `VITE_COMMIT_SHA` and (optionally) `VITE_BUILD_TIME`.
- BE bump
  1) Update backend semantic version (e.g., constant in service) and ensure `/health` returns it.
  2) Commit with message `chore(release): BE vA.B.C`.
  3) CI builds, injects `commit` and `buildTime`, and verifies `/health` payload.
- Release notes (optional but recommended): `docs/RELEASE_NOTES.md` append per release.

UI Integration (Implementation Notes)
- Frontend reads:
  - FE version from `import.meta.env.VITE_APP_VERSION` (CI-stamped) or falls back to `package.json` at dev time.
  - FE commit from `import.meta.env.VITE_COMMIT_SHA` (short 7 chars for display).
  - BE version/commit via `GET <API>/health`.
- Display both versions in the app header next to the environment badge (see `frontend/src/App.jsx`).

Verification Checklist
- App header shows both FE and BE versions and commits for LOCAL and cloud deployments.
- `/health` returns version metadata and is linked from the Admin page.
- `docs/RELEASE_NOTES.md` (if used) matches FE/BE version bumps.

Change Management
- Any change to this policy must be made here and linked from `docs/INDEX.md`.

