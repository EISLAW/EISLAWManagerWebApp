# Figma → App Handoff Protocol (Preview Bundle)

Purpose
- Eliminate visual drift and speed up integration by delivering a small, runnable React bundle that renders inside our app with no changes. Dev then swaps this component into the live screen and wires actions to APIs.

Scope
- Applies to every new or redesigned screen, starting with the Task Modal (case study).

Deliverable: Preview Bundle
- Location (repo): `frontend/src/design/<screen>/`
- Entrypoint component: `<ScreenName>Preview.jsx` (export default React component)
- No network calls; use mocked data in the component
- RTL: wrap root with `dir="rtl"`

Allowed stack
- React (function components + hooks)
- Tailwind utility classes (no external CSS)
- Icons: `lucide-react`
- Fonts: Noto Sans Hebrew (already loaded by the app)

Must use tokens (no raw hex)
- Colors: `petrol`, `copper`, `offblack`, `cardGrey`, `bg`, `line`
- Primitives: `rounded-2xl`, `shadow-md`, spacing via Tailwind
- Helpers: `.heading`, `.subheading`, `.card` (see DESIGN_TOKENS.md)

Identifiers (required on every interactive control)
- `data-testid`: `tm.<section>.<control>[.<variant>]` (stable selectors)
- `data-action`: `<domain>.<verb>[.<variant>]` (intent, used by app)
- Dynamic ids as attributes if applicable: `data-task-id`, `data-subtask-id`, `data-asset-id`, `data-comment-id`, `data-reply-id`

Action manifest (attach JSON file)
- File: `<ScreenName>.actions.json` next to the preview component
- Contents: array of `{ testid, action, field?, value?, params? }`
- Mirrors the IDs used in the JSX; used for wiring and tests

Task Modal — minimum controls
- Modal: `tm.modal.close` → `modal.close`
- Tasks:
  - `tm.task.list` (container)
  - `tm.subtask.add` (button), `tm.task.item` (rows)
  - `tm.task.complete` → `task.complete`
  - `tm.task.priority.open` + `priority.set` values `high|medium|low`
  - `tm.task.assignee.open` + `assignee.set` with `user.*` ids
  - `tm.task.due.open` + `due.set` with ISO date
- Assets:
  - Toolbar: `tm.assets.add.file|link|folder|email` → `assets.add.<type>`
  - Rows: `tm.asset.row`; email row: `tm.asset.email.open_outlook` → `email.open_in_outlook`
- Details:
  - `tm.details.due.open` + `details.due.set`
  - `tm.details.calendar.sync` → `calendar.sync`
  - `tm.details.owner.open|set` → `owner.open|owner.set`
  - `tm.details.tags.add.open|confirm`, `tm.details.tags.remove`
- Comments (optional pass-1):
  - `tm.comment.create`, `tm.comment.reply`, `tm.comment.resolve`, `tm.comment.like`

Layout & typography
- Header bar: petrol background, white text
- Progress bar: copper on `line` background
- Two columns: Tasks (right), Assets + Details (left)
- Cards use `.card`; headers use `.heading`/`.subheading`

Non-goals (Preview Bundle)
- No backend wiring; all actions are placeholders emitting `data-action`
- No external packages or CSS frameworks beyond Tailwind and lucide-react

QA checklist for designers
- [ ] Renders under `/design/<screen>` in the app without edits
- [ ] All clickable elements have `data-testid` + `data-action`
- [ ] Uses tokens (search for `#` — should be zero)
- [ ] RTL correct; Hebrew labels sized like the mock; icons aligned
- [ ] Action manifest present and matches the JSX

Integration (dev)
- Swap live screen with the Preview component
- Map each `data-action` to existing endpoints; leave placeholders documented in Testing_Episodic_Log
- Add a Playwright smoke that loads the screen and captures a screenshot

Versioning
- When Figma changes layout/IDs: bump a `version` field inside the JSON manifest and the component file comment.

See also
- Tokens: `docs/DesignSystem/DESIGN_TOKENS.md`
- Components: `docs/DesignSystem/COMPONENT_LIBRARY.md`
- IDs/actions spec: `docs/TaskManagement/FIGMA_TASK_MODAL_IDS.md`
