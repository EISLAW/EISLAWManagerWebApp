#!/usr/bin/env python3
import re
import sys
from pathlib import Path


CSS = """
    :root { --petrol:#0B3B5A; --copper:#D07655; --text:#1F2733; --muted:#666A72; --line:#F3F4F6; --card:#F7F8FA; }
    html,body{height:100%}
    body{margin:0;background:#fff;color:var(--text);font-family:"Noto Sans Hebrew","David",system-ui,-apple-system,Segoe UI,Arial,sans-serif;line-height:1.6;font-size:15pt}
    .wrapper{max-width:900px;margin:0 auto;padding:32px}
    .header{position:relative;padding-top:12px;padding-bottom:18px;border-bottom:4px solid var(--copper)}
    .header .logo{position:absolute;top:0;right:0;display:flex;align-items:center;justify-content:flex-end;width:160px;height:60px}
    .header .logo .fallback{width:140px;height:40px;border:1px dashed var(--line);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12pt}
    .doc-title{margin:0;text-align:center;color:var(--petrol);font-size:26pt;font-weight:700}
    .doc-subtitle{margin:6px 0 0 0;text-align:center;color:var(--muted);font-size:18pt;font-weight:600}
    .hero-text{margin:18px 0 24px; background:var(--card); border:1px solid var(--line); border-right:4px solid var(--copper); border-radius:12px; padding:16px}
    .hero-text .t{font-size:20pt;color:var(--petrol);font-weight:700;margin:0 0 4px 0}
    .hero-text .s{font-size:16pt;color:var(--muted);margin:0}
    h3{color:var(--petrol);font-size:20pt;margin:24px 0 10px;font-weight:700}
    h4{color:var(--petrol);font-size:18pt;margin:16px 0 8px;font-weight:600}
    p{margin:8px 0}
    ul{margin:8px 0 8px 0;padding-inline-start:20px}
    ul li{margin:4px 0}
    ol{margin:8px 0 8px 0;padding-inline-start:24px}
    .note{background:var(--card);border-right:4px solid var(--copper);padding:12px;border-radius:10px}
    .line{height:1px;background:var(--line);margin:22px 0}
    .footer{margin-top:32px;padding-top:12px;border-top:1px solid var(--line);color:var(--muted);text-align:center;font-size:13pt}
    @media print{.wrapper{padding:2.5cm}.header,.note{-webkit-print-color-adjust:exact;print-color-adjust:exact}h3,h4,.note,.header{page-break-inside:avoid;break-inside:avoid}}
"""


def unescape_backslashes(text: str) -> str:
    # Convert escaped markdown markers like \*\* to **, and \# to #
    text = text.replace("\\*", "*")
    text = text.replace("\\_", "_")
    text = text.replace("\\#", "#")
    text = text.replace("\\-", "-")
    return text


