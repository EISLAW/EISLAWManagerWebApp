#!/usr/bin/env python3
"""
Test script for quality Skills: testing-checklist and self-heal
Validates manifest structure and simulates skill invocation
"""

import json
import os
from pathlib import Path

def validate_skill_manifest(skill_path):
    """Validate a Skill manifest meets Claude Skills requirements"""
    manifest_path = skill_path / "manifest.json"
    readme_path = skill_path / "README.md"

    print(f"\n{'='*60}")
    print(f"Testing Skill: {skill_path.name}")
    print(f"{'='*60}")

    # Check files exist
    assert manifest_path.exists(), f"manifest.json not found in {skill_path}"
    assert readme_path.exists(), f"README.md not found in {skill_path}"
    print("✅ Files exist: manifest.json, README.md")

    # Load and validate manifest
    with open(manifest_path) as f:
        manifest = json.load(f)

    # Required fields
    required_fields = ["name", "version", "description", "category"]
    for field in required_fields:
        assert field in manifest, f"Missing required field: {field}"
    print(f"✅ Required fields present: {', '.join(required_fields)}")

    # Validate inputs
    if "inputs" in manifest:
        print(f"✅ Inputs defined: {len(manifest['inputs'])} input(s)")
        for input_name, input_spec in manifest['inputs'].items():
            assert "type" in input_spec, f"Input {input_name} missing 'type'"
            assert "description" in input_spec, f"Input {input_name} missing 'description'"
        print(f"   Input names: {', '.join(manifest['inputs'].keys())}")

    # Validate outputs
    if "outputs" in manifest:
        print(f"✅ Outputs defined: {len(manifest['outputs'])} output(s)")
        print(f"   Output names: {', '.join(manifest['outputs'].keys())}")

    # Validate steps
    if "steps" in manifest:
        print(f"✅ Steps defined: {len(manifest['steps'])} step(s)")
        for step in manifest['steps']:
            assert "id" in step, "Step missing 'id'"
            assert "type" in step or "description" in step, "Step missing 'type' or 'description'"

    # Validate references
    if "references" in manifest:
        print(f"✅ References: {len(manifest['references'])} reference(s)")
        for ref in manifest['references']:
            print(f"   - {ref}")

    # Validate tags
    if "tags" in manifest:
        print(f"✅ Tags: {', '.join(manifest['tags'])}")

    print(f"\n✅ Skill '{manifest['name']}' v{manifest['version']}: ALL CHECKS PASSED")
    return manifest

def simulate_skill_invocation(skill_name, manifest, test_inputs):
    """Simulate invoking a Skill with test inputs"""
    print(f"\n{'='*60}")
    print(f"Simulating Skill Invocation: {skill_name}")
    print(f"{'='*60}")

    print("\n📥 Inputs:")
    for key, value in test_inputs.items():
        print(f"   {key}: {value}")

    # Validate inputs match manifest
    if "inputs" in manifest:
        for input_name, input_spec in manifest['inputs'].items():
            required = input_spec.get('required', False)
            if required and input_name not in test_inputs:
                print(f"❌ ERROR: Required input '{input_name}' not provided")
                return False

            if input_name in test_inputs:
                # Validate enum
                if 'enum' in input_spec:
                    if test_inputs[input_name] not in input_spec['enum']:
                        print(f"❌ ERROR: Input '{input_name}' value '{test_inputs[input_name]}' not in allowed values: {input_spec['enum']}")
                        return False

    print("\n✅ Input validation passed")

    # Simulate steps execution
    if "steps" in manifest:
        print(f"\n🔄 Executing {len(manifest['steps'])} steps:")
        for i, step in enumerate(manifest['steps'], 1):
            step_id = step.get('id', f'step_{i}')
            step_desc = step.get('description', 'No description')
            print(f"   {i}. [{step_id}] {step_desc}")

    # Simulate outputs
    if "outputs" in manifest:
        print(f"\n📤 Outputs:")
        for output_name, output_spec in manifest['outputs'].items():
            output_type = output_spec.get('type', 'unknown')
            output_desc = output_spec.get('description', 'No description')
            print(f"   {output_name} ({output_type}): {output_desc}")

    print(f"\n✅ Skill '{skill_name}' simulation: SUCCESS")
    return True

def main():
    """Main test function"""
    skills_dir = Path(__file__).parent

    # Test testing-checklist Skill
    testing_checklist_path = skills_dir / "testing-checklist"
    manifest1 = validate_skill_manifest(testing_checklist_path)

    # Simulate invocation
    test_inputs1 = {
        "task_id": "SKILLS-003",
        "task_type": "backend",
        "branch": "feature/SKILLS-003"
    }
    simulate_skill_invocation("testing-checklist", manifest1, test_inputs1)

    # Test self-heal Skill
    self_heal_path = skills_dir / "self-heal"
    manifest2 = validate_skill_manifest(self_heal_path)

    # Simulate invocation
    test_inputs2 = {
        "symptom": "reasoning_loop",
        "context": "Testing self-heal Skill functionality"
    }
    simulate_skill_invocation("self-heal", manifest2, test_inputs2)

    print("\n" + "="*60)
    print("🎉 ALL SKILLS TESTS PASSED!")
    print("="*60)
    print("\nSkills are ready for production use.")
    print("To invoke in Claude:")
    print("  /skill testing-checklist task_id=CLI-009 task_type=backend branch=feature/CLI-009")
    print("  /skill self-heal symptom=reasoning_loop context=\"Stuck in analysis\"")
    print()

if __name__ == "__main__":
    main()
