"""Finance service orchestrating general ledger calculations and dashboard summaries."""

from collections.abc import Sequence
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from app.models.budget import Budget
from app.models.expense import Expense, ExpenseCategory
from app.models.subscription import Subscription
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    CategorySpendingItem,
)
from app.services.budget_service import get_budget_utilization_list
from app.services.forecast_service import calculate_30_day_forecast
from app.services.subscription_service import (
    calculate_monthly_burn_rate,
    get_upcoming_renewals_window,
)


def calculate_month_to_date_spending(expenses: Sequence[Expense], reference_date: date) -> Decimal:
    """Calculate the total expenses from the first day of current calendar month through reference_date.

    Explicitly excludes previous-month and future transactions.
    """
    month_start = reference_date.replace(day=1)
    mtd_total = Decimal("0.00")

    for exp in expenses:
        if month_start <= exp.date <= reference_date:
            mtd_total += exp.amount

    return mtd_total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_category_spending_breakdown(
    expenses: Sequence[Expense],
    reference_date: date,
    month_only: bool = True,
) -> tuple[list[CategorySpendingItem], str | None]:
    """Calculate spending breakdown by category and identify the top spending category."""
    month_start = reference_date.replace(day=1) if month_only else None

    category_totals: dict[str, Decimal] = {c.value: Decimal("0.00") for c in ExpenseCategory}
    category_counts: dict[str, int] = {c.value: 0 for c in ExpenseCategory}
    overall_total = Decimal("0.00")

    for exp in expenses:
        if month_only and (exp.date < month_start or exp.date > reference_date):
            continue
        category_totals[exp.category] = category_totals.get(exp.category, Decimal("0.00")) + exp.amount
        category_counts[exp.category] = category_counts.get(exp.category, 0) + 1
        overall_total += exp.amount

    items: list[CategorySpendingItem] = []
    top_category: str | None = None
    max_amount = Decimal("0.00")

    for cat_name, cat_total in category_totals.items():
        if cat_total > max_amount:
            max_amount = cat_total
            top_category = cat_name

        percentage = (
            ((cat_total / overall_total) * Decimal("100.00")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if overall_total > Decimal("0.00")
            else Decimal("0.00")
        )

        items.append(
            CategorySpendingItem(
                category=cat_name,
                total_amount=cat_total.quantize(Decimal("0.01")),
                percentage_of_total=percentage,
                transaction_count=category_counts.get(cat_name, 0),
            )
        )

    # Sort descending by total_amount
    items.sort(key=lambda x: x.total_amount, reverse=True)

    if max_amount == Decimal("0.00"):
        top_category = None

    return items, top_category


def generate_analytics_summary(
    expenses: Sequence[Expense],
    subscriptions: Sequence[Subscription],
    budgets: Sequence[Budget],
    reference_date: date,
) -> AnalyticsSummaryResponse:
    """Generate the complete consolidated analytics summary for the overview dashboard."""
    # 1. Baseline burn rate
    burn_rate = calculate_monthly_burn_rate(subscriptions)

    # 2. Month-to-date spend
    mtd_spend = calculate_month_to_date_spending(expenses, reference_date)

    # 3. Upcoming 7-day subscription renewals
    upcoming_7d_charges, _ = get_upcoming_renewals_window(subscriptions, reference_date, window_days=7)

    # 4. Category breakdown and top category
    category_items, top_category = calculate_category_spending_breakdown(expenses, reference_date, month_only=True)

    # 5. 30-day forecast
    forecast_data = calculate_30_day_forecast(expenses, subscriptions, reference_date)

    # 6. Budget utilizations
    budget_utils = get_budget_utilization_list(expenses, budgets, reference_date)

    return AnalyticsSummaryResponse(
        monthly_recurring_burn_rate=burn_rate,
        month_to_date_spend=mtd_spend,
        upcoming_7_day_renewals=upcoming_7d_charges,
        top_spend_category=top_category,
        thirty_day_forecast_total=forecast_data.thirty_day_forecast_total,
        forecast_breakdown=forecast_data.breakdown,
        category_spending=category_items,
        budget_utilizations=budget_utils,
    )
