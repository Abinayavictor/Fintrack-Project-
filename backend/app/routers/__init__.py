"""Routers package init."""

from app.routers.analytics import router as analytics_router
from app.routers.auth import router as auth_router
from app.routers.budgets import router as budgets_router
from app.routers.expenses import router as expenses_router
from app.routers.subscriptions import router as subscriptions_router
from app.routers.system import router as system_router

__all__ = [
    "analytics_router",
    "auth_router",
    "budgets_router",
    "expenses_router",
    "subscriptions_router",
    "system_router",
]
