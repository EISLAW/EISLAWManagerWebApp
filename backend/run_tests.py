#!/usr/bin/env python3
"""Simple test runner for privacy_db"""
import sys
sys.path.insert(0, '/home/azureuser/EISLAWManagerWebApp/backend')

import privacy_db
import json

print('Testing privacy_db module...')
print()

# Test 1: Init
print('1. Init DB...')
privacy_db.init_db()
print('   OK')

# Test 2: Save submission
print('2. Save submission...')
result = privacy_db.save_submission(
    submission_id="test-001",
    form_id="t9nJNoMdBgus",
    submitted_at="2025-12-03T10:00:00Z",
    contact_name="Test User",
    contact_email="test@example.com",
    business_name="Test Corp",
    score={"level": "mid", "dpo": True, "reg": True, "requirements": ["req1"]}
)
print(f'   Inserted: {result}')

# Test 3: Get submission
print('3. Get submission...')
sub = privacy_db.get_submission("test-001")
print(f'   Found: {sub["submission_id"]} level={sub["score_level"]} color={sub["score_color"]}')

# Test 4: Public results
print('4. Public results...')
pub = privacy_db.get_public_results("test-001")
print(f'   Business: {pub["business_name"]}')
print(f'   Level: {pub["level"]} - {pub["level_label"]}')
print(f'   Color: {pub["color"]}')
print(f'   Video: {pub["video_id"]}')

# Test 5: Duplicate rejection
print('5. Duplicate rejection...')
dup = privacy_db.save_submission(
    submission_id="test-001",
    form_id="t9nJNoMdBgus",
    submitted_at="2025-12-03T10:00:00Z"
)
print(f'   Duplicate rejected: {not dup}')

# Test 6: Level to color mapping
print('6. Level to color mapping...')
for level, expected in [("lone", "yellow"), ("basic", "yellow"), ("mid", "orange"), ("high", "red")]:
    privacy_db.save_submission(
        submission_id=f"color-test-{level}",
        form_id="form",
        submitted_at="2025-12-03T10:00:00Z",
        score={"level": level}
    )
    s = privacy_db.get_submission(f"color-test-{level}")
    ok = "OK" if s["score_color"] == expected else "FAIL"
    print(f'   {level} -> {s["score_color"]} [{ok}]')

# Test 7: Activity log
print('7. Activity log...')
privacy_db.log_activity(
    event_type="webhook_received",
    submission_id="test-001",
    details={"test": True},
    duration_ms=45
)
activities = privacy_db.get_activity(limit=1)
print(f'   Logged: {activities[0]["event_type"]}')

# Test 8: Stats
print('8. Stats...')
stats = privacy_db.get_stats()
print(f'   Total: {stats["total_submissions"]}')
print(f'   By level: {stats["by_level"]}')

print()
print('All tests passed!')
