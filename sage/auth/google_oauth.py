"""
Google OAuth2 flow for Workspace API access.

Usage:
    creds = get_credentials()          # loads from token.json or prompts browser flow
    service = build_service("calendar", "v3", creds)
"""

import json
import os
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from sage.config.settings import get_settings

settings = get_settings()
WORKSPACE_AUTH_ERROR = (
    "Workspace OAuth is not configured for this deployed environment. "
    "Provide a valid token.json or switch the app to a non-interactive auth flow."
)


def get_credentials() -> Credentials:
    """Load credentials from token file, refreshing or re-authorising as needed."""
    creds: Credentials | None = None
    token_path = Path(settings.google_token_file)

    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), settings.google_scopes)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            creds = _run_oauth_flow()
        _save_token(creds, token_path)

    return creds


def _run_oauth_flow() -> Credentials:
    """Launch the browser-based OAuth consent flow using the downloaded credentials file."""
    if settings.is_production:
        raise RuntimeError(WORKSPACE_AUTH_ERROR)

    creds_path = Path(settings.google_credentials_file)
    if creds_path.exists():
        # Preferred: load directly from the downloaded client_secret.json
        flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), settings.google_scopes)
    else:
        # Fallback: build config from individual env vars
        client_config = {
            "installed": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uris": [settings.google_redirect_uri],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        }
        flow = InstalledAppFlow.from_client_config(client_config, settings.google_scopes)
    return flow.run_local_server(port=0)


def _save_token(creds: Credentials, path: Path) -> None:
    path.write_text(creds.to_json())


def build_service(service_name: str, version: str, credentials: Credentials | None = None):
    """Build a Google API service client."""
    if credentials is None:
        credentials = get_credentials()
    return build(service_name, version, credentials=credentials)


# Convenience accessors
def calendar_service():
    return build_service("calendar", "v3")


def tasks_service():
    return build_service("tasks", "v1")


def gmail_service():
    return build_service("gmail", "v1")


def drive_service():
    return build_service("drive", "v3")


def docs_service():
    return build_service("docs", "v1")
