import re
import sys
from pathlib import Path
from datetime import datetime

DOCS_DIR = Path(__file__).resolve().parents[1] / "docs"

# Project catalog and heuristics
PROJECTS = {
    "PrivacyExpress": {
        "name": "PrivacyExpress",
        "summary": "Privacy questionnaire, scoring, Word review, and delivery.",
        "keywords": ["fillout", "security", "privacy", "Word", "Security_Scoring", "Fillout_"],
        "context_anchor": "#privacy-deliverable-flow",
    },
    "RAGPilot": {
        "name": "RAGPilot",
        "summary": "Retrieval pilot for transcripts and internal knowledge.",
        "keywords": ["rag", "RAG_Pilot", "RAG"],
        "context_anchor": "#rag-pilot",
    },
    "ClientComms": {
        "name": "ClientComms",
        "summary": "Email mirror, catalog, and client thread search.",
        "keywords": ["email_", "email ", "Microsoft 365", "Graph", "Catalog"],
        "context_anchor": "#communications-unification",
    },
    "AutomailerBridge": {
        "name": "AutomailerBridge",
        "summary": "Bridge from system outputs to automated sending.",
        "keywords": ["automailer", "security_email_compose"],
        "context_anchor": "#privacy-deliverable-flow",
    },
    "MarketingOps": {
        "name": "MarketingOps",
        "summary": "Social integrations (Facebook/Instagram) and performance analysis.",
        "keywords": ["Integrations.md", "Instagram", "Facebook", "Marketing"],
        "context_anchor": "#references",
    },
    "SystemCore": {
        "name": "SystemCore",
        "summary": "Core specs, architecture, boot and working memory.",
        "keywords": [
            "System_Definition.md",
            "TECHNICAL_OVERVIEW.md",
            "Integrations.md",
            "AGENT_BOOT.md",
            "WORKING_MEMORY.md",
            "NEXT_ACTIONS.md",
            "Testing_Episodic_Log.md",
            "README.md",
            "Implementation_Roadmap.md",
        ],
        "context_anchor": "",
    },
}


def slugify_project(shortcode: str) -> str:
    return shortcode


def detect_project(file: Path) -> str:
    name = file.name
    text = ""
    try:
        text = file.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        pass
    haystack = (name + "\n" + text)[:4000]
    # Priority: explicit matches by filename first
    for sc, meta in PROJECTS.items():
        for kw in meta["keywords"]:
            if kw.lower() in haystack.lower():
                return sc
    # Fallbacks by directory hints
    if file.parent.name.lower() == "word":
        return "PrivacyExpress"
    return "SystemCore"


def ensure_top_tag(file: Path, project: str):
    try:
        content = file.read_text(encoding="utf-8")
    except Exception:
        return False
    tag = f"<!-- Project: {project} | Full Context: docs/System_Definition.md{PROJECTS[project]['context_anchor']} -->\n"
    if content.startswith("<!-- Project:"):
        # Replace existing tag if project differs
        content = re.sub(r"^<!-- Project: .*?-->\n", tag, content, count=1, flags=re.DOTALL)
        file.write_text(content, encoding="utf-8")
        return True
    else:
        file.write_text(tag + content, encoding="utf-8")
        return True


def project_folder(shortcode: str) -> Path:
    return DOCS_DIR / slugify_project(shortcode)


def collect_core_files(shortcode: str, files_by_project: dict) -> list:
    paths = []
    for f in files_by_project.get(shortcode, []):
        rel = f.relative_to(DOCS_DIR)
        # Exclude project READMEs and INDEX
        if rel.name.lower() in ("readme.md", "index.md"):
            continue
        paths.append(str(rel).replace("\\", "/"))
    return sorted(paths)


def write_project_readme(shortcode: str, files_by_project: dict) -> bool:
    folder = project_folder(shortcode)
    folder.mkdir(parents=True, exist_ok=True)
    meta = PROJECTS[shortcode]
    core_files = collect_core_files(shortcode, files_by_project)
    header = [
        f"<!-- Project: {shortcode} | Full Context: docs/System_Definition.md{meta['context_anchor']} -->",
        f"# {meta['name']}",
        "",
        "Metadata:",
        f"- Name: {meta['name']}",
        f"- Summary: {meta['summary']}",
        f"- Folder: docs/{slugify_project(shortcode)}/",
        "- Related Docs: see list below",
        "",
        "Project Overview:",
        f"- See: docs/System_Definition.md{meta['context_anchor']}",
        "",
        "Execution Docs:",
    ]
    for p in core_files:
        header.append(f"- {p}")
    header.extend([
        "",
        "Reverse Index:",
        "- Return to Global Index: docs/INDEX.md",
        "",
    ])
    readme_path = folder / "README.md"
    readme_path.write_text("\n".join(header) + "\n", encoding="utf-8")
    return True


def build_global_index(files_by_project: dict) -> Path:
    lines = [
        "<!-- Project: SystemCore | Full Context: docs/System_Definition.md -->",
        "# INDEX",
        "",
        "Master Navigation:",
        "- System Definition: docs/System_Definition.md",
        "- Function Map: docs/System_Reference.md",
        "- Handbook: docs/HANDBOOK.md",
        "- Architecture: docs/ARCHITECTURE.md",
        "- Work Plan: docs/WORK_PLAN.md",
        "- Working Memory: docs/WORKING_MEMORY.md",
        "- Episodic Log: docs/Testing_Episodic_Log.md",
        "",
        "Projects:",
    ]
    for sc in sorted(PROJECTS.keys(), key=str.lower):
        pdir = f"docs/{slugify_project(sc)}"  # relative from repo root
        lines.append(f"- {PROJECTS[sc]['name']} ({sc}): {pdir}/README.md")
        # list a few files
        core = collect_core_files(sc, files_by_project)[:10]
        for cf in core:
            lines.append(f"  - {cf}")
    lines.append("")
    idx = DOCS_DIR / "INDEX.md"
    idx.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return idx


def main() -> int:
    md_files = [p for p in DOCS_DIR.rglob("*.md")]
    # Skip the project READMEs we are about to write and existing INDEX to avoid double tagging
    planned_readmes = { (DOCS_DIR / slugify_project(sc) / "README.md").resolve() for sc in PROJECTS }
    files_by_project = {sc: [] for sc in PROJECTS}
    updated = 0
    created = 0
    for f in md_files:
        if f.resolve() in planned_readmes:
            continue
        if f.name.upper() == "INDEX.md":
            continue
        sc = detect_project(f)
        files_by_project.setdefault(sc, []).append(f)
        if ensure_top_tag(f, sc):
            updated += 1

    # Write per-project README
    for sc in PROJECTS:
        if write_project_readme(sc, files_by_project):
            created += 1

    # Build global index
    build_global_index(files_by_project)

    # Report
    print(f"Organized {len(PROJECTS)} projects.")
    print(f"Updated {updated} documents.")
    print(f"Created docs/INDEX.md")
    # Best-effort: report files without explicit mapping (none with current fallback)
    return 0


if __name__ == "__main__":
    sys.exit(main())

