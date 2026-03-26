"""Application configuration."""

from pydantic import BaseModel, Field
from docspec_py import doc_module


@doc_module(name="configuration", description="Service configuration management")
class DatabaseConfig(BaseModel):
    """Database connection settings."""

    host: str = Field(default="localhost", description="Database host")
    port: int = Field(default=5432, description="Database port")
    name: str = Field(default="sync_db", description="Database name")
    pool_size: int = Field(default=10, description="Connection pool size")


@doc_module(name="configuration", description="Service configuration management")
class SyncConfig(BaseModel):
    """Sync engine settings."""

    max_retries: int = Field(default=3, description="Max retry attempts per record")
    batch_size: int = Field(default=100, description="Records per batch")
    timeout_seconds: int = Field(default=300, description="Sync timeout in seconds")
    enable_dry_run: bool = Field(default=False, description="Enable dry-run mode by default")


@doc_module(name="configuration", description="Service configuration management")
class AppConfig(BaseModel):
    """Root application configuration."""

    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    sync: SyncConfig = Field(default_factory=SyncConfig)
    log_level: str = Field(default="INFO", description="Logging level")
