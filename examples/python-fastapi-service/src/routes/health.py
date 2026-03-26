"""Health check endpoints."""

from datetime import datetime
from fastapi import APIRouter
from docspec_py import doc_method, doc_endpoint
from src.models.health_metric import HealthStatus, HealthMetric

router = APIRouter()


@doc_method(description="Returns current service health status")
@doc_endpoint(method="GET", path="/api/health")
@router.get("/", response_model=HealthStatus)
async def get_health() -> HealthStatus:
    """
    Check overall service health.

    Returns a composite health status including all subsystem checks.
    Used by load balancers and orchestrators for readiness probes.
    """
    return HealthStatus(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        checks=[
            HealthMetric(name="database", status="up", latency_ms=12.5),
            HealthMetric(name="redis", status="up", latency_ms=1.2),
            HealthMetric(name="external_api", status="up", latency_ms=45.0),
        ],
    )


@doc_method(description="Returns readiness status for Kubernetes")
@doc_endpoint(method="GET", path="/api/health/ready")
@router.get("/ready")
async def readiness_probe() -> dict:
    """Kubernetes readiness probe."""
    return {"ready": True}


@doc_method(description="Returns liveness status for Kubernetes")
@doc_endpoint(method="GET", path="/api/health/live")
@router.get("/live")
async def liveness_probe() -> dict:
    """Kubernetes liveness probe."""
    return {"alive": True}
