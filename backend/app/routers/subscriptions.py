"""Subscription router handling recurring subscription management and lifecycle."""

from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.subscription import BillingCycle, Subscription, SubscriptionStatus
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionResponse,
    SubscriptionUpdate,
)
from app.services.subscription_service import (
    compute_default_renewal_date,
    normalize_monthly_cost,
)
from app.utils.exceptions import ResourceNotFoundException

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])


def enrich_subscription(sub: Subscription, today: date) -> SubscriptionResponse:
    """Enrich subscription database entity with normalized cost, countdown, and urgency."""
    normalized = normalize_monthly_cost(sub.cost, sub.billing_cycle)
    days_left = (sub.next_renewal_date - today).days
    is_imminent = sub.status == SubscriptionStatus.ACTIVE.value and (0 <= days_left <= 2)

    return SubscriptionResponse(
        id=sub.id,
        service_name=sub.service_name,
        cost=sub.cost,
        billing_cycle=BillingCycle(sub.billing_cycle),
        next_renewal_date=sub.next_renewal_date,
        status=SubscriptionStatus(sub.status),
        auto_renew=sub.auto_renew,
        normalized_monthly_cost=normalized,
        days_until_renewal=days_left,
        is_imminent=is_imminent,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
    )


@router.get("", response_model=list[SubscriptionResponse])
def list_subscriptions(
    status: str | None = Query(None, description="Filter by status: active, paused, cancelled"),
    db: Session = Depends(get_db),
):
    query = select(Subscription)
    if status:
        normalized_status = status.strip().lower()
        query = query.where(Subscription.status == normalized_status)

    query = query.order_by(Subscription.next_renewal_date.asc(), Subscription.id.asc())
    subscriptions = db.execute(query).scalars().all()
    today = date.today()

    return [enrich_subscription(sub, today) for sub in subscriptions]


@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(
    payload: SubscriptionCreate,
    db: Session = Depends(get_db),
):
    today = date.today()
    renewal_date = payload.next_renewal_date
    if not renewal_date:
        renewal_date = compute_default_renewal_date(today, payload.billing_cycle)

    db_sub = Subscription(
        service_name=payload.service_name,
        cost=payload.cost,
        billing_cycle=payload.billing_cycle.value,
        next_renewal_date=renewal_date,
        status=payload.status.value,
        auto_renew=payload.auto_renew,
        original_renewal_day=renewal_date.day,
    )
    db.add(db_sub)
    db.commit()
    db.refresh(db_sub)

    return enrich_subscription(db_sub, today)


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
):
    sub = db.get(Subscription, subscription_id)
    if not sub:
        raise ResourceNotFoundException("Subscription", subscription_id)
    return enrich_subscription(sub, date.today())


@router.patch("/{subscription_id}", response_model=SubscriptionResponse)
def update_subscription(
    subscription_id: int,
    payload: SubscriptionUpdate,
    db: Session = Depends(get_db),
):
    sub = db.get(Subscription, subscription_id)
    if not sub:
        raise ResourceNotFoundException("Subscription", subscription_id)

    if payload.service_name is not None:
        sub.service_name = payload.service_name
    if payload.cost is not None:
        sub.cost = payload.cost
    if payload.billing_cycle is not None:
        sub.billing_cycle = payload.billing_cycle.value
    if payload.next_renewal_date is not None:
        sub.next_renewal_date = payload.next_renewal_date
        sub.original_renewal_day = payload.next_renewal_date.day
    if payload.status is not None:
        sub.status = payload.status.value
    if payload.auto_renew is not None:
        sub.auto_renew = payload.auto_renew

    db.commit()
    db.refresh(sub)
    return enrich_subscription(sub, date.today())


@router.delete("/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
):
    sub = db.get(Subscription, subscription_id)
    if not sub:
        raise ResourceNotFoundException("Subscription", subscription_id)
    db.delete(sub)
    db.commit()
