"""Health monitoring data models."""

from pydantic import BaseModel, Field
from docspec_py import doc_module


@doc_module(name="HealthModels", description="Health monitoring data models")
class HealthMetric(BaseModel):
    """Individual health check result."""

    name: str = Field(..., description="Subsystem name")
    status: str = Field(..., description="Status: up, down, degraded")
    latency_ms: float = Field(default=0.0, description="Check latency in milliseconds")
    details: dict[str, str] = Field(default_factory=dict, description="Additional details")


@doc_module(name="HealthModels", description="Health monitoring data models")
class HealthStatus(BaseModel):
    """Composite health status of the service."""

    status: str = Field(..., description="Overall status: healthy, degraded, unhealthy")
    timestamp: str = Field(..., description="ISO 8601 timestamp")
    checks: list[HealthMetric] = Field(default_factory=list, description="Individual check results")
