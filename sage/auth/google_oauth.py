"""
Google OAuth2 flow for Workspace API access.

Usage:
    creds = get_credentials()          # loads from token.json or prompts browser flow
    service = build_service("calendar", "v3", creds)
"""

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
TOKEN_CACHE_PATH = Path("/tmp/sage-google-token.json")


def get_credentials() -> Credentials:
    """Load credentials from token file, refreshing or re-authorising as needed."""
    creds: Credentials | None = None
    token_path = _get_token_load_path()

    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), settings.google_scopes)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            creds = _run_oauth_flow()
        _save_token(creds, token_path)

    return creds


def _get_token_load_path() -> Path:
    """Prefer a writable runtime cache, falling back to the configured token file."""
    configured_path = Path(settings.google_token_file)
    if TOKEN_CACHE_PATH.exists():
        return TOKEN_CACHE_PATH
    return configured_path


def _get_token_save_path(configured_path: Path) -> Path:
    """Avoid rewriting read-only secret mounts in Cloud Run."""
    if _is_writable_path(configured_path):
        return configured_path
    return TOKEN_CACHE_PATH


def _is_writable_path(path: Path) -> bool:
    if path.exists():
        return os.access(path, os.W_OK)
    parent = path.parent if str(path.parent) else Path(".")
    return parent.exists() and os.access(parent, os.W_OK)


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
    save_path = _get_token_save_path(path)
    save_path.parent.mkdir(parents=True, exist_ok=True)
    save_path.write_text(creds.to_json())


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
