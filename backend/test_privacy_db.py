"""
Tests for Privacy Database Module
Run: python -m pytest test_privacy_db.py -v
"""
import pytest
import os
import tempfile
from pathlib import Path

# Override DB path for testing
import privacy_db
TEST_DB = Path(tempfile.gettempdir()) / "test_privacy.db"
privacy_db.DB_PATH = TEST_DB


class TestPrivacyDB:
    """Test privacy database operations"""

    def setup_method(self):
        """Clean up before each test"""
        if TEST_DB.exists():
            TEST_DB.unlink()
        privacy_db.init_db()

    def teardown_method(self):
        """Clean up after each test"""
        if TEST_DB.exists():
            TEST_DB.unlink()

    def test_init_db_creates_tables(self):
        """Test that init_db creates required tables"""
        with privacy_db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = {row["name"] for row in cursor.fetchall()}

        assert "privacy_submissions" in tables
        assert "activity_log" in tables

    def test_save_submission_new(self):
        """Test saving a new submission"""
        result = privacy_db.save_submission(
            submission_id="test-123",
            form_id="form-abc",
            submitted_at="2025-12-03T10:00:00Z",
            contact_name="Test User",
            contact_email="test@example.com",
            business_name="Test Corp",
            answers={"q1": "a1", "q2": "a2"},
            score={"level": "mid", "dpo": True, "reg": True, "requirements": ["req1"]}
        )

        assert result is True

    def test_save_submission_duplicate_rejected(self):
        """Test that duplicate submissions are rejected"""
        # First save
        privacy_db.save_submission(
            submission_id="test-dup",
            form_id="form-abc",
            submitted_at="2025-12-03T10:00:00Z"
        )

        # Second save with same ID should return False
        result = privacy_db.save_submission(
            submission_id="test-dup",
            form_id="form-abc",
            submitted_at="2025-12-03T10:00:00Z"
        )

        assert result is False

    def test_get_submission_exists(self):
        """Test retrieving an existing submission"""
        privacy_db.save_submission(
            submission_id="test-get",
            form_id="form-abc",
            submitted_at="2025-12-03T10:00:00Z",
            contact_name="Get Test",
            score={"level": "high", "dpo": True}
        )

        sub = privacy_db.get_submission("test-get")

        assert sub is not None
        assert sub["submission_id"] == "test-get"
        assert sub["contact_name"] == "Get Test"
        assert sub["score_level"] == "high"
        assert sub["score_color"] == "red"

    def test_get_submission_not_exists(self):
        """Test retrieving non-existent submission returns None"""
        sub = privacy_db.get_submission("does-not-exist")
        assert sub is None

    def test_get_public_results(self):
        """Test public results format"""
        privacy_db.save_submission(
            submission_id="test-public",
            form_id="form-abc",
            submitted_at="2025-12-03T10:00:00Z",
            business_name="Public Corp",
            score={"level": "mid", "dpo": True, "requirements": ["ממונה פרטיות"]}
        )

        results = privacy_db.get_public_results("test-public")

        assert results is not None
        assert results["business_name"] == "Public Corp"
        assert results["level"] == "mid"
        assert results["color"] == "orange"
        assert results["level_label"] == "בינונית"
        assert "ממונה פרטיות" in results["requirements"]
        assert results["video_id"] == "orange"

    def test_level_to_color_mapping(self):
        """Test level to color mapping"""
        test_cases = [
            ("lone", "yellow"),
            ("basic", "yellow"),
            ("mid", "orange"),
            ("high", "red"),
        ]

        for level, expected_color in test_cases:
            privacy_db.save_submission(
                submission_id=f"test-{level}",
                form_id="form-abc",
                submitted_at="2025-12-03T10:00:00Z",
                score={"level": level}
            )

            sub = privacy_db.get_submission(f"test-{level}")
            assert sub["score_color"] == expected_color, f"Level {level} should be {expected_color}"

    def test_get_submissions_list(self):
        """Test getting list of submissions"""
        # Save multiple
        for i in range(5):
            privacy_db.save_submission(
                submission_id=f"list-test-{i}",
                form_id="form-abc",
                submitted_at=f"2025-12-03T10:0{i}:00Z"
            )

        subs = privacy_db.get_submissions(limit=3)

        assert len(subs) == 3

    def test_update_review(self):
        """Test updating review status"""
        privacy_db.save_submission(
            submission_id="review-test",
            form_id="form-abc",
            submitted_at="2025-12-03T10:00:00Z"
        )

        result = privacy_db.update_review(
            submission_id="review-test",
            status="correct"
        )

        assert result is True

        sub = privacy_db.get_submission("review-test")
        assert sub["review_status"] == "correct"
        assert sub["reviewed_at"] is not None

    def test_log_activity(self):
        """Test logging activity"""
        privacy_db.log_activity(
            event_type="webhook_received",
            submission_id="act-test",
            details={"source": "fillout"},
            duration_ms=45,
            success=True
        )

        activities = privacy_db.get_activity(limit=1)

        assert len(activities) == 1
        assert activities[0]["event_type"] == "webhook_received"
        assert activities[0]["submission_id"] == "act-test"

    def test_get_stats(self):
        """Test statistics"""
        # Save some submissions with different levels
        for level in ["basic", "mid", "high"]:
            privacy_db.save_submission(
                submission_id=f"stats-{level}",
                form_id="form-abc",
                submitted_at="2025-12-03T10:00:00Z",
                score={"level": level}
            )

        stats = privacy_db.get_stats()

        assert stats["total_submissions"] == 3
        assert "by_level" in stats
        assert "by_status" in stats


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
