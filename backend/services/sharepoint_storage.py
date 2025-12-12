"""
SharePoint storage helper for EISLAW email files.

Uses existing Microsoft Graph API to upload/download emails to SharePoint.
Manages dual-write during transition period: emails saved to both SharePoint and local disk.
"""

import logging
import asyncio
from typing import Optional
import httpx
from pathlib import Path

logger = logging.getLogger(__name__)

# Will be initialized from main.py
graph_credentials = None


def init_sharepoint_service(credentials: dict):
    """Initialize SharePoint service with Graph API credentials."""
    global graph_credentials
    graph_credentials = credentials
    logger.info("SharePoint storage initialized")


async def get_graph_token() -> Optional[str]:
    """Get Microsoft Graph access token using MSAL."""
    if not graph_credentials:
        return None

    try:
        import msal

        app = msal.ConfidentialClientApplication(
            graph_credentials["client_id"],
            authority=f"https://login.microsoftonline.com/{graph_credentials['tenant_id']}",
            client_credential=graph_credentials["client_secret"],
        )

        # Run in executor to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
        )

        if "access_token" in result:
            return result["access_token"]
        else:
            logger.error(f"Failed to get Graph token: {result.get('error_description')}")
            return None
    except Exception as e:
        logger.error(f"Error getting Graph token: {str(e)}")
        return None


async def upload_email_to_sharepoint(
    client_name: str,
    message_id: str,
    file_content: bytes,
    file_type: str = "eml"
) -> Optional[str]:
    """
    Upload email file to SharePoint.

    Args:
        client_name: Client folder name (e.g., "Unassigned", "Client Name")
        message_id: Unique message ID
        file_content: File content as bytes
        file_type: "eml" or "json"

    Returns:
        str: SharePoint file URL, or None if upload fails
    """
    token = await get_graph_token()
    if not token:
        logger.error("Cannot upload to SharePoint - no access token")
        return None

    # SharePoint site: eislaw.sharepoint.com/sites/EISLAWTEAM
    site_path = "/sites/EISLAWTEAM"

    # Path: לקוחות משרד/{client_name}/Emails/{message_id}.eml
    folder_path = f"לקוחות משרד/{client_name}/Emails"
    filename = f"{message_id}.{file_type}"

    try:
        # Step 1: Ensure Emails folder exists and upload file
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get drive ID
            drive_url = f"https://graph.microsoft.com/v1.0{site_path}/drive"
            drive_resp = await client.get(
                drive_url,
                headers={"Authorization": f"Bearer {token}"}
            )
            drive_resp.raise_for_status()
            drive_id = drive_resp.json()["id"]

            # Step 2: Upload file to folder (creates folder if it doesn't exist)
            # Microsoft Graph automatically creates intermediate folders
            upload_url = (
                f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/"
                f"{folder_path}/{filename}:/content"
            )

            upload_resp = await client.put(
                upload_url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/octet-stream"
                },
                content=file_content
            )
            upload_resp.raise_for_status()

            file_data = upload_resp.json()
            web_url = file_data.get("webUrl")

            logger.info(f"Uploaded {file_type} to SharePoint: {folder_path}/{filename}")
            return web_url

    except Exception as e:
        logger.error(f"Failed to upload to SharePoint: {str(e)}")
        return None


async def download_email_from_sharepoint(
    client_name: str,
    message_id: str,
    file_type: str = "eml"
) -> Optional[bytes]:
    """
    Download email file from SharePoint.

    Args:
        client_name: Client folder name
        message_id: Unique message ID
        file_type: "eml" or "json"

    Returns:
        bytes: File content, or None if download fails
    """
    token = await get_graph_token()
    if not token:
        logger.error("Cannot download from SharePoint - no access token")
        return None

    site_path = "/sites/EISLAWTEAM"
    folder_path = f"לקוחות משרד/{client_name}/Emails"
    filename = f"{message_id}.{file_type}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get drive ID
            drive_url = f"https://graph.microsoft.com/v1.0{site_path}/drive"
            drive_resp = await client.get(
                drive_url,
                headers={"Authorization": f"Bearer {token}"}
            )
            drive_resp.raise_for_status()
            drive_id = drive_resp.json()["id"]

            # Download file
            download_url = (
                f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root:/"
                f"{folder_path}/{filename}:/content"
            )

            download_resp = await client.get(
                download_url,
                headers={"Authorization": f"Bearer {token}"}
            )
            download_resp.raise_for_status()

            logger.info(f"Downloaded {file_type} from SharePoint: {folder_path}/{filename}")
            return download_resp.content

    except Exception as e:
        logger.error(f"Failed to download from SharePoint: {str(e)}")
        return None


async def get_sharepoint_sharing_link(sharepoint_url: str, type: str = "view") -> Optional[str]:
    """
    Generate a sharing link for a SharePoint file.

    Args:
        sharepoint_url: SharePoint web URL
        type: "view" for read-only, "edit" for edit access

    Returns:
        str: Sharing link, or None if fails
    """
    token = await get_graph_token()
    if not token:
        return None

    try:
        # For now, return the web URL directly (requires SharePoint auth)
        # Files in client folders inherit permissions from parent folder
        # Users access via their regular SharePoint credentials
        return sharepoint_url

    except Exception as e:
        logger.error(f"Failed to create sharing link: {str(e)}")
        return None


def is_sharepoint_enabled() -> bool:
    """Check if SharePoint storage is configured."""
    return graph_credentials is not None and graph_credentials.get("client_id")
