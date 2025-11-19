# Final Development Prompt for AI Programmer — Responsive Web App (EISLAW)

Project Goal: Develop a Responsive Web Application from an Existing Desktop System

Objective:
Develop a responsive, RTL-first web application to serve as the new primary interface for an existing system. The application will replace a desktop-centric workflow, centralizing client management, task tracking, and content generation. It must be built upon the existing infrastructure, services, and data sources (Microsoft 365/SharePoint, Airtable, and local file system access via a bridge).

## 1. Guiding Principles & Documentation

- Adherence to Existing Standards: The new web application must be developed in accordance with the architectural patterns, development principles (SOLID), and coding standards already established in the project. Refer to `docs/PROJECTS_COMPENDIUM.md` and linked documents like `..\AudoProcessor Iterations\docs\ARCHITECTURE.md` and `..\AudoProcessor Iterations\docs\DEVELOPMENT.md` as the single source of truth for these standards.
- Extend, Do Not Reinvent: The primary goal is to build a new interface on top of the existing backend and services. Reuse all relevant logic from modules like `scoring_service/main.py`, the RAG_Pilot scripts, and the MarketingAgent tools. Do not create new logic that contradicts or duplicates existing, functional components.
- Documentation is Critical: All new components (React components, FastAPI endpoints, utility functions) must be documented with the same level of detail and style as the existing project. Update `docs/PROJECTS_COMPENDIUM.md` to include paths to any new modules or key documents created.

## 2. System Architecture Overview

- Frontend: A modern, responsive web application (React is preferred).
- Backend: The existing FastAPI application will be extended with new endpoints to serve the frontend.
- Data Sources:
  - Clients: Airtable (via API).
  - Tasks: A new SharePoint List.
  - Files & Documents: User's SharePoint/OneDrive, with access to local desktop folders.
  - Desktop Interaction: A pre-existing desktop agent (MCP Bridge) will handle requests from the backend to perform local actions (e.g., opening a folder).

## 3. MVP Scope

This initial build is an MVP for a single, trusted user. As such, user authentication and multi-user features are out of scope for this phase and will be implemented later. The application should be immediately usable without a login screen.

## 4. Detailed Feature Specification

Main Navigation: The main interface will have the following tabs: Dashboard | Clients | Marketing | Prompts | Settings.

### A. Dashboard

- Displays a consolidated list of all tasks from a central SharePoint List named "Tasks".
- The view should only show tasks where the Status column is not "Done".
- Each task item must display its title, associated client (if any), and due date.
- Users must be able to mark a task as "Done" directly from the dashboard using a checkbox.
- Include a button to "Add New Task". This will open a form to create a new item in the SharePoint "Tasks" list, with an optional field to associate it with a client.

### B. Clients Module

Clients List View:
- Fetch and display a searchable list of all clients from the designated Airtable base.
- Columns: Name, Email, Phone, a clickable link to their SharePoint folder, and a live count of open tasks.

Client Card View (per client):
- Overview Tab: Displays key client info from Airtable, a feed of recent activity, and quick action buttons: "Open SharePoint Folder", "Open Local Folder" (via the desktop agent), and "Compose Email".
- Tasks Tab: A filtered view of the "Tasks" SharePoint List, showing only tasks associated with the selected client.
- Workspace Tab: A combined feed of files and transcripts from the client's folder. For transcript files (.txt), include an "Analyze" button.

### C. Marketing Module

- A dedicated workspace for generating marketing content.
- Users can select a transcript or note from any client folder to use as input for an existing backend service (MarketingAgent).
- The generated content must be saved as a new document in a central SharePoint document library named "Marketing Content".
- The system must allow users to add custom tags (e.g., "Newsletter", "Social Media") to the generated content, which will be saved as SharePoint metadata columns.

### D. Prompts Module (NEW)

- A prompt library/management interface.
- Users can create, edit, save, and delete text-based prompts for various AI tasks (e.g., 'Summarize Transcript', 'Draft Viral Email').
- When a user clicks the "Analyze" button on a transcript (in the Client Workspace), they will be presented with a choice: select a saved prompt from this library or enter a custom, one-time prompt.
- The AI's generated output will be displayed in a modal window with a "Copy Text" button for this MVP.

### E. Settings Module

- A panel to configure application paths (URLs to key SharePoint locations like the Templates folder and Marketing library) and manage API connection settings for Airtable and Microsoft Graph.

## 5. Core Functionalities & UX Patterns

Email Composition & Templates:
- All "Compose Email" actions will trigger email sending via the Microsoft Graph API.
- The system will provide an option to load content from a template. Templates are stored as .html files in a designated SharePoint folder ("Email Templates"). This ensures rich text formatting is preserved.
- Users can save the text of any email they are composing as a new .html template in that same folder.

Floating Action Button ("+"):
- A global floating "+" button should be present on most screens.
- It will provide shortcuts for the most common actions: New Task, New Email, and Generate Marketing Content. The "Upload File" option is not needed.

Asynchronous Operations:
- All long-running operations (e.g., AI analysis, fetching large lists of files) must display a clear, non-blocking progress indicator. Use toast notifications for success/error messages.

## 6. UX & Development Best Practices

Comprehensive State Management:
- Loading States: clear indicators (spinners/skeletons).
- Empty States: helpful messages with clear CTA.
- Optimistic UI Updates: immediate UI response on expected actions (e.g., marking task done), reconcile in background.

Configuration Management:
- No secrets/keys/URLs hardcoded. Use environment config (.env) and existing secrets handling.

Actionable Error Handling:
- Provide user-facing, actionable messages (e.g., Airtable key invalid, MCP not running, Graph consent required).

First-Run Setup:
- If critical settings are missing, direct user to Settings with clear guidance.

