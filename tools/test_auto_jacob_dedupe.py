#!/usr/bin/env python3
"""Test script for auto_jacob_review_runner dedupe logic"""

import json
import sys
import tempfile
from pathlib import Path

# Add tools directory to path
sys.path.insert(0, str(Path(__file__).parent))

from auto_jacob_review_runner import _load_state, _save_state, _dedupe_key

def test_dedupe():
    """Test the state file and dedupe logic"""
    tests = []

    # Create a temporary directory for our state file
    temp_dir = Path(tempfile.mkdtemp())
    temp_state_path = temp_dir / "test_state.json"

    try:
        # Test 1: Load state from non-existent file
        state1 = _load_state(temp_state_path)
        tests.append(("Load state from non-existent file",
                     state1 == {"processed": {}}))

        # Test 2: Save state
        state2 = {
            "processed": {
                "CLI-009|feature/CLI-009|abc1234": {
                    "task": "CLI-009",
                    "branch": "feature/CLI-009",
                    "commit": "abc1234",
                    "verdict": "APPROVED",
                    "processed_at": "2025-12-12T10:00:00Z"
                }
            }
        }
        _save_state(temp_state_path, state2)
        tests.append(("Save state to file", temp_state_path.exists()))

        # Test 3: Load saved state
        state3 = _load_state(temp_state_path)
        tests.append(("Load saved state",
                     "CLI-009|feature/CLI-009|abc1234" in state3["processed"]))

        # Test 4: Dedupe key generation
        key1 = _dedupe_key("CLI-009", "feature/CLI-009", "abc1234")
        tests.append(("Dedupe key format",
                     key1 == "CLI-009|feature/CLI-009|abc1234"))

        # Test 5: Different commits generate different keys
        key2 = _dedupe_key("CLI-009", "feature/CLI-009", "def5678")
        tests.append(("Different commits = different keys",
                     key1 != key2))

        # Test 6: Same task/branch/commit generates same key
        key3 = _dedupe_key("CLI-009", "feature/CLI-009", "abc1234")
        tests.append(("Same params = same key",
                     key1 == key3))

        # Test 7: State file is valid JSON
        with open(temp_state_path, 'r') as f:
            loaded_json = json.load(f)
        tests.append(("State file is valid JSON",
                     isinstance(loaded_json, dict)))

        # Test 8: State file has processed key
        tests.append(("State file has 'processed' key",
                     "processed" in loaded_json))

    finally:
        # Clean up
        import shutil
        if temp_dir.exists():
            shutil.rmtree(temp_dir)

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

    print(f"\n=== Dedupe Tests Summary ===")
    print(f"Total: {len(tests)}, Passed: {passed}, Failed: {failed}")
    return failed == 0

if __name__ == "__main__":
    success = test_dedupe()
    sys.exit(0 if success else 1)
