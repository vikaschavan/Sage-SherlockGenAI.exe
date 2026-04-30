from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Google AI
    google_api_key: str = ""
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"
    gemini_model: str = "gemini-2.5-pro"
    ai_request_timeout_seconds: int = 45
    google_api_retry_attempts: int = 2
    google_api_retry_delay_seconds: float = 1.0

    # Google OAuth (Workspace APIs)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost"
    google_token_file: str = "token.json"
    google_credentials_file: str = "auth/client_secret.json"
    google_scopes: list[str] = [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/tasks",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/chat.messages",
    ]

    # AlloyDB / PostgreSQL
    alloydb_host: str = "localhost"
    alloydb_port: int = 5432
    alloydb_database: str = "sage"
    alloydb_user: str = "sage_user"
    alloydb_password: str = ""

    # Fallback: SQLite for local dev without AlloyDB
    use_sqlite: bool = True
    sqlite_path: str = "sage_local.db"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_secret_key: str = "change-me-in-production"
    demo_mode: bool = True
    demo_use_live_enrichment: bool = False

    # Environment
    env: str = "local"

    @property
    def database_url(self) -> str:
        if self.use_sqlite:
            return f"sqlite+aiosqlite:///{self.sqlite_path}"
        return (
            f"postgresql+asyncpg://{self.alloydb_user}:{self.alloydb_password}"
            f"@{self.alloydb_host}:{self.alloydb_port}/{self.alloydb_database}"
        )

    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
