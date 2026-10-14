"""Unit tests for the 30-day Cashflow Forecast Engine."""

from datetime import date
from decimal import Decimal

from app.models.expense import Expense
from app.models.subscription import Subscription, SubscriptionStatus
from app.services.forecast_service import (
    calculate_30_day_forecast,
    calculate_historical_daily_average,
)


def test_forecast_empty_history():
    """Ensure empty transaction and subscription history does not raise DivisionByZero."""
    ref_date = date(2026, 10, 15)
    daily_avg = calculate_historical_daily_average([], ref_date)
    assert daily_avg == Decimal("0.00")

    forecast = calculate_30_day_forecast([], [], ref_date)
    assert forecast.thirty_day_forecast_total == Decimal("0.00")
    assert forecast.breakdown.total_scheduled_renewals == Decimal("0.00")
    assert forecast.breakdown.total_projected_discretionary == Decimal("0.00")
    assert forecast.breakdown.historical_daily_average == Decimal("0.00")
    assert len(forecast.daily_projections) == 30
    assert forecast.daily_projections[-1].cumulative_total == Decimal("0.00")


def test_forecast_historical_daily_average():
    ref_date = date(2026, 10, 15)
    # 3 expenses within the 30-day window [2026-09-15, 2026-10-14]
    # Total spend = 300.00. 300 / 30 = 10.00 daily average
    expenses = [
        Expense(
            id=1,
            title="Groceries 1",
            amount=Decimal("100.00"),
            category="Food",
            date=date(2026, 10, 10),
            payment_method="Credit Card",
        ),
        Expense(
            id=2,
            title="Groceries 2",
            amount=Decimal("150.00"),
            category="Food",
            date=date(2026, 10, 5),
            payment_method="Credit Card",
        ),
        Expense(
            id=3,
            title="Utility",
            amount=Decimal("50.00"),
            category="Utilities",
            date=date(2026, 9, 20),
            payment_method="Debit Card",
        ),
        # Expense outside preceding 30 days (older than 30 days)
        Expense(
            id=4,
            title="Old Expense",
            amount=Decimal("1000.00"),
            category="Housing",
            date=date(2026, 8, 1),
            payment_method="Bank Transfer",
        ),
    ]

    daily_avg = calculate_historical_daily_average(expenses, ref_date)
    assert daily_avg == Decimal("10.00")


def test_forecast_combination_discretionary_and_renewals():
    ref_date = date(2026, 10, 15)
    # Daily discretionary average: $15.00 -> 30-day projected = $450.00
    expenses = [
        Expense(
            id=1,
            title="Food",
            amount=Decimal("450.00"),
            category="Food",
            date=date(2026, 10, 10),
            payment_method="Credit Card",
        )
    ]

    # Subscriptions in the next 30 days:
    # Sub 1: Monthly $20 on Oct 20 (within 30 days) -> 1 charge
    # Sub 2: Weekly $10 on Oct 16 -> will renew on Oct 16, 23, 30, Nov 6, Nov 13 (5 times within 30 days: 15 Oct to 13 Nov)
    subscriptions = [
        Subscription(
            id=1,
            service_name="Monthly Sub",
            cost=Decimal("20.00"),
            billing_cycle="monthly",
            next_renewal_date=date(2026, 10, 20),
            status=SubscriptionStatus.ACTIVE.value,
            auto_renew=True,
        ),
        Subscription(
            id=2,
            service_name="Weekly Sub",
            cost=Decimal("10.00"),
            billing_cycle="weekly",
            next_renewal_date=date(2026, 10, 16),
            status=SubscriptionStatus.ACTIVE.value,
            auto_renew=True,
        ),
    ]

    forecast = calculate_30_day_forecast(expenses, subscriptions, ref_date)

    # Discretionary: 450 / 30 = 15.00 * 30 = 450.00
    assert forecast.breakdown.historical_daily_average == Decimal("15.00")
    assert forecast.breakdown.total_projected_discretionary == Decimal("450.00")

    # Renewals: Monthly $20 once + Weekly $10 (Oct 16, 23, 30, Nov 6, Nov 13) = 5 * 10 = $50. Total = $70.00
    assert forecast.breakdown.total_scheduled_renewals == Decimal("70.00")

    # Total 30-day forecast = 450 + 70 = 520.00
    assert forecast.thirty_day_forecast_total == Decimal("520.00")

    # Cumulative total at end of Day 30 must equal 520.00
    assert forecast.daily_projections[-1].cumulative_total == Decimal("520.00")
