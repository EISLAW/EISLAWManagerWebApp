# EISLAW UI — Tasks Template (Universal)

Use this template to implement any task surface (Dashboard cards, Task Modal, Project views) with one visual language and identical semantics.

1) Layout
- Single column on small screens; two columns on large screens (Tasks | Assets/Details)
- Spacing: section gap = var(--space-6)
- Background: #fff; panels use var(--card), border var(--line), radius var(--radius-md)

2) Typography
- Font: var(--font-hebrew)
- Headings: color var(--petrol); body: var(--text)
- Use dir="rtl" for containers; dir="auto" within mixed text

3) Components (wire to COMPONENT_LIBRARY)
- Modal header, Task list, Assets, Details, Comments
- Use data-testid and data-action exactly as specified for automation

4) Assets Rules
- Types: file | link | folder | email
- Email row includes “פתח באאוטלוק” when Graph webLink is present
- Delete shows confirmation if the item is in use by a current deliverable

5) Details Rules
- Due date: ISO 8601; show locale date in UI (he-IL)
- Calendar sync: default to signed-in user’s Outlook calendar
- Owner/Assignee: show avatar circle with initials; store internal user.* keys
- Tags: enforce max visible tags (e.g., 6); overflow → ‘+N’ with tooltip

6) Priority Rules
- high|medium|low; color via tokens (priority-high|medium|low)
- Show badge only when set; menu defaults to current value

7) Accessibility
- All click targets ≥ 44px; keyboard focus ring; aria-labels in Hebrew
- Mixed LTR elements (emails/URLs) wrapped with dir="ltr"

8) Testability
- Each interactive element has data-testid and, when meaningful, a data-action
- Dynamic items carry ids via data-task-id, data-subtask-id, data-asset-id, data-comment-id, data-reply-id

9) File/Folder Naming
- Canonical folder per task; no subtask folders
- Subtask asset filenames use prefix: `<subtaskId>__<originalName>` to avoid collisions

