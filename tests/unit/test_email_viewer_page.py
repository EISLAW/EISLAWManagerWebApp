import types

from scoring_service.main import (
    _absolute_url,
    _bool_from_payload,
    _email_viewer_path,
    _render_email_view_page,
)


def test_email_viewer_path_encodes_client():
    path = _email_viewer_path("abc123", "סיון בנימיני")
    assert path == "/email/viewer?id=abc123&client=%D7%A1%D7%99%D7%95%D7%9F+%D7%91%D7%A0%D7%99%D7%9E%D7%99%D7%A0%D7%99"


def test_absolute_url_with_request_object():
    req = types.SimpleNamespace(base_url="http://localhost:8788/")
    result = _absolute_url(req, "/email/viewer?id=abc123")
    assert result == "http://localhost:8788/email/viewer?id=abc123"


def test_render_email_view_page_escapes_metadata_and_includes_body():
    html_page = _render_email_view_page({
        "subject": "<Test>",
        "from": "Sender <sender@example.com>",
        "to": "ops@example.com",
        "received": "2025-11-14T09:00:00Z",
        "client": "ACME",
        "html": "<p>Hello world</p>",
        "outlook_link": "https://outlook.office.com/mail/deeplink/123",
    })
    assert "&lt;Test&gt;" in html_page
    assert "Sender &lt;sender@example.com&gt;" in html_page
    assert "<p>Hello world</p>" in html_page
    assert "Open in Outlook" in html_page


def test_bool_from_payload_variants():
    assert _bool_from_payload(None) is True
    assert _bool_from_payload("false") is False
    assert _bool_from_payload("0") is False
    assert _bool_from_payload("YES") is True
    assert _bool_from_payload(0) is False
    assert _bool_from_payload(1) is True
