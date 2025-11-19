# Airtable Schema (Clients, Contacts, Privacy Reviews)

> Source tables live in base `appv3nlRQTtsk97Y5`. Keep this doc updated whenever Airtable structure changes so both the Desktop and Web apps stay in sync.

## Views

| Purpose | Table ID | Table Name | View ID | Friendly View |
| --- | --- | --- | --- | --- |
| Clients (registry) | `tbloKUYGtEEdM76Nm` | `לקוחות` | `viw34b0ytkGoQd1n3` | `Clients – Default` |
| Contacts (linked to clients) | `tblWVZn9VjoGjdWrX` | `אנשי קשר` | `viwDZcPYwOkY2bm1g` | `Contacts – Default` |
| Privacy Reviews | `tblEKRjM7Z9zRRf6a` | `Privacy Reviews` | `viwFafyTTI4HC7Yc5` | `Privacy – Intake/Review` |

Configure these IDs in `secrets.local.json` under:

```json
"airtable": {
  "token": "...",
  "base_id": "appv3nlRQTtsk97Y5",
  "table_id": "tblEKRjM7Z9zRRf6a",          // legacy privacy view (kept for backwards compatibility)
  "view": "viwFafyTTI4HC7Yc5",
  "clients_table": "לקוחות",
  "contacts_table": "אנשי קשר",
  "view_clients": "viw34b0ytkGoQd1n3",
  "view_contacts": "viwDZcPYwOkY2bm1g",
  "view_privacy": "viwFafyTTI4HC7Yc5"
}
```

## Clients Table (`tbloKUYGtEEdM76Nm`)

| Field Name | ID | Type | Description / Usage |
| --- | --- | --- | --- |
| `לקוחות` | `fldA0Y2J3RDVj7tXK` | singleLineText | Primary display name (used as `display_name`) |
| `מספר טלפון` | `fldMIJHcN2l5ejhR7` | phoneNumber | Primary phone number |
| `אימייל` | `fldP7dNeIQjMPuAHc` | email | Primary email (array in Airtable API) |
| `סוג לקוח` | `fldFJ6OyN2iAJmORr` | multipleSelects | Client stage / type chips (e.g., “טיפול הושלם”) |
| `בטיפול` | `fldEKRIZpCerjVGn0` | singleSelect | Current status |
| `הערות` | `fldTylMnpZOJWALOA` | multilineText | Internal notes |
| `ווצאפ` | `fldtjYZSWJhPIRlio` | button | WhatsApp deep link (object `{label,url}`) |
| `מייל תיאום פגישה` | `fld96QoxyYGzIwZQJ` | button | “Schedule meeting” mailto |
| `Calculation` | `fldUnoPV82lWZkAX2` | formula | Fillout deep link for intake |
| `תיקים ופרוייקטים 2` | `fldzoqZgLzznBMeKd` | multipleRecordLinks | Links to project table (optional) |
| `אנשי קשר נוספים` / `אנשי קשר נוספים 2` | `fldk5RInnAcMQhZYi` / `fldVGJIrjpnnxsGNM` | multipleRecordLinks | Links to contact records (table `tblWVZn9VjoGjdWrX`) |
| `כספים` | `fldZDaB3ZrCj5uWIJ` | multipleRecordLinks | Finance references |
| `תשלומים` | `fldgiKG8RppPZZCHJ` | singleLineText | Payment notes |
| `fillout formula` | `fldgfiFtvXqEptjp0` | formula | Prefilled Fillout URL |
| `Created` / `Last Modified` | `fldBBrJ4mIDyf3xCZ` / `fldbZVWx5QOm4Rtej` | timestamps | System metadata |

### Normalized fields used in code

| Normalized Key | Airtable Field(s) |
| --- | --- |
| `name` | `לקוחות`, `Name`, `Client` |
| `emails` | `אימייל` (array) |
| `phone` | `מספר טלפון` |
| `client_type` | `סוג לקוח` |
| `status` | `בטיפול` |
| `notes` | `הערות`, `נתונים משפטי` |
| `whatsapp_url` | `ווצאפ.url` |
| `meeting_email_url` | `מייל תיאום פגישה.url` |
| `projects` | `תיקים ופרוייקטים 2`, `Table 6` |
| `contacts_link_ids` | `אנשי קשר נוספים`, `אנשי קשר נוספים 2` |

## Contacts Table (`tblWVZn9VjoGjdWrX`)

| Field Name | ID | Type | Description |
| --- | --- | --- | --- |
| `שם איש קשר` | `fldZu8x9X6LRcsw2y` | singleLineText | Contact name |
| `מייל` | `fldp7jqCjLtgxzehD` | email | Contact email |
| `טלפון` | `fldl7uEqAbz36c3FL` | phoneNumber | Contact phone |
| `לקוח` | `fldqjVZWpQjavy0Lm` | multipleRecordLinks | Linked client record |
| `מספר זיהוי` | `fld0kF1wQ9tn2RnOq` | singleLineText | ID number (optional) |
| `כתובת` | `fld0Gf8H8qT0xmwzN` | multilineText | Address |

## Privacy Reviews Table (`tblEKRjM7Z9zRRf6a`)

Used by the PrivacyExpress workflow (Fillout intake → scoring → review). Key fields:

| Field Name | Type | Notes |
| --- | --- | --- |
| `contact_name`, `business_name`, `email`, `contact_phone` | strings | Intake info |
| `selected_level`, `selected_modules`, `auto_level`, `auto_selected_modules` | selects | Scoring output |
| `report_*` (`report_url`, `report_token_hash`, `report_expires_at`) | singleLineText | Automailer/RAG references |
| `status` | singleSelect | Review state |
| Override / score flags (`overrides_*`, `score_*`, `is_correct_*`) | checkboxes/selects | Review adjustments |

This table stays separate from the Clients registry; only the web Privacy tab should access it.

## Usage Notes

1. **Never mix views** – the Clients search and registry mirror use `view_clients`, while Privacy flows continue using `view_privacy`.
2. **Desktop parity** – the Windows app caches Airtable via `airtable_sync.py` (same base & views). Any schema change must be reflected both here and in `AudoProcessor Iterations/docs/HANDBOOK.md`.
3. **Secrets** – keep tokens/IDs in `secrets.local.json`; never hard-code them in code or docs.
4. **Linked Contacts** – `אנשי קשר נוספים 2` and `אנשי קשר נוספים` return record IDs. The backend fetches those IDs from the Contacts view to show full name/email/phone in the UI.
5. **Do not use the Privacy Reviews view for client registry features** – it shares the same base but is reserved exclusively for the Privacy scoring workflow. All client sync, search, and UI telemetry must go through `tbloKUYGtEEdM76Nm / viw34b0ytkGoQd1n3`.
