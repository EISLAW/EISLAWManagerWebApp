# Task Management — Figma IDs, Actions, and Payloads

Purpose: provide stable identifiers and action semantics for every button in the Task Modal (Hebrew/RTL). Use this for Dev Mode annotations, Make exports, UI wiring, tests, and automation.

Conventions
- data-testid: tm.<section>.<control>[.<variant>] — stable selector for UI/tests.
- data-action: <domain>.<verb>[.<variant>] — intent used by the app.
- data-field: domain field affected by the action (e.g., priority, assignee, dueDate, tags, assetType).
- Dynamic ids: data-task-id, data-subtask-id, data-asset-id, data-comment-id, data-reply-id (set at runtime, placeholder in Figma).
- Hebrew labels: do not derive logic from label text; rely on data-* attributes.

Sections
- modal: top-level modal controls
- task: task-level controls (root and subtask share patterns)
- assets: asset add/delete controls
- details: due date, calendar sync, owner, tags
- comment/reply: discussion actions

Label Notes (Hebrew)
- “+ הוסף נתונים”
- “לינק” (not “קישור”)
- Change “היררכית משימות” → “משימות”

ID / Action Mapping

A) Modal (TaskModal frame)
1) Close (X)
   - data-testid: tm.modal.close
   - data-action: modal.close

2) Add root task (“הוסף משימה +”)
   - data-testid: tm.task.add_root
   - data-action: task.add_root

3) Add subtask (Plus icon in expanded task)
   - data-testid: tm.subtask.add
   - data-action: subtask.add
   - data-task-id: {taskId}

B) Task/Subtask row (SubtaskItem)
4) Expand/Collapse (Chevron)
   - data-testid: tm.task.toggle_expand
   - data-action: task.toggle_expand
   - data-task-id: {taskId}

5) Complete (Checkbox)
   - data-testid: tm.task.complete
   - data-action: task.complete
   - data-task-id: {taskId}
   - data-field: status

6) Delete (Trash)
   - data-testid: tm.task.delete
   - data-action: task.delete
   - data-task-id: {taskId}

7) Priority — open menu (“הגדר חשיבות”)
   - data-testid: tm.task.priority.open
   - data-action: priority.open
   - data-task-id: {taskId}

7a) Priority High
   - data-testid: tm.task.priority.set.high
   - data-action: priority.set
   - data-task-id: {taskId}
   - data-field: priority
   - data-value: high

7b) Priority Medium
   - data-testid: tm.task.priority.set.medium
   - data-action: priority.set
   - data-task-id: {taskId}
   - data-field: priority
   - data-value: medium

7c) Priority Low
   - data-testid: tm.task.priority.set.low
   - data-action: priority.set
   - data-task-id: {taskId}
   - data-field: priority
   - data-value: low

7d) Add custom tag (as priority label)
   - data-testid: tm.task.priority.custom.add
   - data-action: priority.custom.add
   - data-task-id: {taskId}
   - data-field: priorityTag

8) Assignee — open menu (“הוסף אחראי”)
   - data-testid: tm.task.assignee.open
   - data-action: assignee.open
   - data-task-id: {taskId}

8a–8e) Assignee set (choose person)
   - data-testid: tm.task.assignee.set
   - data-action: assignee.set
   - data-task-id: {taskId}
   - data-field: assigneeId
   - data-value: {userId}   // e.g., user.sara.m, user.yohanan.d (final IDs from directory)

9) Set date (Date Picker) — open
   - data-testid: tm.task.due.open
   - data-action: due.open
   - data-task-id: {taskId}

9b) Set date — confirm
   - data-testid: tm.task.due.set
   - data-action: due.set
   - data-task-id: {taskId}
   - data-field: dueDate
   - data-value: {ISO8601}

C) Assets section (Assets)
10) “+ הוסף נתונים” — open asset menu
   - data-testid: tm.assets.add.open
   - data-action: assets.add.open
   - data-entity-level: {task|subtask}
   - data-task-id: {taskId}
   - data-subtask-id: {subtaskId?}

10a) Add File (📄)
   - data-testid: tm.assets.add.file
   - data-action: assets.add.file
   - data-field: assetType
   - data-value: file

10b) Add Link (לינק) (🔗)
   - data-testid: tm.assets.add.link
   - data-action: assets.add.link
   - data-field: assetType
   - data-value: link

10c) Add Folder (📁)
   - data-testid: tm.assets.add.folder
   - data-action: assets.add.folder
   - data-field: assetType
   - data-value: folder

10d) Add Email (✉)
   - data-testid: tm.assets.add.email
   - data-action: assets.add.email
   - data-field: assetType
   - data-value: email

11) Delete asset (X in asset item)
   - data-testid: tm.asset.delete
   - data-action: asset.delete
   - data-asset-id: {assetId}

11b) Open Email in Outlook (row action; if present)
   - data-testid: tm.asset.email.open_outlook
   - data-action: email.open_in_outlook
   - data-asset-id: {assetId}

