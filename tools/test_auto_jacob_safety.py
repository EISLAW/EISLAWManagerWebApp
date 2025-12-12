#!/usr/bin/env python3
"""Test script for auto_jacob_review_runner safety features"""

import sys
from pathlib import Path

# Add tools directory to path
sys.path.insert(0, str(Path(__file__).parent))

from auto_jacob_review_runner import _safe_parse_trigger_line, TASK_RE, BRANCH_RE, BASE_RE

def test_safety():
    """Test safety features against malicious inputs"""
    tests = []

    # Test 1: Command injection in TASK field
    line1 = 'AUTO_JACOB_REVIEW: TASK=CLI-009 && rm -rf / BRANCH=feature/CLI-009 BASE=main'
    result1 = _safe_parse_trigger_line(line1, 1)
    tests.append(("Command injection in TASK", result1 is None))

    # Test 2: Path traversal in BRANCH
    line2 = 'AUTO_JACOB_REVIEW: TASK=CLI-009 BRANCH=feature/../../../etc/passwd BASE=main'
    result2 = _safe_parse_trigger_line(line2, 2)
    tests.append(("Path traversal in BRANCH", result2 is None))

    # Test 3: SQL injection in BASE
    line3 = 'AUTO_JACOB_REVIEW: TASK=CLI-009 BRANCH=feature/CLI-009 BASE=main; DROP TABLE users'
    result3 = _safe_parse_trigger_line(line3, 3)
    tests.append(("SQL injection in BASE", result3 is None))

    # Test 4: Shell metacharacters in TASK
    line4 = 'AUTO_JACOB_REVIEW: TASK=CLI-009`whoami` BRANCH=feature/CLI-009 BASE=main'
    result4 = _safe_parse_trigger_line(line4, 4)
    tests.append(("Shell metacharacters in TASK", result4 is None))

    # Test 5: Newline injection
    line5 = 'AUTO_JACOB_REVIEW: TASK=CLI-009\nrm -rf / BRANCH=feature/CLI-009 BASE=main'
    result5 = _safe_parse_trigger_line(line5, 5)
    tests.append(("Newline injection", result5 is None))

    # Test 6: Null byte injection
    line6 = 'AUTO_JACOB_REVIEW: TASK=CLI-009\x00malicious BRANCH=feature/CLI-009 BASE=main'
    result6 = _safe_parse_trigger_line(line6, 6)
    tests.append(("Null byte injection", result6 is None))

    # Test 7: Unicode confusables (Cyrillic 'a' vs Latin 'a')
    line7 = 'AUTO_JACOB_REVIEW: TASK=CLI-009 BRANCH=feаture/CLI-009 BASE=main'  # Cyrillic 'а'
    result7 = _safe_parse_trigger_line(line7, 7)
    tests.append(("Unicode confusables", result7 is None))

    # Test 8: Very long TASK ID (buffer overflow attempt)
    line8 = f'AUTO_JACOB_REVIEW: TASK={"A" * 10000} BRANCH=feature/CLI-009 BASE=main'
    result8 = _safe_parse_trigger_line(line8, 8)
    tests.append(("Very long TASK ID", result8 is None))

    # Test 9: Environment variable injection
    line9 = 'AUTO_JACOB_REVIEW: TASK=$EVIL BRANCH=feature/$EVIL BASE=$EVIL'
    result9 = _safe_parse_trigger_line(line9, 9)
    tests.append(("Environment variable injection", result9 is None))

    # Test 10: HTML/JavaScript injection
    line10 = 'AUTO_JACOB_REVIEW: TASK=<script>alert(1)</script> BRANCH=feature/CLI-009 BASE=main'
    result10 = _safe_parse_trigger_line(line10, 10)
    tests.append(("HTML/JS injection in TASK", result10 is None))

    # Test 11: Regex DoS attempt (catastrophic backtracking)
    line11 = 'AUTO_JACOB_REVIEW: TASK=' + 'A' * 1000 + 'B' * 1000 + ' BRANCH=feature/CLI-009 BASE=main'
    result11 = _safe_parse_trigger_line(line11, 11)
    tests.append(("Regex DoS attempt", result11 is None))

    # Test 12: Valid branch but with disallowed prefix (e.g., 'main')
    line12 = 'AUTO_JACOB_REVIEW: TASK=CLI-009 BRANCH=main BASE=dev-main-2025-12-11'
    result12 = _safe_parse_trigger_line(line12, 12)
    tests.append(("Disallowed branch (main)", result12 is None))

    # Test 13: Valid-looking but with extra commands
    line13 = 'AUTO_JACOB_REVIEW: TASK=CLI-009 BRANCH=feature/CLI-009 BASE=main COMMIT=abc1234; curl evil.com'
    result13 = _safe_parse_trigger_line(line13, 13)
    tests.append(("Extra commands after valid trigger", result13 is None))

    # Test 14: TASK_RE rejects special characters
    tests.append(("TASK_RE rejects semicolon", not TASK_RE.match("CLI-009;whoami")))
    tests.append(("TASK_RE rejects backtick", not TASK_RE.match("CLI-009`whoami`")))
    tests.append(("TASK_RE rejects dollar sign", not TASK_RE.match("CLI-009$EVIL")))

    # Test 15: BRANCH_RE rejects path traversal
    tests.append(("BRANCH_RE rejects parent dir", not BRANCH_RE.match("feature/../../../etc/passwd")))
    tests.append(("BRANCH_RE rejects absolute path", not BRANCH_RE.match("/etc/passwd")))

    # Test 16: BASE_RE rejects special characters
    tests.append(("BASE_RE rejects semicolon", not BASE_RE.match("main;DROP TABLE")))
    tests.append(("BASE_RE rejects shell injection", not BASE_RE.match("main && rm -rf /")))

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

    print(f"\n=== Safety Tests Summary ===")
    print(f"Total: {len(tests)}, Passed: {passed}, Failed: {failed}")
    return failed == 0

if __name__ == "__main__":
    success = test_safety()
    sys.exit(0 if success else 1)
