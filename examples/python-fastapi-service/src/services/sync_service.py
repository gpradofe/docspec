"""Sync service -- orchestrates data synchronization."""

import uuid
from datetime import datetime
from docspec_py import (
    doc_module, doc_context, doc_method, doc_flow,
    doc_invariant, doc_performance, doc_monotonic, doc_idempotent,
)
from src.models.sync_result import SyncRequest, SyncResult, SyncStatus


@doc_module(name="sync-engine", description="Core sync engine with pipeline execution")
@doc_context(id="data-sync", name="data-sync")
class SyncService:
    """Orchestrates the data sync pipeline."""

    def __init__(self) -> None:
        self._jobs: dict[str, SyncStatus] = {}
        self._results: dict[str, SyncResult] = {}

    @doc_method(description="Executes the full sync pipeline")
    @doc_flow(id="sync-pipeline", name="sync-pipeline")
    @doc_monotonic(field="records_processed", direction="increasing")
    @doc_idempotent
    async def execute_sync(self, request: SyncRequest) -> SyncResult:
        """
        Execute a full sync pipeline.

        Steps:
        1. Validate configuration
        2. Fetch remote data
        3. Compute diff
        4. Apply changes
        5. Generate report
        """
        job_id = str(uuid.uuid4())
        started_at = datetime.now().isoformat()

        # Track status
        self._jobs[job_id] = SyncStatus(
            job_id=job_id,
            status="running",
            progress=0.0,
            source=request.source,
            target=request.target,
            started_at=started_at,
        )

        # Simulate sync pipeline
        records = self._fetch_remote_data(request.source)
        diff = self._compute_diff(records)
        applied = self._apply_changes(diff, request.dry_run)

        # Build result
        completed_at = datetime.now().isoformat()
        result = SyncResult(
            job_id=job_id,
            status="completed",
            source=request.source,
            target=request.target,
            records_processed=len(records),
            records_created=applied.get("created", 0),
            records_updated=applied.get("updated", 0),
            records_failed=applied.get("failed", 0),
            started_at=started_at,
            completed_at=completed_at,
            duration_ms=100,
        )

        self._results[job_id] = result
        self._jobs[job_id] = SyncStatus(
            job_id=job_id,
            status="completed",
            progress=100.0,
            source=request.source,
            target=request.target,
            started_at=started_at,
        )

        return result

    @doc_method(description="Returns job status or None if not found")
    def get_status(self, job_id: str) -> SyncStatus | None:
        """Get current status of a sync job."""
        return self._jobs.get(job_id)

    @doc_method(description="Lists recent sync jobs with filtering")
    @doc_performance(expected_latency="10ms", bottleneck="in-memory scan")
    def list_jobs(
        self,
        source: str | None = None,
        status: str | None = None,
        limit: int = 20,
    ) -> list[SyncStatus]:
        """List sync jobs with optional filtering."""
        jobs = list(self._jobs.values())
        if source:
            jobs = [j for j in jobs if j.source == source]
        if status:
            jobs = [j for j in jobs if j.status == status]
        return jobs[:limit]

    def _fetch_remote_data(self, source: str) -> list[dict]:
        """Simulate fetching data from remote source."""
        return [{"id": i, "source": source, "data": f"record-{i}"} for i in range(10)]

    def _compute_diff(self, records: list[dict]) -> list[dict]:
        """Compute diff between remote and local data."""
        return records  # Simplified: treat all as new

    def _apply_changes(self, diff: list[dict], dry_run: bool) -> dict[str, int]:
        """Apply changes to local storage."""
        if dry_run:
            return {"created": len(diff), "updated": 0, "failed": 0}
        return {"created": len(diff), "updated": 0, "failed": 0}
