<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# Result Texts (Templates)

Purpose: author the text for each scoring result in separate, focused files. The composer/Word flow can stitch these together based on the computed results.

Placeholders (use double curly braces):
- {{business_name}}, {{contact_name}}, {{contact_email}}, {{contact_phone}}
- {{score.level}}, {{score.dpo}}, {{score.reg}}, {{score.report}}
- You can reference inputs as {{answers.owners}}, {{answers.ppl}}, etc.

Files in this folder:
- Levels: `level_lone.md`, `level_basic.md`, `level_mid.md`, `level_high.md`
- Obligations: `dpo.md`, `reg.md`, `report.md`
- Requirements: `worker_security_agreement.md`, `cameras_policy.md`, `consultation_call.md`, `outsourcing_text.md`, `direct_marketing_rules.md`
- Email: `email_to_client.md` (subject + body template)

Authoring guidelines:
- Keep each file self-contained; the composer will include files conditionally.
- Write in the target language (Hebrew), and avoid PII beyond placeholders.
- Use short headings and bullet points where helpful.
 - For email, the first line defines the subject using the marker `[EMAIL_SUBJECT]: <text>`; the rest is the body.

Link back:
- System Index: docs/INDEX.md
- Module README: docs/PrivacyExpress/README.md
