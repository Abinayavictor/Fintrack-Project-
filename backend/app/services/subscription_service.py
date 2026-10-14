"""Subscription service for financial normalization and calendar arithmetic.

Rules:
- Weekly: cost * (52 / 12)
- Monthly: cost * 1
- Quarterly: cost / 3
- Annual: cost / 12
- Decimal arithmetic with ROUND_HALF_UP to 2 decimal places at final monetary output.
- Anchor-day renewal arithmetic to preserve original renewal days (e.g. Jan 31 -> Feb 28 -> Mar 31).
"""

import calendar
from collections.abc import Sequence
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal

from app.models.subscription import BillingCycle, Subscription, SubscriptionStatus

# Exact normalization multipliers specified in technical assessment
WEEKS_PER_YEAR = Decimal(52)
MONTHS_PER_YEAR = Decimal(12)
WEEKLY_MULTIPLIER = WEEKS_PER_YEAR / MONTHS_PER_YEAR  # 52 / 12
QUARTERLY_DIVISOR = Decimal(3)
ANNUAL_DIVISOR = Decimal(12)


def normalize_monthly_cost(cost: Decimal, billing_cycle: BillingCycle | str) -> Decimal:
    """Normalize subscription cost to an exact monthly recurring amount.

    Only active subscriptions should be passed into totals.
    Uses Python Decimal with ROUND_HALF_UP rounding to 2 decimal places.
    """
    if cost <= Decimal("0.00"):
        return Decimal("0.00")

    cycle = billing_cycle.value if isinstance(billing_cycle, BillingCycle) else billing_cycle.lower()

    if cycle == BillingCycle.WEEKLY.value:
        normalized = cost * WEEKLY_MULTIPLIER
    elif cycle == BillingCycle.MONTHLY.value:
        normalized = cost * Decimal(1)
    elif cycle == BillingCycle.QUARTERLY.value:
        normalized = cost / QUARTERLY_DIVISOR
    elif cycle == BillingCycle.ANNUAL.value:
        normalized = cost / ANNUAL_DIVISOR
    else:
        raise ValueError(f"Unsupported billing cycle: {billing_cycle}")

    return normalized.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_monthly_burn_rate(subscriptions: Sequence[Subscription]) -> Decimal:
    """Calculate the total monthly recurring baseline across all ACTIVE subscriptions.

    Paused and cancelled subscriptions are strictly excluded.
    """
    total = Decimal("0.00")
    for sub in subscriptions:
        if sub.status == SubscriptionStatus.ACTIVE.value:
            total += normalize_monthly_cost(sub.cost, sub.billing_cycle)
    return total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def get_days_in_month(year: int, month: int) -> int:
    """Return the number of days in a given year and month (handles leap years)."""
    return calendar.monthrange(year, month)[1]


def compute_next_month_date(current_date: date, anchor_day: int) -> date:
    """Compute the next monthly renewal date while preserving the original anchor day.

    For example, Jan 31 with anchor 31 -> Feb 28 (or 29) -> Mar 31.
    """
    year = current_date.year
    month = current_date.month + 1
    if month > 12:
        month = 1
        year += 1

    max_days = get_days_in_month(year, month)
    target_day = min(anchor_day, max_days)
    return date(year, month, target_day)


def compute_next_quarter_date(current_date: date, anchor_day: int) -> date:
    """Compute the next quarterly renewal date (3 months) preserving the original anchor day."""
    year = current_date.year
    month = current_date.month + 3
    while month > 12:
        month -= 12
        year += 1

    max_days = get_days_in_month(year, month)
    target_day = min(anchor_day, max_days)
    return date(year, month, target_day)


def compute_next_annual_date(current_date: date, anchor_day: int) -> date:
    """Compute the next annual renewal date (1 year) preserving the original anchor day.

    Handles Feb 29 leap-year edge cases smoothly (Feb 29 -> Feb 28 in non-leap year).
    """
    year = current_date.year + 1
    month = current_date.month
    max_days = get_days_in_month(year, month)
    target_day = min(anchor_day, max_days)
    return date(year, month, target_day)


def get_next_cycle_date(current_date: date, billing_cycle: BillingCycle | str, anchor_day: int | None = None) -> date:
    """Calculate the next renewal date based on billing cycle and anchor day."""
    cycle = billing_cycle.value if isinstance(billing_cycle, BillingCycle) else billing_cycle.lower()
    effective_anchor = anchor_day if anchor_day is not None else current_date.day

    if cycle == BillingCycle.WEEKLY.value:
        return current_date + timedelta(days=7)
    elif cycle == BillingCycle.MONTHLY.value:
        return compute_next_month_date(current_date, effective_anchor)
    elif cycle == BillingCycle.QUARTERLY.value:
        return compute_next_quarter_date(current_date, effective_anchor)
    elif cycle == BillingCycle.ANNUAL.value:
        return compute_next_annual_date(current_date, effective_anchor)
    else:
        raise ValueError(f"Unsupported billing cycle: {billing_cycle}")


def compute_default_renewal_date(start_date: date, billing_cycle: BillingCycle | str) -> date:
    """Compute the initial next_renewal_date when not explicitly provided by user."""
    return get_next_cycle_date(start_date, billing_cycle, anchor_day=start_date.day)


def get_upcoming_renewals_window(
    subscriptions: Sequence[Subscription],
    reference_date: date,
    window_days: int = 7,
) -> tuple[Decimal, list[tuple[Subscription, date]]]:
    """Calculate total charges and list eligible renewals within the upcoming window.

    - Excludes paused and cancelled subscriptions.
    - Window is [reference_date, reference_date + timedelta(days=window_days)].
    - For auto_renew=False, only includes if next_renewal_date is within window.
    - Returns (total_cost, [(subscription, renewal_date)]).
    """
    window_end = reference_date + timedelta(days=window_days)
    total_charges = Decimal("0.00")
    eligible_events: list[tuple[Subscription, date]] = []

    for sub in subscriptions:
        if sub.status != SubscriptionStatus.ACTIVE.value:
            continue

        anchor = sub.original_renewal_day or sub.next_renewal_date.day
        current_renewal = sub.next_renewal_date

        if sub.auto_renew:
            # Advance if in the past
            while current_renewal < reference_date:
                current_renewal = get_next_cycle_date(current_renewal, sub.billing_cycle, anchor)

            # Check all renewal occurrences within window
            temp_date = current_renewal
            while temp_date <= window_end:
                if reference_date <= temp_date <= window_end:
                    total_charges += sub.cost
                    eligible_events.append((sub, temp_date))
                temp_date = get_next_cycle_date(temp_date, sub.billing_cycle, anchor)
        else:
            # Non-renewing subscription: only charge once on next_renewal_date if in window
            if reference_date <= current_renewal <= window_end:
                total_charges += sub.cost
                eligible_events.append((sub, current_renewal))

    return total_charges.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), eligible_events