D) Details section (Details)
12) Due date (Calendar icon) — open
   - data-testid: tm.details.due.open
   - data-action: details.due.open

12b) Due date — set
   - data-testid: tm.details.due.set
   - data-action: details.due.set
   - data-field: dueDate
   - data-value: {ISO8601}

13) Sync to calendar (Calendar icon)
   - data-testid: tm.details.calendar.sync
   - data-action: calendar.sync

14) Main owner (User icon) — open
   - data-testid: tm.details.owner.open
   - data-action: owner.open

14b) Main owner — set
   - data-testid: tm.details.owner.set
   - data-action: owner.set
   - data-field: ownerId
   - data-value: {userId}

15) Add tag (Plus in tags row)
   - data-testid: tm.details.tags.add.open
   - data-action: tags.add.open

16) Remove tag (X)
   - data-testid: tm.details.tags.remove
   - data-action: tags.remove
   - data-field: tagId
   - data-value: {tagId}

17) Add tag (confirm in tag menu)
   - data-testid: tm.details.tags.add.confirm
   - data-action: tags.add.confirm
   - data-field: tag
   - data-payload: { name: <string>, color: <hex> }

E) Comments — top level comment item
18) Reply ("תשובה")
   - data-testid: tm.comment.reply
   - data-action: comment.reply
   - data-comment-id: {commentId}

19) Mark as resolved (CheckCircle)
   - data-testid: tm.comment.resolve
   - data-action: comment.resolve
   - data-comment-id: {commentId}

20) Like (ThumbsUp)
   - data-testid: tm.comment.like
   - data-action: comment.like
   - data-comment-id: {commentId}

21) Publish reply
   - data-testid: tm.comment.reply.post
   - data-action: comment.reply.post
   - data-comment-id: {commentId}

22) Cancel reply
   - data-testid: tm.comment.reply.cancel
   - data-action: comment.reply.cancel
   - data-comment-id: {commentId}

F) Reply — level 1
23) Reply
   - data-testid: tm.reply.reply
   - data-action: reply.reply
   - data-reply-id: {replyId}

24) Resolve
   - data-testid: tm.reply.resolve
   - data-action: reply.resolve
   - data-reply-id: {replyId}

25) Like
   - data-testid: tm.reply.like
   - data-action: reply.like
   - data-reply-id: {replyId}

26) Publish reply
   - data-testid: tm.reply.post
   - data-action: reply.post
   - data-reply-id: {replyId}

27) Cancel
   - data-testid: tm.reply.cancel
   - data-action: reply.cancel
   - data-reply-id: {replyId}

G) Nested reply — level 2
28) Resolve
   - data-testid: tm.nreply.resolve
   - data-action: nreply.resolve
   - data-reply-id: {replyId}

29) Like
   - data-testid: tm.nreply.like
   - data-action: nreply.like
   - data-reply-id: {replyId}

H) New comment composer
30) Publish new comment ("פרסם תגובה")
   - data-testid: tm.comment.create
   - data-action: comment.create

Disabled/State Expectations
- All actions support disabled state when preconditions fail (e.g., empty link URL, invalid date).
- Tooltips in Hebrew where helpful: e.g., "פתח באאוטלוק", "מחק משימה", "סמן כהושלם".
- Email rows show “פתח באאוטלוק” when we have Graph webLink.

Expected Event Payloads (examples)
```json
// Set task priority
{
  "action": "priority.set",
  "taskId": "t_123",
  "field": "priority",
  "value": "high"
}

// Add asset: link
{
  "action": "assets.add.link",
  "taskId": "t_123",
  "asset": {
    "type": "link",
    "title": "Google",
    "url": "https://www.google.com/"
  }
}

// Open email in Outlook
{
  "action": "email.open_in_outlook",
  "assetId": "a_789"
}

// Set due date
{
  "action": "due.set",
  "taskId": "t_123",
  "field": "dueDate",
  "value": "2025-11-15T00:00:00+02:00"
}
```

Designer Handoff — How to annotate in Figma (Dev Mode)
1) For each button, set the component name to include data-testid (e.g., "Button / Primary / tm.assets.add.file").
2) Add a pinned note with the exact data-action and any data-field/value per this spec.
3) If Make export is used, include a frame-level JSON node named "TaskModal.actions.json" with all entries; use the template below.
4) Ensure Hebrew labels match UI (e.g., “+ הוסף נתונים”, “לינק”).

Make/JSON Export Template (frame-level attachment)
```json
{
  "frame": "TaskModal",
  "controls": [
    { "testid": "tm.modal.close", "action": "modal.close" },
    { "testid": "tm.task.add_root", "action": "task.add_root" },
    { "testid": "tm.subtask.add", "action": "subtask.add", "params": ["taskId"] },
    { "testid": "tm.task.priority.set.high", "action": "priority.set", "field": "priority", "value": "high" },
    { "testid": "tm.assets.add.link", "action": "assets.add.link", "field": "assetType", "value": "link" },
    { "testid": "tm.asset.email.open_outlook", "action": "email.open_in_outlook", "params": ["assetId"] }
    // ...continue for all controls listed above
  ]
}
```

