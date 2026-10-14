"""Budget service for calculating monthly budget utilization and threshold alerts."""

from collections.abc import Sequence
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from app.models.budget import Budget
from app.models.expense import Expense, ExpenseCategory
from app.schemas.budget import BudgetUtilizationResponse

THRESHOLD_WARNING = Decimal("80.00")
THRESHOLD_EXCEEDED = Decimal("100.00")


def calculate_category_spending_for_month(
    expenses: Sequence[Expense],
    reference_date: date,
) -> dict[str, Decimal]:
    """Calculate the total spending per category from the first day of reference_date's month up to reference_date."""
    month_start = reference_date.replace(day=1)
    totals: dict[str, Decimal] = {cat.value: Decimal("0.00") for cat in ExpenseCategory}

    for exp in expenses:
        if month_start <= exp.date <= reference_date:
            category_key = exp.category
            totals[category_key] = totals.get(category_key, Decimal("0.00")) + exp.amount

    return totals


def get_budget_utilization_list(
    expenses: Sequence[Expense],
    budgets: Sequence[Budget],
    reference_date: date,
) -> list[BudgetUtilizationResponse]:
    """Calculate utilization, remaining budget, and status for each expense category."""
    spending_by_category = calculate_category_spending_for_month(expenses, reference_date)
    budget_map = {b.category: b.monthly_limit for b in budgets}

    results: list[BudgetUtilizationResponse] = []

    for cat in ExpenseCategory:
        cat_name = cat.value
        current_spend = spending_by_category.get(cat_name, Decimal("0.00")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        monthly_limit = budget_map.get(cat_name)

        if monthly_limit is not None and monthly_limit > Decimal("0.00"):
            percentage_used = ((current_spend / monthly_limit) * Decimal("100.00")).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            remaining = (monthly_limit - current_spend).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            if percentage_used >= THRESHOLD_EXCEEDED:
                status = "EXCEEDED"
            elif percentage_used >= THRESHOLD_WARNING:
                status = "WARNING"
            else:
                status = "OK"

            results.append(
                BudgetUtilizationResponse(
                    category=cat_name,
                    monthly_limit=monthly_limit.quantize(Decimal("0.01")),
                    current_spend=current_spend,
                    remaining=remaining,
                    percentage_used=percentage_used,
                    status=status,
                )
            )
        else:
            # Category has no budget configured
            results.append(
                BudgetUtilizationResponse(
                    category=cat_name,
                    monthly_limit=None,
                    current_spend=current_spend,
                    remaining=None,
                    percentage_used=None,
                    status="UNSET",
                )
            )

    return results
