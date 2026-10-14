"""Category Budgets router handling monthly limits and live utilization."""

from datetime import date

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.budget import Budget
from app.models.expense import Expense
from app.schemas.budget import (
    BudgetCreate,
    BudgetResponse,
    BudgetUtilizationResponse,
)
from app.services.budget_service import get_budget_utilization_list
from app.utils.exceptions import ResourceNotFoundException

router = APIRouter(prefix="/api/budgets", tags=["Budgets"])


@router.get("", response_model=list[BudgetResponse])
def list_budgets(db: Session = Depends(get_db)):
    """List all configured monthly category budgets."""
    budgets = db.execute(select(Budget).order_by(Budget.category.asc())).scalars().all()
    return [BudgetResponse.model_validate(b) for b in budgets]


@router.get("/utilization", response_model=list[BudgetUtilizationResponse])
def get_budgets_utilization(db: Session = Depends(get_db)):
    """Retrieve current-month budget utilization across all categories."""
    expenses = db.execute(select(Expense)).scalars().all()
    budgets = db.execute(select(Budget)).scalars().all()
    return get_budget_utilization_list(expenses, budgets, date.today())


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_200_OK)
def set_or_update_budget(
    payload: BudgetCreate,
    db: Session = Depends(get_db),
):
    """Create or update (upsert) the monthly budget target for a category."""
    category_name = payload.category.value
    existing_budget = db.execute(select(Budget).where(Budget.category == category_name)).scalar_one_or_none()

    if existing_budget:
        existing_budget.monthly_limit = payload.monthly_limit
        db.commit()
        db.refresh(existing_budget)
        return BudgetResponse.model_validate(existing_budget)
    else:
        new_budget = Budget(
            category=category_name,
            monthly_limit=payload.monthly_limit,
        )
        db.add(new_budget)
        db.commit()
        db.refresh(new_budget)
        return BudgetResponse.model_validate(new_budget)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
):
    """Delete a configured budget target."""
    budget = db.get(Budget, budget_id)
    if not budget:
        raise ResourceNotFoundException("Budget", budget_id)
    db.delete(budget)
    db.commit()
