"""
EISLAW PII Filter

Filters personally identifiable information from logs.
"""

import re
from typing import Any, Dict, Union


# Patterns for PII detection
PII_PATTERNS = {
    # Israeli ID number (9 digits)
    "israeli_id": re.compile(r'\b\d{9}\b'),

    # Email addresses
    "email": re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),

    # Phone numbers (Israeli format)
    "phone": re.compile(r'\b(?:\+972|972|0)[-.\s]?(?:[2-9]\d[-.\s]?\d{7}|5\d[-.\s]?\d{7})\b'),

    # Credit card numbers (basic pattern)
    "credit_card": re.compile(r'\b(?:\d{4}[-.\s]?){3}\d{4}\b'),

    # API keys and tokens (common patterns)
    "api_key": re.compile(r'\b(?:sk-|pk-|api[_-]?key[_-]?)[a-zA-Z0-9]{20,}\b', re.I),

    # Bearer tokens
    "bearer_token": re.compile(r'Bearer\s+[a-zA-Z0-9._-]+', re.I),
}

# Fields that should always be redacted
SENSITIVE_FIELDS = {
    "password", "passwd", "pwd", "secret", "token", "api_key", "apikey",
    "authorization", "auth", "bearer", "credential", "private_key",
    "client_secret", "access_token", "refresh_token", "session_id",
    "credit_card", "card_number", "cvv", "ssn", "social_security",
}

# Fields that might contain PII but shouldn't be fully redacted
PII_FIELDS = {
    "email", "phone", "mobile", "address", "name", "first_name", "last_name",
    "full_name", "client_name", "user_name", "username", "id_number",
}


def redact_pii(value: str, pattern_name: str = None) -> str:
    """
    Redact PII from a string value.

    Args:
        value: The string to redact
        pattern_name: Optional specific pattern to use

    Returns:
        String with PII redacted
    """
    if not isinstance(value, str):
        return value

    result = value

    if pattern_name and pattern_name in PII_PATTERNS:
        patterns = {pattern_name: PII_PATTERNS[pattern_name]}
    else:
        patterns = PII_PATTERNS

    for name, pattern in patterns.items():
        if name == "email":
            # Partially redact email: first char + *** + @domain
            result = pattern.sub(lambda m: mask_email(m.group()), result)
        elif name == "phone":
            # Show last 4 digits
            result = pattern.sub(lambda m: "***-" + m.group()[-4:], result)
        elif name == "israeli_id":
            # Show last 3 digits
            result = pattern.sub(lambda m: "******" + m.group()[-3:], result)
        else:
            # Full redaction
            result = pattern.sub(f"[REDACTED_{name.upper()}]", result)

    return result


def mask_email(email: str) -> str:
    """Mask email address: j***@example.com"""
    if "@" not in email:
        return "[REDACTED_EMAIL]"

    local, domain = email.rsplit("@", 1)
    if len(local) <= 1:
        return f"*@{domain}"
    return f"{local[0]}***@{domain}"


def filter_log_data(data: Any, depth: int = 0, max_depth: int = 10) -> Any:
    """
    Recursively filter PII from log data.

    Args:
        data: The data to filter (dict, list, or primitive)
        depth: Current recursion depth
        max_depth: Maximum recursion depth

    Returns:
        Filtered data with PII redacted
    """
    if depth > max_depth:
        return "[MAX_DEPTH_EXCEEDED]"

    if isinstance(data, dict):
        return filter_dict(data, depth)
    elif isinstance(data, list):
        return [filter_log_data(item, depth + 1, max_depth) for item in data]
    elif isinstance(data, str):
        return redact_pii(data)
    else:
        return data


def filter_dict(d: Dict[str, Any], depth: int = 0) -> Dict[str, Any]:
    """Filter a dictionary, redacting sensitive fields."""
    result = {}

    for key, value in d.items():
        key_lower = key.lower()

        # Fully redact sensitive fields
        if key_lower in SENSITIVE_FIELDS or any(s in key_lower for s in SENSITIVE_FIELDS):
            result[key] = "[REDACTED]"

        # Partially redact PII fields
        elif key_lower in PII_FIELDS or any(p in key_lower for p in PII_FIELDS):
            if isinstance(value, str):
                result[key] = redact_pii(value)
            else:
                result[key] = filter_log_data(value, depth + 1)

        # Recursively filter nested structures
        elif isinstance(value, dict):
            result[key] = filter_dict(value, depth + 1)
        elif isinstance(value, list):
            result[key] = [filter_log_data(item, depth + 1) for item in value]
        elif isinstance(value, str):
            result[key] = redact_pii(value)
        else:
            result[key] = value

    return result


class PIIFilter:
    """
    PII filter that can be integrated with logging.

    Usage:
        pii_filter = PIIFilter()
        safe_data = pii_filter.filter(sensitive_data)
    """

    def __init__(self, enabled: bool = True):
        self.enabled = enabled

    def filter(self, data: Any) -> Any:
        """Filter PII from data."""
        if not self.enabled:
            return data
        return filter_log_data(data)

    def filter_string(self, text: str) -> str:
        """Filter PII from a string."""
        if not self.enabled:
            return text
        return redact_pii(text)


# Default filter instance
pii_filter = PIIFilter()
