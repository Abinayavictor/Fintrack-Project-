"""Pydantic schemas for Budget entity validation."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.expense import ExpenseCategory


class BudgetBase(BaseModel):
    category: ExpenseCategory = Field(..., description="Expense category for this budget")
    monthly_limit: Decimal = Field(..., gt=Decimal("0.00"), decimal_places=2, description="Monthly budget limit, strictly positive")

    @field_validator("monthly_limit")
    @classmethod
    def validate_monthly_limit_positive(cls, v: Decimal) -> Decimal:
        if v <= Decimal("0.00"):
            raise ValueError("Monthly budget limit must be strictly positive (> 0.00)")
        return v.quantize(Decimal("0.01"))


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    monthly_limit: Decimal = Field(..., gt=Decimal("0.00"), decimal_places=2)

    @field_validator("monthly_limit")
    @classmethod
    def validate_monthly_limit_positive(cls, v: Decimal) -> Decimal:
        if v <= Decimal("0.00"):
            raise ValueError("Monthly budget limit must be strictly positive (> 0.00)")
        return v.quantize(Decimal("0.01"))


class BudgetResponse(BaseModel):
    id: int
    category: str
    monthly_limit: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BudgetUtilizationResponse(BaseModel):
    category: str
    monthly_limit: Decimal | None = None
    current_spend: Decimal
    remaining: Decimal | None = None
    percentage_used: Decimal | None = None
    status: str = Field(..., description="OK (<80%), WARNING (80-99%), EXCEEDED (>=100%), or UNSET")
