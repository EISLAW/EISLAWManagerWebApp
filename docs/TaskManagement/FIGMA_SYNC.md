<!-- Project: PrivacyExpress | Context: docs/System_Definition.md#privacy-deliverable-flow -->
# Figma ↔ GitHub Workflow

This document explains how to keep binary `.fig` exports in the repo so any AI/LLM (or teammate) can reference exactly the same design source that appears in Figma Desktop.

## Folder layout

```
docs/TaskManagement/
 ├─ figma_new/           # Generated code sandbox (already in repo)
 └─ figma_exports/       # Place exported .fig files here
     ├─ README.md        # How to export/import
     └─ <name>.fig       # e.g., task-owner-workflow.fig
```

- `figma_exports` stays under version control so every `.fig` has history.
- Name files descriptively (e.g., `task-owner-workflow_v1.fig`). If multiple frames exist, consider exporting each major flow separately to keep file sizes manageable.

## Exporting from Figma Desktop

1. Open the design file in Figma Desktop.
2. Choose **File → Save local copy…** (or **File → Export → .fig**).
3. Save the `.fig` into `docs/TaskManagement/figma_exports/`.
4. Stage/commit the file in Git so anyone (or any AI agent) can reopen it from the repo.

## Importing into Figma Desktop

You (or the AI) can re-open the `.fig` by:

1. Downloading/cloning the repo.
2. Dragging the `.fig` from `docs/TaskManagement/figma_exports/` into the Figma Desktop home screen, or using **File → Import…**.
3. Figma will recreate the file in Drafts; move it to the relevant project/team as needed.

## Sample AI prompt

```
You are working on the Task owner workflow. Use the attached Figma file
`docs/TaskManagement/figma_exports/task-owner-workflow_v1.fig`.
Open it in Figma Desktop, review the Owner chip/popup components, and iterate
per the requirements below…
```

The AI (or teammate) simply references the path above when asking Figma’s AI to open the asset.
