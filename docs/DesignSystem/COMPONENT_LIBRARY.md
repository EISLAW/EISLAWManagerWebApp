# EISLAW UI — Component Library (Tasks/Dashboard)

Purpose: canonical specs for reusable components with data-testid + data-action conventions for automation, tests, and wiring.

Conventions
- data-testid: tm.<section>.<control>[.<variant>] for stable selectors
- data-action: <domain>.<verb>[.<variant>] to encode intent
- Dynamic ids: data-task-id, data-subtask-id, data-asset-id, data-comment-id, data-reply-id

Components

1) Modal Header
- Close button: data-testid=tm.modal.close, data-action=modal.close
- Title input: tm.modal.title, data-action=task.edit_title (field: title)

2) Task List (root + subtasks)
- Container: tm.task.list
- Add root: tm.task.add_root, action=task.add_root
- Add child: tm.subtask.add, action=subtask.add (param: parentId)
- Row: tm.task.item (per subtask)
- Toggle complete: tm.task.complete, action=task.complete (field: status)
- Toggle expand: tm.task.toggle_expand, action=task.toggle_expand
- Delete: tm.task.delete, action=task.delete
- Priority menu open: tm.task.priority.open → menu options action=priority.set (field: priority, value: high|medium|low)
- Assignee menu open: tm.task.assignee.open → menu options action=assignee.set (field: assigneeId, value: user.*)
- Due open: tm.task.due.open → confirm action=due.set (field: dueDate, value: ISO8601)

3) Assets
- Open add menu: tm.assets.add.open, action=assets.add.open
- Add file|link|folder|email: tm.assets.add.<type>, action=assets.add.<type>, field=assetType, value=file|link|folder|email
- Row: tm.asset.row (data-asset-id)
- Delete asset: tm.asset.delete, action=asset.delete (data-asset-id)
- Email → Open in Outlook: tm.asset.email.open_outlook, action=email.open_in_outlook (data-asset-id)

4) Details (Due/Calendar/Owner/Tags)
- Due open/set: tm.details.due.open|set, actions details.due.open|set (field: dueDate)
- Calendar sync: tm.details.calendar.sync, action=calendar.sync
- Owner open/set: tm.details.owner.open|set, action=owner.open|set (field: ownerId)
- Tags open: tm.details.tags.add.open → confirm tm.details.tags.add.confirm (payload { name, color })
- Tag remove: tm.details.tags.remove, action=tags.remove (value: tagId)

5) Comments
- Container: tm.comment.container
- New comment input/post: tm.comment.input, tm.comment.create
- Comment item: tm.comment.item (data-comment-id)
- Actions: comment.reply | comment.resolve | comment.like | comment.reply.post
- Reply item: tm.reply.item (data-reply-id), actions reply.reply|resolve|like|post
- Nested reply: tm.nreply.item, actions nreply.resolve|like

Event Payloads
```json
{ "action": "priority.set", "taskId": "t_1", "field": "priority", "value": "high" }
{ "action": "assets.add.link", "taskId": "t_1", "asset": { "type": "link", "title": "Google", "url": "https://www.google.com" } }
{ "action": "email.open_in_outlook", "assetId": "a_9" }
{ "action": "details.due.set", "taskId": "t_1", "field": "dueDate", "value": "2025-11-15" }
```

Assignee/Owner IDs
- Use internal stable keys: user.<kebab-slug> (e.g., user.sara-m, user.michael-r)
- Map to Azure AD objectIds at runtime when available

Subtasks Asset Scoping
- Store under the task’s canonical folder; prefix filenames with subtask title/id when needed (no separate subfolders)

