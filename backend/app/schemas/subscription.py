"""Pydantic schemas for Subscription entity validation."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.subscription import BillingCycle, SubscriptionStatus


class SubscriptionBase(BaseModel):
    service_name: str = Field(..., min_length=1, max_length=100, description="Service name")
    cost: Decimal = Field(..., gt=Decimal("0.00"), decimal_places=2, description="Subscription cost per billing cycle")
    billing_cycle: BillingCycle = Field(..., description="Billing cycle: weekly, monthly, quarterly, annual")
    next_renewal_date: date | None = Field(None, description="Next renewal date; computed if omitted")
    status: SubscriptionStatus = Field(default=SubscriptionStatus.ACTIVE, description="Subscription status")
    auto_renew: bool = Field(default=True, description="Whether subscription automatically renews")

    @field_validator("service_name")
    @classmethod
    def validate_service_name_non_blank(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Service name cannot be empty or only whitespace")
        return stripped

    @field_validator("cost")
    @classmethod
    def validate_cost_positive(cls, v: Decimal) -> Decimal:
        if v <= Decimal("0.00"):
            raise ValueError("Subscription cost must be strictly positive (> 0.00)")
        return v.quantize(Decimal("0.01"))


class SubscriptionCreate(SubscriptionBase):
    pass


class SubscriptionUpdate(BaseModel):
    service_name: str | None = Field(None, min_length=1, max_length=100)
    cost: Decimal | None = Field(None, gt=Decimal("0.00"), decimal_places=2)
    billing_cycle: BillingCycle | None = None
    next_renewal_date: date | None = None
    status: SubscriptionStatus | None = None
    auto_renew: bool | None = None

    @field_validator("service_name")
    @classmethod
    def validate_service_name_non_blank(cls, v: str | None) -> str | None:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("Service name cannot be empty or whitespace")
            return stripped
        return v

    @field_validator("cost")
    @classmethod
    def validate_cost_positive(cls, v: Decimal | None) -> Decimal | None:
        if v is not None:
            if v <= Decimal("0.00"):
                raise ValueError("Subscription cost must be strictly positive (> 0.00)")
            return v.quantize(Decimal("0.01"))
        return v


class SubscriptionResponse(BaseModel):
    id: int
    service_name: str
    cost: Decimal
    billing_cycle: BillingCycle
    next_renewal_date: date
    status: SubscriptionStatus
    auto_renew: bool
    normalized_monthly_cost: Decimal
    days_until_renewal: int
    is_imminent: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
