#!/usr/bin/env python3
"""Test script for auto_jacob_review_runner parsing logic"""

import sys
from pathlib import Path

# Add tools directory to path
sys.path.insert(0, str(Path(__file__).parent))

from auto_jacob_review_runner import _safe_parse_trigger_line

def test_parsing():
    """Test the trigger line parsing logic"""
    tests = []

    # Test 1: Valid trigger with all fields
    line1 = 'AUTO_JACOB_REVIEW: TASK=CLI-009 BRANCH=feature/CLI-009 BASE=dev-main-2025-12-11 COMMIT=abc1234 SCOPE=backend'
    result1 = _safe_parse_trigger_line(line1, 1)
    tests.append(("Valid full trigger", result1 is not None and result1.task_id == "CLI-009"))

    # Test 2: Valid trigger with minimal fields
    line2 = 'AUTO_JACOB_REVIEW: TASK=AOS-030 BRANCH=feature/AOS-030 BASE=main'
    result2 = _safe_parse_trigger_line(line2, 2)
    tests.append(("Valid minimal trigger", result2 is not None and result2.task_id == "AOS-030"))

    # Test 3: Invalid task ID (lowercase)
    line3 = 'AUTO_JACOB_REVIEW: TASK=cli-009 BRANCH=feature/CLI-009 BASE=main'
    result3 = _safe_parse_trigger_line(line3, 3)
    tests.append(("Invalid task ID (lowercase)", result3 is None))

    # Test 4: Invalid branch (not feature/ or hotfix/)
    line4 = 'AUTO_JACOB_REVIEW: TASK=CLI-009 BRANCH=main BASE=dev-main-2025-12-11'
    result4 = _safe_parse_trigger_line(line4, 4)
    tests.append(("Invalid branch pattern", result4 is None))

    # Test 5: Missing required field (no BASE)
    line5 = 'AUTO_JACOB_REVIEW: TASK=CLI-009 BRANCH=feature/CLI-009'
    result5 = _safe_parse_trigger_line(line5, 5)
    tests.append(("Missing BASE field", result5 is None))

    # Test 6: Invalid commit hash
    line6 = 'AUTO_JACOB_REVIEW: TASK=CLI-009 BRANCH=feature/CLI-009 BASE=main COMMIT=xyz'
    result6 = _safe_parse_trigger_line(line6, 6)
    tests.append(("Invalid commit hash", result6 is None))

    # Test 7: Trigger not at start of line
    line7 = '  AUTO_JACOB_REVIEW: TASK=CLI-009 BRANCH=feature/CLI-009 BASE=main'
    result7 = _safe_parse_trigger_line(line7, 7)
    tests.append(("Trigger with leading spaces", result7 is None))

    # Test 8: Valid hotfix branch
    line8 = 'AUTO_JACOB_REVIEW: TASK=HOTFIX-001 BRANCH=hotfix/HOTFIX-001 BASE=main'
    result8 = _safe_parse_trigger_line(line8, 8)
    tests.append(("Valid hotfix branch", result8 is not None and result8.branch == "hotfix/HOTFIX-001"))

    # Test 9: Valid dev-main base
    line9 = 'AUTO_JACOB_REVIEW: TASK=CLI-009 BRANCH=feature/CLI-009 BASE=dev-main-2025-12-11'
    result9 = _safe_parse_trigger_line(line9, 9)
    tests.append(("Valid dev-main base", result9 is not None and result9.base == "dev-main-2025-12-11"))

    # Test 10: SQL injection attempt in TASK field
    line10 = 'AUTO_JACOB_REVIEW: TASK=CLI-009; DROP TABLE BRANCH=feature/CLI-009 BASE=main'
    result10 = _safe_parse_trigger_line(line10, 10)
    tests.append(("SQL injection attempt", result10 is None))

    # Print results
    passed = 0
    failed = 0
    for test_name, result in tests:
        status = "PASS" if result else "FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed += 1
        else:
            failed += 1

    print(f"\n=== Parsing Tests Summary ===")
    print(f"Total: {len(tests)}, Passed: {passed}, Failed: {failed}")
    return failed == 0

if __name__ == "__main__":
    success = test_parsing()
    sys.exit(0 if success else 1)
