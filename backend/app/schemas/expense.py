"""Pydantic schemas for Expense entity validation."""

import datetime as dt
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.expense import ExpenseCategory, PaymentMethod


class ExpenseBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100, description="Title of the expense")
    amount: Decimal = Field(..., gt=Decimal("0.00"), decimal_places=2, description="Monetary amount, strictly positive")
    category: ExpenseCategory = Field(..., description="Expense category")
    date: dt.date = Field(..., description="Transaction date (ISO-8601, cannot be in future)")
    payment_method: PaymentMethod = Field(..., description="Payment method used")

    @field_validator("title")
    @classmethod
    def validate_title_non_blank(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Expense title cannot be empty or only whitespace")
        return stripped

    @field_validator("date")
    @classmethod
    def validate_date_not_future(cls, v: dt.date) -> dt.date:
        today = dt.date.today()
        if v > today:
            raise ValueError(f"Expense date cannot be in the future (provided: {v}, today: {today})")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount_positive(cls, v: Decimal) -> Decimal:
        if v <= Decimal("0.00"):
            raise ValueError("Amount must be strictly positive (> 0.00)")
        return v.quantize(Decimal("0.01"))


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=100)
    amount: Decimal | None = Field(None, gt=Decimal("0.00"), decimal_places=2)
    category: ExpenseCategory | None = None
    date: dt.date | None = None
    payment_method: PaymentMethod | None = None

    @field_validator("title")
    @classmethod
    def validate_title_non_blank(cls, v: str | None) -> str | None:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Expense title cannot be empty or whitespace")
            return stripped
        return v

    @field_validator("date")
    @classmethod
    def validate_date_not_future(cls, v: dt.date | None) -> dt.date | None:
        if v is not None:
            today = dt.date.today()
            if v > today:
                raise ValueError(f"Expense date cannot be in the future (provided: {v}, today: {today})")
        return v

    @field_validator("amount")
    @classmethod
    def validate_amount_positive(cls, v: Decimal | None) -> Decimal | None:
        if v is not None:
            if v <= Decimal("0.00"):
                raise ValueError("Amount must be strictly positive (> 0.00)")
            return v.quantize(Decimal("0.01"))
        return v


class ExpenseResponse(ExpenseBase):
    id: int
    created_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class ExpensePagination(BaseModel):
    items: list[ExpenseResponse]
    total: int
    limit: int
    offset: int
