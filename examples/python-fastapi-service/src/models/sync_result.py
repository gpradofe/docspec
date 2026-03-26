"""Sync-related data models."""

from datetime import datetime
from pydantic import BaseModel, Field
from docspec_py import doc_module, doc_invariant


@doc_module(name="SyncModels", description="Sync-related data models")
class SyncRequest(BaseModel):
    """Request payload for triggering a sync job."""

    source: str = Field(..., description="Source system identifier")
    target: str = Field(..., description="Target system identifier")
    full_sync: bool = Field(default=False, description="Force full sync instead of incremental")
    dry_run: bool = Field(default=False, description="Preview changes without applying")
    filters: dict[str, str] = Field(default_factory=dict, description="Key-value filters for data selection")


@doc_module(name="SyncModels", description="Sync-related data models")
@doc_invariant(rules=["records_processed >= 0", "records_failed >= 0", "records_failed <= records_processed"])
class SyncResult(BaseModel):
    """Result of a completed sync operation."""

    job_id: str = Field(..., description="Unique job identifier")
    status: str = Field(..., description="Job status: pending, running, completed, failed")
    source: str = Field(..., description="Source system")
    target: str = Field(..., description="Target system")
    records_processed: int = Field(default=0, description="Number of records processed")
    records_created: int = Field(default=0, description="Number of new records created")
    records_updated: int = Field(default=0, description="Number of records updated")
    records_failed: int = Field(default=0, description="Number of records that failed to sync")
    started_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    completed_at: str | None = Field(default=None, description="Completion timestamp")
    duration_ms: int | None = Field(default=None, description="Duration in milliseconds")
    errors: list[str] = Field(default_factory=list, description="Error messages")


@doc_module(name="SyncModels", description="Sync-related data models")
class SyncStatus(BaseModel):
    """Current status of a sync job."""

    job_id: str
    status: str  # pending, running, completed, failed
    progress: float = Field(default=0.0, description="Progress percentage 0-100")
    source: str
    target: str
    started_at: str
    message: str | None = None
