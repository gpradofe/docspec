"""Application entry point for the Data Sync Service."""

from fastapi import FastAPI
from docspec_py import doc_module
from src.routes.health import router as health_router
from src.routes.sync import router as sync_router

app = FastAPI(
    title="Data Sync Service",
    description="Manages data synchronization between external sources and local storage",
    version="1.0.0",
)

app.include_router(health_router, prefix="/api/health", tags=["health"])
app.include_router(sync_router, prefix="/api/sync", tags=["sync"])


@doc_module(name="sync-service", description="Manages data synchronization between external sources")
class SyncServiceApp:
    """Application wrapper for DocSpec module annotation."""
    pass


@app.get("/")
async def root():
    """Root endpoint returning service info."""
    return {"service": "data-sync-service", "version": "1.0.0", "status": "running"}
