"""
Unit tests for unified database module.

Run with: python -m pytest backend/tests/test_db.py -v
"""
import pytest
import tempfile
from pathlib import Path
import sys
import os

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from db import Database, ClientsDB, TasksDB, ContactsDB, log_activity, get_stats


@pytest.fixture
def test_db():
    """Create temporary test database."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = Path(f.name)

    db = Database(db_path)
    yield db

    # Cleanup
    db_path.unlink(missing_ok=True)
    # Also cleanup WAL and SHM files if they exist
    Path(str(db_path) + "-wal").unlink(missing_ok=True)
    Path(str(db_path) + "-shm").unlink(missing_ok=True)


@pytest.fixture
def clients_db(test_db):
    return ClientsDB(test_db)


@pytest.fixture
def tasks_db(test_db):
    return TasksDB(test_db)


@pytest.fixture
def contacts_db(test_db):
    return ContactsDB(test_db)


# ═══════════════════════════════════════════════════════════
# DATABASE TESTS
# ═══════════════════════════════════════════════════════════

class TestDatabase:
    def test_init_creates_tables(self, test_db):
        """Test that database initialization creates all required tables."""
        tables = test_db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        table_names = [t["name"] for t in tables]

        assert "clients" in table_names
        assert "tasks" in table_names
        assert "contacts" in table_names
        assert "activity_log" in table_names
        assert "sync_state" in table_names

    def test_wal_mode_enabled(self, test_db):
        """Test that WAL mode is enabled."""
        result = test_db.execute_one("PRAGMA journal_mode")
        assert result["journal_mode"] == "wal"

    def test_foreign_keys_enabled(self, test_db):
        """Test that foreign keys are enabled."""
        result = test_db.execute_one("PRAGMA foreign_keys")
        assert result["foreign_keys"] == 1

    def test_execute_returns_list(self, test_db):
        """Test that execute returns list of dicts."""
        result = test_db.execute("SELECT 1 as num, 'test' as str")
        assert isinstance(result, list)
        assert len(result) == 1
        assert result[0]["num"] == 1
        assert result[0]["str"] == "test"

    def test_execute_one_returns_dict(self, test_db):
        """Test that execute_one returns single dict."""
        result = test_db.execute_one("SELECT 1 as num")
        assert isinstance(result, dict)
        assert result["num"] == 1

    def test_execute_one_returns_none_for_empty(self, test_db):
        """Test that execute_one returns None for empty results."""
        result = test_db.execute_one("SELECT * FROM clients WHERE id = 'nonexistent'")
        assert result is None


# ═══════════════════════════════════════════════════════════
# CLIENT TESTS
# ═══════════════════════════════════════════════════════════

class TestClients:
    def test_create_client(self, clients_db):
        """Test creating a new client."""
        client_id = clients_db.save({
            "name": "Test Client",
            "email": "test@example.com"
        })
        assert client_id is not None

        client = clients_db.get(client_id)
        assert client["name"] == "Test Client"
        assert client["email"] == "test@example.com"
        assert client["active"] == 1
        assert client["stage"] == "new"

    def test_update_client(self, clients_db):
        """Test updating an existing client."""
        client_id = clients_db.save({"name": "Original Name"})

        clients_db.save({
            "id": client_id,
            "name": "Updated Name",
            "email": "new@example.com"
        })

        client = clients_db.get(client_id)
        assert client["name"] == "Updated Name"
        assert client["email"] == "new@example.com"

    def test_archive_restore(self, clients_db):
        """Test archiving and restoring a client."""
        client_id = clients_db.save({"name": "Archive Test"})

        clients_db.archive(client_id)
        client = clients_db.get(client_id)
        assert client["active"] == 0

        clients_db.restore(client_id)
        client = clients_db.get(client_id)
        assert client["active"] == 1

    def test_list_active_only(self, clients_db):
        """Test listing only active clients."""
        clients_db.save({"name": "Active Client"})
        archived_id = clients_db.save({"name": "Archived Client"})
        clients_db.archive(archived_id)

        active = clients_db.list(active_only=True)
        all_clients = clients_db.list(active_only=False)

        assert len(active) == 1
        assert len(all_clients) == 2
        assert active[0]["name"] == "Active Client"

    def test_search(self, clients_db):
        """Test searching clients by name or email."""
        clients_db.save({"name": "Sivan Cohen", "email": "sivan@test.com"})
        clients_db.save({"name": "David Levi", "email": "david@test.com"})

        # Search by name
        results = clients_db.search("sivan")
        assert len(results) == 1
        assert results[0]["name"] == "Sivan Cohen"

        # Search by email
        results = clients_db.search("david@")
        assert len(results) == 1
        assert results[0]["name"] == "David Levi"

    def test_get_by_name(self, clients_db):
        """Test getting client by name (case insensitive)."""
        clients_db.save({"name": "Test Name"})

        client = clients_db.get_by_name("test name")  # lowercase
        assert client is not None
        assert client["name"] == "Test Name"

        client = clients_db.get_by_name("TEST NAME")  # uppercase
        assert client is not None

    def test_count(self, clients_db):
        """Test counting clients."""
        assert clients_db.count() == 0

        clients_db.save({"name": "Client 1"})
        clients_db.save({"name": "Client 2"})
        archived_id = clients_db.save({"name": "Client 3"})
        clients_db.archive(archived_id)

        assert clients_db.count(active_only=True) == 2
        assert clients_db.count(active_only=False) == 3

    def test_types_stored_as_json(self, clients_db):
        """Test that types array is stored as JSON."""
        client_id = clients_db.save({
            "name": "Type Test",
            "types": ["retainer", "litigation"]
        })

        client = clients_db.get(client_id)
        # types is stored as JSON string
        assert client["types"] == '["retainer", "litigation"]'


# ═══════════════════════════════════════════════════════════
# TASK TESTS
# ═══════════════════════════════════════════════════════════

class TestTasks:
    def test_create_task(self, tasks_db):
        """Test creating a new task."""
        task_id = tasks_db.save({
            "title": "Test Task",
            "priority": "high"
        })

        task = tasks_db.get(task_id)
        assert task["title"] == "Test Task"
        assert task["priority"] == "high"
        assert task["done"] == 0
        assert task["status"] == "todo"

    def test_update_task(self, tasks_db):
        """Test updating a task."""
        task_id = tasks_db.save({"title": "Original"})

        tasks_db.save({
            "id": task_id,
            "title": "Updated",
            "description": "New description"
        })

        task = tasks_db.get(task_id)
        assert task["title"] == "Updated"
        assert task["description"] == "New description"

    def test_complete_task(self, tasks_db):
        """Test marking task as complete."""
        task_id = tasks_db.save({"title": "Complete Me"})

        tasks_db.complete(task_id)

        task = tasks_db.get(task_id)
        assert task["done"] == 1
        assert task["status"] == "done"
        assert task["completed_at"] is not None

    def test_list_by_client(self, tasks_db, clients_db):
        """Test listing tasks by client."""
        client_id = clients_db.save({"name": "Task Client"})

        tasks_db.save({"title": "Task 1", "client_id": client_id})
        tasks_db.save({"title": "Task 2", "client_id": client_id})
        tasks_db.save({"title": "Other Task"})

        client_tasks = tasks_db.list(client_id=client_id)
        assert len(client_tasks) == 2

    def test_list_done_filter(self, tasks_db):
        """Test filtering tasks by done status."""
        tasks_db.save({"title": "Open Task"})
        done_id = tasks_db.save({"title": "Done Task"})
        tasks_db.complete(done_id)

        open_tasks = tasks_db.list(done=False)
        done_tasks = tasks_db.list(done=True)

        assert len(open_tasks) == 1
        assert len(done_tasks) == 1
        assert open_tasks[0]["title"] == "Open Task"
        assert done_tasks[0]["title"] == "Done Task"

    def test_delete_task(self, tasks_db):
        """Test deleting a task."""
        task_id = tasks_db.save({"title": "Delete Me"})

        tasks_db.delete(task_id)

        task = tasks_db.get(task_id)
        assert task is None

    def test_count(self, tasks_db):
        """Test counting tasks."""
        tasks_db.save({"title": "Task 1"})
        done_id = tasks_db.save({"title": "Task 2"})
        tasks_db.complete(done_id)

        assert tasks_db.count() == 2
        assert tasks_db.count(done=True) == 1
        assert tasks_db.count(done=False) == 1


# ═══════════════════════════════════════════════════════════
# CONTACT TESTS
# ═══════════════════════════════════════════════════════════

class TestContacts:
    def test_create_contact(self, contacts_db, clients_db):
        """Test creating a contact."""
        client_id = clients_db.save({"name": "Contact Client"})

        contact_id = contacts_db.save({
            "client_id": client_id,
            "name": "John Doe",
            "email": "john@example.com",
            "role": "primary"
        })

        contact = contacts_db.get(contact_id)
        assert contact["name"] == "John Doe"
        assert contact["client_id"] == client_id
        assert contact["role"] == "primary"

    def test_update_contact(self, contacts_db, clients_db):
        """Test updating a contact."""
        client_id = clients_db.save({"name": "Test Client"})
        contact_id = contacts_db.save({
            "client_id": client_id,
            "name": "Original Name"
        })

        contacts_db.save({
            "id": contact_id,
            "name": "Updated Name",
            "phone": "054-123-4567"
        })

        contact = contacts_db.get(contact_id)
        assert contact["name"] == "Updated Name"
        assert contact["phone"] == "054-123-4567"

    def test_list_for_client(self, contacts_db, clients_db):
        """Test listing contacts for a client."""
        client_id = clients_db.save({"name": "Multi Contact Client"})

        contacts_db.save({"client_id": client_id, "name": "Contact 1"})
        contacts_db.save({"client_id": client_id, "name": "Contact 2"})

        contacts = contacts_db.list_for_client(client_id)
        assert len(contacts) == 2

    def test_delete_contact(self, contacts_db, clients_db):
        """Test deleting a contact."""
        client_id = clients_db.save({"name": "Delete Contact Client"})
        contact_id = contacts_db.save({
            "client_id": client_id,
            "name": "Delete Me"
        })

        contacts_db.delete(contact_id)

        contact = contacts_db.get(contact_id)
        assert contact is None

    def test_cascade_delete(self, test_db, clients_db, contacts_db):
        """Test that contacts are deleted when client is deleted."""
        client_id = clients_db.save({"name": "Cascade Test"})
        contacts_db.save({"client_id": client_id, "name": "Contact 1"})
        contacts_db.save({"client_id": client_id, "name": "Contact 2"})

        # Delete client directly
        test_db.execute("DELETE FROM clients WHERE id = ?", (client_id,))

        # Contacts should be deleted too
        contacts = contacts_db.list_for_client(client_id)
        assert len(contacts) == 0


# ═══════════════════════════════════════════════════════════
# ACTIVITY LOG TESTS
# ═══════════════════════════════════════════════════════════

class TestActivityLog:
    def test_log_activity(self, test_db):
        """Test logging activity."""
        log_activity(
            test_db,
            event_type="test_event",
            entity_type="client",
            entity_id="123",
            details={"foo": "bar"},
            success=True
        )

        results = test_db.execute(
            "SELECT * FROM activity_log WHERE event_type = ?",
            ("test_event",)
        )
        assert len(results) == 1
        assert results[0]["entity_id"] == "123"
        assert results[0]["success"] == 1

    def test_log_activity_with_failure(self, test_db):
        """Test logging failed activity."""
        log_activity(
            test_db,
            event_type="failed_event",
            success=False
        )

        result = test_db.execute_one(
            "SELECT * FROM activity_log WHERE event_type = ?",
            ("failed_event",)
        )
        assert result["success"] == 0


# ═══════════════════════════════════════════════════════════
# STATS TESTS
# ═══════════════════════════════════════════════════════════

class TestStats:
    def test_get_stats(self, test_db, clients_db, tasks_db, contacts_db):
        """Test getting database statistics."""
        # Create some data
        client_id = clients_db.save({"name": "Stats Client"})
        clients_db.save({"name": "Archived"})
        clients_db.archive(clients_db.get_by_name("Archived")["id"])

        tasks_db.save({"title": "Open Task"})
        done_id = tasks_db.save({"title": "Done Task"})
        tasks_db.complete(done_id)

        contacts_db.save({"client_id": client_id, "name": "Contact"})

        stats = get_stats(test_db)

        assert stats["clients"]["total"] == 2
        assert stats["clients"]["active"] == 1
        assert stats["tasks"]["total"] == 2
        assert stats["tasks"]["done"] == 1
        assert stats["tasks"]["open"] == 1
        assert stats["contacts"]["total"] == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