Open Questions for Product
- Directory of users (IDs) for assignee/owner: should we use Azure AD objectIds or internal user IDs?
- Calendar sync target: default Outlook mailbox vs. per-user calendars?
- Subtask asset scoping: store under subtask folder or inherit task folder with subtask prefix?

Notes
- For automated tests, we’ll target data-testid. For runtime, data-action routes to UI handlers.
- Where a control operates on both task and subtask, include data-entity-level and the relevant id.

2025-11-08 Figma Build — Observed testids (from provided React handoff)
- File: EISLAW System/docs/TaskManagement/figma_new/2025-11-08/src/components/TaskModal.tsx
- Existing data-testid values used in the new files:
  - task modal/frame: task-modal
  - close: close-modal
  - title input: task-title
  - progress bar container: progress
  - add root task: add-task-btn
  - task list container: task-list
  - add child to task: add-child-${taskId}
  - inline input for new child: subtask-input-${taskId}
  - assets menu open: add-data-btn
  - assets menu group: asset-actions
  - assets: add-file | add-link | add-folder | add-email
  - details: due-date | sync-calendar | owner | assignee | tags
  - comments container: comments
  - comment item: comment-item; reply item: reply-item; nested reply: nested-reply-item
  - comment actions (templated): reply-comment-${commentId} | resolve-comment-${commentId} | like-comment-${commentId} | post-reply-${commentId}
  - reply actions (templated): reply-to-reply-${replyId} | resolve-reply-${replyId} | like-reply-${replyId} | post-nested-reply-${replyId}
  - composer: comment-input | post-comment-btn
- Subtask row component (SubtaskItem.tsx):
  - row: task-item
  - per-row menus: set-priority-${taskId} | set-assignee-${taskId} | set-due-date-${taskId}
- Asset row (AssetItem.tsx):
  - row: asset-row
  - email action: open-in-outlook
- Attach email modal (AttachEmailModal.tsx):
  - modal root: attach-email
  - options: attach-email-save-pdf | attach-email-save-attachments

Recommended data-action mapping for existing testids
- close-modal → modal.close
- add-task-btn → task.add_root
- add-child-${taskId} → subtask.add (params: parentId)
- set-priority-${taskId} → priority.open (params: taskId)
  - Add menu items with data-action priority.set and data-value high|medium|low
- set-assignee-${taskId} → assignee.open (params: taskId)
  - Add menu items with data-action assignee.set and data-value {userId}
- set-due-date-${taskId} → due.open (params: taskId)
  - Confirm in picker: due.set (field: dueDate, value: ISO8601)
- add-data-btn → assets.add.open
- add-file|add-link|add-folder|add-email → assets.add.<type> (field: assetType, value: file|link|folder|email)
- asset-row delete (Trash button) → asset.delete (param: assetId)
- open-in-outlook (email rows) → email.open_in_outlook (param: assetId)
- due-date (details) → details.due.open; final set: details.due.set (field: dueDate)
- sync-calendar → calendar.sync
- owner → owner.open; owner.set on selection (field: ownerId)
- assignee (details) → assignee.open; assignee.set on selection (field: assigneeId)
- tags → tags.add.open | tags.add.confirm (payload: { name, color }) | tags.remove (value: tagId)
- post-comment-btn → comment.create; comment-input holds text
- reply/resolve/like/post-* templated ids → comment.reply | comment.resolve | comment.like | comment.reply.post and similarly for reply.* and nreply.*

Gaps to annotate in the new build
- Priority and assignee menus: add testids for menu options and data-action with concrete values.
- Due date pickers (task and subtask): add testid for confirm and data-action due.set with ISO8601 value.
- Owner selection: add testids for list items and owner.set with {userId} values.
- Tags: add testids for add.confirm (name/color) and tags.remove per tag item.
- Assets: ensure delete buttons carry data-action asset.delete and data-asset-id.

Hebrew Labels (verify in the new build)
- “+ הוסף נתונים” for the add assets button.
- “לינק” for link items and menu.
- “משימות” in headers where relevant.

Decisions (from 2025‑11‑08)
- Assignee/Owner IDs: use internal stable keys `user.<kebab-slug>` (map to Azure AD objectIds at runtime). Examples: user.sara-m, user.yohanan-d, user.michael-r, user.emma-l.
- Calendar sync: enabled; default to the signed‑in user’s Outlook calendar.
- Subtasks: do not create separate subfolders; keep all assets under the task’s canonical folder; prefix subtask assets as needed.

See also
- Design tokens: EISLAW System/docs/DesignSystem/DESIGN_TOKENS.md:1
- Component library: EISLAW System/docs/DesignSystem/COMPONENT_LIBRARY.md:1
- Tasks template: EISLAW System/docs/DesignSystem/TASKS_TEMPLATE.md:1