def md_to_html(md: str) -> str:
    md = unescape_backslashes(md)
    raw_lines = [l.rstrip("\n\r") for l in md.splitlines()]
    # Pre-clean: some sources prefix every line with "## ". Strip repeated leading "## " safely.
    lines = []
    for l in raw_lines:
        s = l
        # remove up to two leading '## ' prefixes to recover original markdown
        for _ in range(2):
            if s.startswith("## "):
                s = s[3:]
        lines.append(s)
    html_parts = []
    in_ul = False
    in_ol = False

    def close_lists():
        nonlocal in_ul, in_ol
        if in_ul:
            html_parts.append("</ul>")
            in_ul = False
        if in_ol:
            html_parts.append("</ol>")
            in_ol = False

    skip_block = False
    seen_headings = set()

    def norm_heading(txt: str) -> str:
        # Normalize by splitting to tokens, dropping digits, lowercasing, and sorting
        import re as _re
        tokens = [t for t in _re.split(r"[\s\-–—()\[\]:·•,.;|]+", txt) if t]
        tokens = [t for t in tokens if not t.isdigit()]
        return "|".join(sorted(tokens))

    for raw in lines:
        line = raw.strip()
        if skip_block:
            # End skip on next major boundary
            if (line.startswith("## ") or line.startswith("### ") or line.startswith("#### ")
                or line.startswith("🧩 ") or line.startswith("---") or line.startswith("----")):
                skip_block = False
            else:
                continue

        if not line:
            close_lists()
            html_parts.append("<p></p>")
            continue
        if line.startswith("----") or line == "---":
            close_lists()
            html_parts.append('<div class="line"></div>')
            continue
        # Emoji section line
        if line.startswith("🧩 "):
            close_lists()
            key = norm_heading(line)
            if key in seen_headings:
                skip_block = True
                continue
            seen_headings.add(key)
            html_parts.append(f"<h3>{line}</h3>")
            continue
        if line.startswith("### "):
            close_lists()
            key = norm_heading(line[4:])
            if key in seen_headings:
                skip_block = True
                continue
            seen_headings.add(key)
            html_parts.append(f"<h4>{line[4:]}</h4>")
            continue
        if line.startswith("#### "):
            close_lists()
            key = norm_heading(line[5:])
            if key in seen_headings:
                skip_block = True
                continue
            seen_headings.add(key)
            html_parts.append(f"<h4>{line[5:]}</h4>")
            continue
        if line.startswith("## "):
            close_lists()
            # Map top-level markdown h2 to h3 in template hierarchy
            key = norm_heading(line[3:])
            if key in seen_headings:
                skip_block = True
                continue
            seen_headings.add(key)
            html_parts.append(f"<h3>{line[3:]}</h3>")
            continue
        # Ordered list: 1. foo
        mnum = re.match(r"^\d+\.\s+(.*)$", line)
        if mnum:
            if in_ul:
                html_parts.append("</ul>")
                in_ul = False
            if not in_ol:
                html_parts.append("<ol>")
                in_ol = True
            html_parts.append(f"<li>{mnum.group(1)}</li>")
            continue
        # Unordered list: - item or * item
        if re.match(r"^[-*]\s+", line):
            if in_ol:
                html_parts.append("</ol>")
                in_ol = False
            if not in_ul:
                html_parts.append("<ul>")
                in_ul = True
            html_parts.append(f"<li>{re.sub(r'^[-*]\s+', '', line)}</li>")
            continue
        # Blockquote
        if line.startswith("> "):
            close_lists()
            html_parts.append(f"<div class=\"note\">{line[2:]}</div>")
            continue
        # Bold **text**
        line = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", line)
        html_parts.append(f"<p>{line}</p>")

    close_lists()
    return "\n".join(html_parts)


def compose(md_path: Path, title: str, subtitle: str, hero_text: str | None = None) -> str:
    md_text = md_path.read_text(encoding="utf-8", errors="replace")
    body_html = md_to_html(md_text)
    return f"""<!DOCTYPE html>
<html lang=\"he\" dir=\"rtl\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>EISLAW — {title}</title>
  <link href=\"https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;600;700&display=swap\" rel=\"stylesheet\"> 
  <style>{CSS}</style>
  <meta name=\"format-detection\" content=\"telephone=no\" />
  <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\" />
  </head>
<body>
  <div class=\"wrapper\"> 
    <header class=\"header\">
      <div class=\"logo\"><div class=\"fallback\">EISLAW</div></div>
      <h1 class=\"doc-title\">{title}</h1>
      <div class=\"doc-subtitle\">{subtitle}</div>
    </header>
    {f'<div class="hero-text"><p class="t">{title}</p><p class="s">{hero_text}</p></div>' if hero_text else ''}
    <section>
      {body_html}
    </section>
    <footer class=\"footer\">© EISLAW · Adv. Eitan Shamir · eitan@eislaw.co.il · www.eislaw.co.il</footer>
  </div>
</body>
</html>"""


def main(argv: list[str]) -> int:
    if len(argv) < 4:
        print("Usage: compose_report_from_md.py <md_path> <out_html_path> <title> [<subtitle>] [<hero_text>]")
        return 2
    md_path = Path(argv[1])
    out_path = Path(argv[2])
    title = argv[3]
    subtitle = argv[4] if len(argv) > 4 else ""
    hero_text = argv[5] if len(argv) > 5 else None
    html = compose(md_path, title, subtitle, hero_text)
    out_path.write_text(html, encoding="utf-8")
    print(str(out_path))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
