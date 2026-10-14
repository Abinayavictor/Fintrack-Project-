"""System router for health checks and demonstration database seeding."""

from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.budget import Budget
from app.models.expense import Expense, ExpenseCategory, PaymentMethod
from app.models.subscription import BillingCycle, Subscription, SubscriptionStatus

router = APIRouter(prefix="/api", tags=["System"])


@router.get("/health")
def health_check():
    """Health check endpoint validating application responsiveness."""
    return {
        "status": "ok",
        "service": "FinTrack Financial Engine",
        "version": "1.0.0",
        "date": date.today().isoformat(),
    }


@router.post("/seed")
def seed_sample_data(
    reset: bool = Query(True, description="Whether to clear existing data before seeding"),
    db: Session = Depends(get_db),
):
    """Seed realistic demonstration data into SQLite database."""
    today = date.today()

    if reset:
        db.execute(delete(Expense))
        db.execute(delete(Subscription))
        db.execute(delete(Budget))
        db.commit()

    # 1. Sample Budgets
    sample_budgets = [
        Budget(category=ExpenseCategory.HOUSING.value, monthly_limit=Decimal("1800.00")),
        Budget(category=ExpenseCategory.FOOD.value, monthly_limit=Decimal("700.00")),
        Budget(category=ExpenseCategory.UTILITIES.value, monthly_limit=Decimal("250.00")),
        Budget(category=ExpenseCategory.TRANSPORT.value, monthly_limit=Decimal("220.00")),
        Budget(category=ExpenseCategory.ENTERTAINMENT.value, monthly_limit=Decimal("180.00")),
        Budget(category=ExpenseCategory.HEALTHCARE.value, monthly_limit=Decimal("300.00")),
        Budget(category=ExpenseCategory.MISC.value, monthly_limit=Decimal("150.00")),
    ]
    db.add_all(sample_budgets)

    # 2. Sample Subscriptions
    sample_subscriptions = [
        Subscription(
            service_name="Spotify Premium",
            cost=Decimal("10.99"),
            billing_cycle=BillingCycle.MONTHLY.value,
            next_renewal_date=today + timedelta(days=2),  # Imminent (<48h)
            status=SubscriptionStatus.ACTIVE.value,
            auto_renew=True,
            original_renewal_day=(today + timedelta(days=2)).day,
        ),
        Subscription(
            service_name="Netflix Standard",
            cost=Decimal("15.49"),
            billing_cycle=BillingCycle.MONTHLY.value,
            next_renewal_date=today + timedelta(days=5),  # Upcoming 7d
            status=SubscriptionStatus.ACTIVE.value,
            auto_renew=True,
            original_renewal_day=(today + timedelta(days=5)).day,
        ),
        Subscription(
            service_name="Amazon Prime",
            cost=Decimal("139.00"),
            billing_cycle=BillingCycle.ANNUAL.value,
            next_renewal_date=today + timedelta(days=18),
            status=SubscriptionStatus.ACTIVE.value,
            auto_renew=True,
            original_renewal_day=(today + timedelta(days=18)).day,
        ),
        Subscription(
            service_name="Gym Membership",
            cost=Decimal("14.50"),
            billing_cycle=BillingCycle.WEEKLY.value,
            next_renewal_date=today + timedelta(days=1),  # Imminent (<48h)
            status=SubscriptionStatus.ACTIVE.value,
            auto_renew=True,
            original_renewal_day=(today + timedelta(days=1)).day,
        ),
        Subscription(
            service_name="Cloud Backup (Backblaze)",
            cost=Decimal("27.00"),
            billing_cycle=BillingCycle.QUARTERLY.value,
            next_renewal_date=today + timedelta(days=12),
            status=SubscriptionStatus.ACTIVE.value,
            auto_renew=True,
            original_renewal_day=(today + timedelta(days=12)).day,
        ),
        Subscription(
            service_name="Adobe Creative Cloud",
            cost=Decimal("54.99"),
            billing_cycle=BillingCycle.MONTHLY.value,
            next_renewal_date=today + timedelta(days=15),
            status=SubscriptionStatus.PAUSED.value,  # Paused - excluded from active calculations!
            auto_renew=False,
            original_renewal_day=(today + timedelta(days=15)).day,
        ),
    ]
    db.add_all(sample_subscriptions)

    # 3. Sample Expenses across last 30 days and current month
    month_start = today.replace(day=1)

    # Current month expenses
    expenses = [
        Expense(
            title="Monthly Apartment Rent",
            amount=Decimal("1600.00"),
            category=ExpenseCategory.HOUSING.value,
            date=max(month_start, today - timedelta(days=min(12, today.day - 1))),
            payment_method=PaymentMethod.BANK_TRANSFER.value,
        ),
        Expense(
            title="Whole Foods Market",
            amount=Decimal("142.80"),
            category=ExpenseCategory.FOOD.value,
            date=today - timedelta(days=1),
            payment_method=PaymentMethod.CREDIT_CARD.value,
        ),
        Expense(
            title="Electric & Power Utility",
            amount=Decimal("115.40"),
            category=ExpenseCategory.UTILITIES.value,
            date=today - timedelta(days=3),
            payment_method=PaymentMethod.DEBIT_CARD.value,
        ),
        Expense(
            title="Subway Monthly Pass",
            amount=Decimal("127.00"),
            category=ExpenseCategory.TRANSPORT.value,
            date=max(month_start, today - timedelta(days=min(10, today.day - 1))),
            payment_method=PaymentMethod.CREDIT_CARD.value,
        ),
        Expense(
            title="Trader Joe's Groceries",
            amount=Decimal("89.50"),
            category=ExpenseCategory.FOOD.value,
            date=today - timedelta(days=4),
            payment_method=PaymentMethod.DEBIT_CARD.value,
        ),
        Expense(
            title="Cinema IMAX Tickets",
            amount=Decimal("38.00"),
            category=ExpenseCategory.ENTERTAINMENT.value,
            date=today - timedelta(days=6),
            payment_method=PaymentMethod.CREDIT_CARD.value,
        ),
        Expense(
            title="Pharmacy Prescription",
            amount=Decimal("45.20"),
            category=ExpenseCategory.HEALTHCARE.value,
            date=today - timedelta(days=7),
            payment_method=PaymentMethod.DEBIT_CARD.value,
        ),
        Expense(
            title="Coffee & Bakery",
            amount=Decimal("14.50"),
            category=ExpenseCategory.FOOD.value,
            date=today,
            payment_method=PaymentMethod.CASH.value,
        ),
        Expense(
            title="Gas Station Refuel",
            amount=Decimal("52.30"),
            category=ExpenseCategory.TRANSPORT.value,
            date=today - timedelta(days=8),
            payment_method=PaymentMethod.CREDIT_CARD.value,
        ),
        Expense(
            title="Hardware Store Tools",
            amount=Decimal("32.90"),
            category=ExpenseCategory.MISC.value,
            date=today - timedelta(days=11),
            payment_method=PaymentMethod.DEBIT_CARD.value,
        ),
    ]

    # Additional expenses earlier in the 30-day historical window
    for days_ago in [16, 20, 24, 27]:
        d = today - timedelta(days=days_ago)
        expenses.append(
            Expense(
                title=f"Grocery Restock Day -{days_ago}",
                amount=Decimal("68.40"),
                category=ExpenseCategory.FOOD.value,
                date=d,
                payment_method=PaymentMethod.DEBIT_CARD.value,
            )
        )
        expenses.append(
            Expense(
                title=f"Coffee & Lunch Day -{days_ago}",
                amount=Decimal("18.25"),
                category=ExpenseCategory.FOOD.value,
                date=d,
                payment_method=PaymentMethod.CASH.value,
            )
        )

    db.add_all(expenses)
    db.commit()

    return {
        "success": True,
        "message": "Realistic demonstration data successfully seeded into SQLite database.",
        "budgets_seeded": len(sample_budgets),
        "subscriptions_seeded": len(sample_subscriptions),
        "expenses_seeded": len(expenses),
    }
