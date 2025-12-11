# This file contains the missing email functions to be added to main.py

EMAIL_FUNCTIONS = """

# ========== EMAIL HELPER FUNCTIONS (restored) ==========

def search_emails_by_client(client_name: str, since_days: int = 45, top: int = 50):
    """
    Search for emails from/to the client.
    First tries to find client\s email addresses, then searches by those addresses.
