"""FinTrack FastAPI Application Entry Point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.database import init_db
from app.routers import (
    analytics_router,
    budgets_router,
    expenses_router,
    subscriptions_router,
    system_router,
)
from app.utils.exceptions import register_exception_handlers


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ensure database tables exist on application startup."""
    init_db()
    yield


app = FastAPI(
    title="FinTrack — Personal Finance & Subscription Intelligence",
    description="Production-grade financial analytics and subscription intelligence backend API.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register consistent error envelopes
register_exception_handlers(app)

# Register API Routers
app.include_router(expenses_router)
app.include_router(subscriptions_router)
app.include_router(budgets_router)
app.include_router(analytics_router)
app.include_router(system_router)


@app.get("/", include_in_schema=False)
def root_redirect():
    """Redirect root path to interactive OpenAPI documentation."""
    return RedirectResponse(url="/docs")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
