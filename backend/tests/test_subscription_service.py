"""Unit tests for subscription financial normalization, calendar calculations, and renewals."""

from datetime import date
from decimal import Decimal

from app.models.subscription import BillingCycle, Subscription, SubscriptionStatus
from app.services.subscription_service import (
    calculate_monthly_burn_rate,
    compute_next_annual_date,
    compute_next_month_date,
    get_days_in_month,
    get_upcoming_renewals_window,
    normalize_monthly_cost,
)


def test_normalize_weekly_subscription():
    # Weekly formula: cost * (52 / 12)
    # $12.00 * (52 / 12) = $52.00
    assert normalize_monthly_cost(Decimal("12.00"), BillingCycle.WEEKLY) == Decimal("52.00")

    # $10.00 * (52 / 12) = 43.3333... -> 43.33
    assert normalize_monthly_cost(Decimal("10.00"), BillingCycle.WEEKLY) == Decimal("43.33")


def test_normalize_monthly_subscription():
    # Monthly formula: cost * 1
    assert normalize_monthly_cost(Decimal("19.99"), BillingCycle.MONTHLY) == Decimal("19.99")
    assert normalize_monthly_cost(Decimal("100.00"), "monthly") == Decimal("100.00")


def test_normalize_quarterly_subscription():
    # Quarterly formula: cost / 3
    # $30.00 / 3 = $10.00
    assert normalize_monthly_cost(Decimal("30.00"), BillingCycle.QUARTERLY) == Decimal("10.00")
    # $10.00 / 3 = 3.333... -> 3.33
    assert normalize_monthly_cost(Decimal("10.00"), BillingCycle.QUARTERLY) == Decimal("3.33")


def test_normalize_annual_subscription():
    # Annual formula: cost / 12
    # $120.00 / 12 = $10.00
    assert normalize_monthly_cost(Decimal("120.00"), BillingCycle.ANNUAL) == Decimal("10.00")
    # $99.99 / 12 = 8.3325 -> 8.33
    assert normalize_monthly_cost(Decimal("99.99"), BillingCycle.ANNUAL) == Decimal("8.33")


def test_calculate_monthly_burn_rate_excludes_paused_and_cancelled():
    subs = [
        Subscription(
            id=1,
            service_name="Active Monthly",
            cost=Decimal("20.00"),
            billing_cycle=BillingCycle.MONTHLY.value,
            next_renewal_date=date(2026, 11, 1),
            status=SubscriptionStatus.ACTIVE.value,
            auto_renew=True,
        ),
        Subscription(
            id=2,
            service_name="Active Annual",
            cost=Decimal("120.00"),
            billing_cycle=BillingCycle.ANNUAL.value,
            next_renewal_date=date(2026, 12, 1),
            status=SubscriptionStatus.ACTIVE.value,
            auto_renew=True,
        ),
        Subscription(
            id=3,
            service_name="Paused Sub",
            cost=Decimal("50.00"),
            billing_cycle=BillingCycle.MONTHLY.value,
            next_renewal_date=date(2026, 11, 1),
            status=SubscriptionStatus.PAUSED.value,
            auto_renew=False,
        ),
        Subscription(
            id=4,
            service_name="Cancelled Sub",
            cost=Decimal("100.00"),
            billing_cycle=BillingCycle.MONTHLY.value,
            next_renewal_date=date(2026, 11, 1),
            status=SubscriptionStatus.CANCELLED.value,
            auto_renew=False,
        ),
    ]

    # Active Monthly: 20.00, Active Annual: 120/12 = 10.00. Total = 30.00. Paused & Cancelled excluded.
    burn_rate = calculate_monthly_burn_rate(subs)
    assert burn_rate == Decimal("30.00")


def test_calculate_monthly_burn_rate_empty_list():
    assert calculate_monthly_burn_rate([]) == Decimal("0.00")


def test_month_end_preservation_jan_to_feb_to_march():
    """Jan 31 -> Feb 28 (non-leap year 2025) -> Mar 31 preserving original renewal day 31."""
    jan_31 = date(2025, 1, 31)
    anchor_day = 31

    # Step 1: Jan 31 -> Feb 28 in 2025 (non-leap)
    feb_date = compute_next_month_date(jan_31, anchor_day)
    assert feb_date == date(2025, 2, 28)

    # Step 2: Feb 28 -> Mar 31 (preserves anchor 31 rather than staying stuck on 28th!)
    mar_date = compute_next_month_date(feb_date, anchor_day)
    assert mar_date == date(2025, 3, 31)


def test_leap_year_february_transition():
    """Jan 31 -> Feb 29 in a leap year (2024 or 2028)."""
    assert get_days_in_month(2024, 2) == 29
    assert get_days_in_month(2025, 2) == 28

    jan_31_leap = date(2024, 1, 31)
    feb_leap = compute_next_month_date(jan_31_leap, anchor_day=31)
    assert feb_leap == date(2024, 2, 29)

    mar_leap = compute_next_month_date(feb_leap, anchor_day=31)
    assert mar_leap == date(2024, 3, 31)


def test_annual_leap_year_transition():
    """Leap year Feb 29 -> Feb 28 in non-leap next year."""
    feb_29_2024 = date(2024, 2, 29)
    next_annual = compute_next_annual_date(feb_29_2024, anchor_day=29)
    assert next_annual == date(2025, 2, 28)


def test_upcoming_renewals_7_day_window():
    ref_date = date(2026, 10, 10)
    subs = [
        # In window (day 12 is +2 days)
        Subscription(
            id=1,
            service_name="Netflix",
            cost=Decimal("15.00"),
            billing_cycle="monthly",
            next_renewal_date=date(2026, 10, 12),
            status=SubscriptionStatus.ACTIVE.value,
            auto_renew=True,
        ),
        # In window (day 17 is +7 days)
        Subscription(
            id=2,
            service_name="Spotify",
            cost=Decimal("10.00"),
            billing_cycle="monthly",
            next_renewal_date=date(2026, 10, 17),
            status=SubscriptionStatus.ACTIVE.value,
            auto_renew=True,
        ),
        # Outside window (day 18 is +8 days)
        Subscription(
            id=3,
            service_name="Gym",
            cost=Decimal("50.00"),
            billing_cycle="monthly",
            next_renewal_date=date(2026, 10, 18),
            status=SubscriptionStatus.ACTIVE.value,
            auto_renew=True,
        ),
        # Paused (day 11 is +1 day, but paused!)
        Subscription(
            id=4,
            service_name="Paused Service",
            cost=Decimal("20.00"),
            billing_cycle="monthly",
            next_renewal_date=date(2026, 10, 11),
            status=SubscriptionStatus.PAUSED.value,
            auto_renew=True,
        ),
    ]

    total, events = get_upcoming_renewals_window(subs, ref_date, window_days=7)
    assert total == Decimal("25.00")
    assert len(events) == 2
    assert {e[0].service_name for e in events} == {"Netflix", "Spotify"}
