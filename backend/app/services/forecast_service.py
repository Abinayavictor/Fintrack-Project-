"""Thirty-day Cashflow Forecast Engine.

Formula:
Projected 30-day total = Scheduled subscription renewals within 30-day window
                       + (historical average daily discretionary spending * 30).

Window Rules:
- Forecast window: 30 calendar days [reference_date, reference_date + 29 days].
- Historical baseline window: 30 preceding calendar days [reference_date - 30 days, reference_date - 1 day].
- All arithmetic performed in Python Decimal with final outputs rounded to 2 decimal places using ROUND_HALF_UP.
- Gracefully handles empty expense histories without division by zero.
"""

from collections import defaultdict
from collections.abc import Sequence
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from app.models.expense import Expense
from app.models.subscription import Subscription, SubscriptionStatus
from app.schemas.analytics import (
    DailyForecastPoint,
    ForecastBreakdown,
    ForecastRenewalEvent,
    ForecastResponse,
)
from app.services.subscription_service import get_next_cycle_date

HISTORICAL_WINDOW_DAYS = 30
FORECAST_WINDOW_DAYS = 30


def calculate_historical_daily_average(
    expenses: Sequence[Expense],
    reference_date: date,
    window_days: int = HISTORICAL_WINDOW_DAYS,
) -> Decimal:
    """Calculate the average daily discretionary spending over the preceding window.

    Window: [reference_date - window_days, reference_date - 1 day].
    Avoids division by zero when no expenses exist.
    """
    if window_days <= 0:
        return Decimal("0.00")

    start_date = reference_date - timedelta(days=window_days)
    end_date = reference_date - timedelta(days=1)

    total_historical = Decimal("0.00")
    for exp in expenses:
        if start_date <= exp.date <= end_date:
            total_historical += exp.amount

    if total_historical <= Decimal("0.00"):
        return Decimal("0.00")

    daily_avg = total_historical / Decimal(window_days)
    return daily_avg.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_30_day_forecast(
    expenses: Sequence[Expense],
    subscriptions: Sequence[Subscription],
    reference_date: date,
) -> ForecastResponse:
    """Generate the complete 30-day cashflow forecast with daily timeline breakdown."""
    forecast_end = reference_date + timedelta(days=FORECAST_WINDOW_DAYS - 1)

    # 1. Calculate historical daily average discretionary spend
    daily_avg_discretionary = calculate_historical_daily_average(
        expenses=expenses,
        reference_date=reference_date,
        window_days=HISTORICAL_WINDOW_DAYS,
    )
    total_projected_discretionary = (daily_avg_discretionary * Decimal(FORECAST_WINDOW_DAYS)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    # 2. Gather scheduled renewals per day within [reference_date, forecast_end]
    renewals_by_date: dict[date, list[ForecastRenewalEvent]] = defaultdict(list)
    total_scheduled_renewals = Decimal("0.00")

    for sub in subscriptions:
        if sub.status != SubscriptionStatus.ACTIVE.value:
            continue

        anchor = sub.original_renewal_day or sub.next_renewal_date.day
        current_renewal = sub.next_renewal_date

        if sub.auto_renew:
            # Advance up to or past reference date if in the past
            while current_renewal < reference_date:
                current_renewal = get_next_cycle_date(current_renewal, sub.billing_cycle, anchor)

            # Record every recurrence inside the 30-day window
            temp_date = current_renewal
            while temp_date <= forecast_end:
                if reference_date <= temp_date <= forecast_end:
                    event = ForecastRenewalEvent(
                        subscription_id=sub.id,
                        service_name=sub.service_name,
                        amount=sub.cost,
                        billing_cycle=sub.billing_cycle,
                    )
                    renewals_by_date[temp_date].append(event)
                    total_scheduled_renewals += sub.cost
                temp_date = get_next_cycle_date(temp_date, sub.billing_cycle, anchor)
        else:
            # Non-renewing subscription charges at most once if within window
            if reference_date <= current_renewal <= forecast_end:
                event = ForecastRenewalEvent(
                    subscription_id=sub.id,
                    service_name=sub.service_name,
                    amount=sub.cost,
                    billing_cycle=sub.billing_cycle,
                )
                renewals_by_date[current_renewal].append(event)
                total_scheduled_renewals += sub.cost

    total_scheduled_renewals = total_scheduled_renewals.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    thirty_day_forecast_total = (total_scheduled_renewals + total_projected_discretionary).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    # 3. Build daily projection timeline
    daily_projections: list[DailyForecastPoint] = []
    running_cumulative = Decimal("0.00")

    for offset in range(FORECAST_WINDOW_DAYS):
        day_date = reference_date + timedelta(days=offset)
        day_renewals = renewals_by_date.get(day_date, [])
        day_renewal_total = sum((r.amount for r in day_renewals), Decimal("0.00")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        day_total = (daily_avg_discretionary + day_renewal_total).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        running_cumulative = (running_cumulative + day_total).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        daily_projections.append(
            DailyForecastPoint(
                date=day_date.isoformat(),
                projected_discretionary=daily_avg_discretionary,
                scheduled_renewals=day_renewal_total,
                daily_total=day_total,
                cumulative_total=running_cumulative,
                renewals=day_renewals,
            )
        )

    breakdown = ForecastBreakdown(
        total_scheduled_renewals=total_scheduled_renewals,
        total_projected_discretionary=total_projected_discretionary,
        historical_daily_average=daily_avg_discretionary,
        historical_period_days=HISTORICAL_WINDOW_DAYS,
        forecast_window_days=FORECAST_WINDOW_DAYS,
    )

    return ForecastResponse(
        reference_date=reference_date.isoformat(),
        thirty_day_forecast_total=thirty_day_forecast_total,
        breakdown=breakdown,
        daily_projections=daily_projections,
    )
