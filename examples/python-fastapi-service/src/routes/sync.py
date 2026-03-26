"""Synchronization endpoints."""

from datetime import datetime
from fastapi import APIRouter, HTTPException, BackgroundTasks
from docspec_py import doc_method, doc_endpoint, doc_error, doc_event, doc_invariant, doc_performance
from src.models.sync_result import SyncRequest, SyncResult, SyncStatus
from src.services.sync_service import SyncService

router = APIRouter()
sync_service = SyncService()


@doc_method(description="Trigger a full data synchronization")
@doc_endpoint(method="POST", path="/api/sync")
@doc_error(code="SYNC_001", description="Invalid sync configuration")
@doc_error(code="SYNC_002", description="Remote source unreachable")
@doc_event(name="sync.started", description="Fired when a sync job starts")
@doc_event(name="sync.completed", description="Fired when a sync job completes")
@doc_invariant(rules=["request.source NOT_BLANK", "request.target NOT_BLANK"])
@doc_performance(expected_latency="variable", bottleneck="remote data fetch")
@router.post("/", response_model=SyncResult)
async def trigger_sync(
    request: SyncRequest,
    background_tasks: BackgroundTasks,
) -> SyncResult:
    """
    Trigger a data synchronization job.

    Validates the sync configuration, then runs the sync pipeline:
    1. Validate configuration and credentials
    2. Fetch data from remote source
    3. Compute diff against local data
    4. Apply changes atomically
    5. Generate sync report
    """
    if not request.source or not request.target:
        raise HTTPException(status_code=400, detail="Source and target are required")

    result = await sync_service.execute_sync(request)
    return result


@doc_method(description="Get status of a running or completed sync job")
@doc_endpoint(method="GET", path="/api/sync/{job_id}")
@doc_error(code="SYNC_003", description="Job not found")
@router.get("/{job_id}", response_model=SyncStatus)
async def get_sync_status(job_id: str) -> SyncStatus:
    """Get the current status of a sync job."""
    status = sync_service.get_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail=f"Sync job {job_id} not found")
    return status


@doc_method(description="List recent sync jobs with optional filtering")
@doc_endpoint(method="GET", path="/api/sync")
@doc_performance(expected_latency="10ms", bottleneck="in-memory scan")
@router.get("/", response_model=list[SyncStatus])
async def list_sync_jobs(
    source: str | None = None,
    status: str | None = None,
    limit: int = 20,
) -> list[SyncStatus]:
    """List recent sync jobs with optional filtering by source and status."""
    return sync_service.list_jobs(source=source, status=status, limit=limit)
