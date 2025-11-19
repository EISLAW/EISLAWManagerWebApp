import importlib

mod = importlib.import_module('scoring_service.main')


def test_sanitize_illegal_chars():
    s = 'a/b\\c:*?"<>| דוגמה'
    out = mod._sanitize_hebrew_filename(s)
    assert '/' not in out and '\\' not in out
    assert ':' not in out and '"' not in out
    assert 'דוגמה' in out


def test_truncate_middle_basic():
    s = 'אבגדה' * 50
    out = mod._truncate_middle(s, 20)
    assert len(out) == 20
    assert '…' in out


def test_make_regular_effective_name():
    nm = mod._make_regular_effective_name('יעל כהן', 'דוח פרטיות', 'תוצר ראשי', '01.12.25', 'pdf')
    assert nm.endswith('.pdf')
    assert 'יעל' in nm and 'דוח' in nm
    assert '01.12.25' in nm

