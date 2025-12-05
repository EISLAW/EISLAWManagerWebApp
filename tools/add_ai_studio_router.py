#!/usr/bin/env python3
"""Add ai_studio router to main.py"""

MAIN_PY = "/home/azureuser/EISLAWManagerWebApp/backend/main.py"

# Read current content
with open(MAIN_PY, "r") as f:
    lines = f.readlines()

# Find line numbers for insertion points
import_insert_line = None
app_line = None

for i, line in enumerate(lines):
    if "import word_api" in line and import_insert_line is None:
        # Find the end of this try/except block
        for j in range(i+1, min(i+5, len(lines))):
            if lines[j].strip() and not lines[j].startswith(" "):
                import_insert_line = j
                break
    if 'app = FastAPI(title="EISLAW Backend"' in line:
        app_line = i

# Check if already added
content = "".join(lines)
if "import ai_studio" in content:
    print("ai_studio import already exists")
else:
    # Insert import block
    import_block = """try:
    from backend import ai_studio
except ImportError:
    import ai_studio
"""
    if import_insert_line:
        lines.insert(import_insert_line, import_block)
        # Adjust app_line if it's after insertion point
        if app_line and app_line >= import_insert_line:
            app_line += import_block.count("\n")
        print(f"Added ai_studio import at line {import_insert_line}")

if "app.include_router(ai_studio.router)" in content:
    print("ai_studio router already included")
else:
    # Insert router include after app creation
    if app_line is not None:
        router_line = "\n# Include AI Studio router\napp.include_router(ai_studio.router)\n"
        lines.insert(app_line + 1, router_line)
        print(f"Added app.include_router at line {app_line + 1}")

# Write back
with open(MAIN_PY, "w") as f:
    f.writelines(lines)

print("Done!")
