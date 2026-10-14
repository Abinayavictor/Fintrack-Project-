"""Unit tests for budget utilization and threshold alerts."""

from datetime import date
from decimal import Decimal

from app.models.budget import Budget
from app.models.expense import Expense, ExpenseCategory
from app.services.budget_service import (
    get_budget_utilization_list,
)


def test_budget_utilization_thresholds():
    ref_date = date(2026, 10, 15)

    expenses = [
        # Food: 400 spent on 500 limit -> 80% (WARNING)
        Expense(
            id=1,
            title="Groceries",
            amount=Decimal("400.00"),
            category=ExpenseCategory.FOOD.value,
            date=date(2026, 10, 5),
            payment_method="Credit Card",
        ),
        # Transport: 250 spent on 200 limit -> 125% (EXCEEDED)
        Expense(
            id=2,
            title="Train Pass & Rideshare",
            amount=Decimal("250.00"),
            category=ExpenseCategory.TRANSPORT.value,
            date=date(2026, 10, 6),
            payment_method="Debit Card",
        ),
        # Utilities: 70 spent on 100 limit -> 70% (OK)
        Expense(
            id=3,
            title="Electric",
            amount=Decimal("70.00"),
            category=ExpenseCategory.UTILITIES.value,
            date=date(2026, 10, 7),
            payment_method="Debit Card",
        ),
        # Entertainment: 30 spent, but NO budget configured (UNSET)
        Expense(
            id=4,
            title="Movie",
            amount=Decimal("30.00"),
            category=ExpenseCategory.ENTERTAINMENT.value,
            date=date(2026, 10, 8),
            payment_method="Cash",
        ),
    ]

    budgets = [
        Budget(id=1, category=ExpenseCategory.FOOD.value, monthly_limit=Decimal("500.00")),
        Budget(id=2, category=ExpenseCategory.TRANSPORT.value, monthly_limit=Decimal("200.00")),
        Budget(id=3, category=ExpenseCategory.UTILITIES.value, monthly_limit=Decimal("100.00")),
    ]

    utilizations = get_budget_utilization_list(expenses, budgets, ref_date)
    util_by_cat = {u.category: u for u in utilizations}

    # Food check: 80% -> WARNING
    food = util_by_cat[ExpenseCategory.FOOD.value]
    assert food.current_spend == Decimal("400.00")
    assert food.monthly_limit == Decimal("500.00")
    assert food.percentage_used == Decimal("80.00")
    assert food.remaining == Decimal("100.00")
    assert food.status == "WARNING"

    # Transport check: 125% -> EXCEEDED
    transport = util_by_cat[ExpenseCategory.TRANSPORT.value]
    assert transport.current_spend == Decimal("250.00")
    assert transport.percentage_used == Decimal("125.00")
    assert transport.remaining == Decimal("-50.00")
    assert transport.status == "EXCEEDED"

    # Utilities check: 70% -> OK
    utilities = util_by_cat[ExpenseCategory.UTILITIES.value]
    assert utilities.current_spend == Decimal("70.00")
    assert utilities.percentage_used == Decimal("70.00")
    assert utilities.remaining == Decimal("30.00")
    assert utilities.status == "OK"

    # Entertainment check: UNSET
    entertainment = util_by_cat[ExpenseCategory.ENTERTAINMENT.value]
    assert entertainment.current_spend == Decimal("30.00")
    assert entertainment.monthly_limit is None
    assert entertainment.percentage_used is None
    assert entertainment.status == "UNSET"
