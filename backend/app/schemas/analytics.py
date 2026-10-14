"""Pydantic schemas for Analytics, Cashflow Forecast, and Summary."""

from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.budget import BudgetUtilizationResponse


class CategorySpendingItem(BaseModel):
    category: str
    total_amount: Decimal
    percentage_of_total: Decimal
    transaction_count: int


class ForecastRenewalEvent(BaseModel):
    subscription_id: int
    service_name: str
    amount: Decimal
    billing_cycle: str


class DailyForecastPoint(BaseModel):
    date: str  # YYYY-MM-DD
    projected_discretionary: Decimal
    scheduled_renewals: Decimal
    daily_total: Decimal
    cumulative_total: Decimal
    renewals: list[ForecastRenewalEvent] = Field(default_factory=list)


class ForecastBreakdown(BaseModel):
    total_scheduled_renewals: Decimal
    total_projected_discretionary: Decimal
    historical_daily_average: Decimal
    historical_period_days: int = 30
    forecast_window_days: int = 30


class ForecastResponse(BaseModel):
    reference_date: str
    thirty_day_forecast_total: Decimal
    breakdown: ForecastBreakdown
    daily_projections: list[DailyForecastPoint]


class AnalyticsSummaryResponse(BaseModel):
    monthly_recurring_burn_rate: Decimal
    month_to_date_spend: Decimal
    upcoming_7_day_renewals: Decimal
    top_spend_category: str | None = None
    thirty_day_forecast_total: Decimal
    forecast_breakdown: ForecastBreakdown
    category_spending: list[CategorySpendingItem]
    budget_utilizations: list[BudgetUtilizationResponse]
