"""Analytics router providing consolidated dashboard KPIs and 30-day cashflow forecasts."""

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.budget import Budget
from app.models.expense import Expense
from app.models.subscription import Subscription
from app.schemas.analytics import AnalyticsSummaryResponse, ForecastResponse
from app.services.finance_service import generate_analytics_summary
from app.services.forecast_service import calculate_30_day_forecast

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(db: Session = Depends(get_db)):
    """Return consolidated financial metrics for the overview dashboard."""
    expenses = db.execute(select(Expense)).scalars().all()
    subscriptions = db.execute(select(Subscription)).scalars().all()
    budgets = db.execute(select(Budget)).scalars().all()

    return generate_analytics_summary(
        expenses=expenses,
        subscriptions=subscriptions,
        budgets=budgets,
        reference_date=date.today(),
    )


@router.get("/forecast", response_model=ForecastResponse)
def get_cashflow_forecast(db: Session = Depends(get_db)):
    """Return detailed 30-day cashflow forecast with daily discretionary and subscription outflows."""
    expenses = db.execute(select(Expense)).scalars().all()
    subscriptions = db.execute(select(Subscription)).scalars().all()

    return calculate_30_day_forecast(
        expenses=expenses,
        subscriptions=subscriptions,
        reference_date=date.today(),
    )
