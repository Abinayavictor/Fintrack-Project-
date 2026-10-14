"""Integration tests for all FinTrack REST API endpoints using FastAPI TestClient."""

import io
from datetime import date, timedelta

from fastapi.testclient import TestClient


def test_health_check(client: TestClient):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "FinTrack" in data["service"]


def test_expense_crud_and_validation(client: TestClient):
    today = date.today()

    # 1. Create valid expense
    payload = {
        "title": "Grocery Shopping",
        "amount": "85.50",
        "category": "Food",
        "date": today.isoformat(),
        "payment_method": "Credit Card",
    }
    res = client.post("/api/expenses", json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created["id"] is not None
    assert created["title"] == "Grocery Shopping"
    assert created["amount"] == "85.50"
    exp_id = created["id"]

    # 2. Get expense by ID
    get_res = client.get(f"/api/expenses/{exp_id}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Grocery Shopping"

    # 3. List expenses
    list_res = client.get("/api/expenses?category=Food")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(item["id"] == exp_id for item in list_data["items"])

    # 4. Delete expense
    del_res = client.delete(f"/api/expenses/{exp_id}")
    assert del_res.status_code == 204

    # 5. Nonexistent expense returns 404 with error envelope
    missing_res = client.get(f"/api/expenses/{exp_id}")
    assert missing_res.status_code == 404
    err = missing_res.json()
    assert err["success"] is False
    assert err["error_code"] == "RESOURCE_NOT_FOUND"


def test_expense_invalid_payloads_return_422(client: TestClient):
    today = date.today()
    future_date = (today + timedelta(days=1)).isoformat()

    # Negative amount
    res1 = client.post(
        "/api/expenses",
        json={
            "title": "Invalid Negative",
            "amount": "-10.00",
            "category": "Food",
            "date": today.isoformat(),
            "payment_method": "Cash",
        },
    )
    assert res1.status_code == 422
    assert res1.json()["success"] is False
    assert res1.json()["error_code"] == "VALIDATION_ERROR"

    # Future date
    res2 = client.post(
        "/api/expenses",
        json={
            "title": "Future Expense",
            "amount": "10.00",
            "category": "Food",
            "date": future_date,
            "payment_method": "Cash",
        },
    )
    assert res2.status_code == 422

    # Empty title
    res3 = client.post(
        "/api/expenses",
        json={
            "title": "   ",
            "amount": "10.00",
            "category": "Food",
            "date": today.isoformat(),
            "payment_method": "Cash",
        },
    )
    assert res3.status_code == 422


def test_subscription_lifecycle(client: TestClient):
    # 1. Create subscription without explicit renewal date
    sub_payload = {
        "service_name": "Spotify Premium",
        "cost": "10.99",
        "billing_cycle": "monthly",
        "status": "active",
        "auto_renew": True,
    }
    create_res = client.post("/api/subscriptions", json=sub_payload)
    assert create_res.status_code == 201
    sub_data = create_res.json()
    sub_id = sub_data["id"]
    assert sub_data["normalized_monthly_cost"] == "10.99"
    assert sub_data["next_renewal_date"] is not None

    # 2. Update status to paused
    pause_res = client.patch(f"/api/subscriptions/{sub_id}", json={"status": "paused"})
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "paused"

    # 3. Resume status to active
    resume_res = client.patch(f"/api/subscriptions/{sub_id}", json={"status": "active"})
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == "active"

    # 4. Delete subscription
    del_res = client.delete(f"/api/subscriptions/{sub_id}")
    assert del_res.status_code == 204

    # 5. Nonexistent returns 404
    get_missing = client.get(f"/api/subscriptions/{sub_id}")
    assert get_missing.status_code == 404


def test_budget_upsert_and_utilization(client: TestClient):
    # Set Food budget
    set_res = client.post(
        "/api/budgets",
        json={"category": "Food", "monthly_limit": "600.00"},
    )
    assert set_res.status_code == 200
    assert set_res.json()["category"] == "Food"
    assert set_res.json()["monthly_limit"] == "600.00"

    # Update Food budget
    update_res = client.post(
        "/api/budgets",
        json={"category": "Food", "monthly_limit": "650.00"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["monthly_limit"] == "650.00"

    # Get budget utilization
    util_res = client.get("/api/budgets/utilization")
    assert util_res.status_code == 200
    util_data = util_res.json()
    assert len(util_data) == 7
    food_util = next(u for u in util_data if u["category"] == "Food")
    assert food_util["monthly_limit"] == "650.00"


def test_analytics_summary_and_forecast_endpoints(client: TestClient):
    # Summary
    summary_res = client.get("/api/analytics/summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert "monthly_recurring_burn_rate" in summary
    assert "month_to_date_spend" in summary
    assert "upcoming_7_day_renewals" in summary
    assert "thirty_day_forecast_total" in summary
    assert "category_spending" in summary
    assert "budget_utilizations" in summary

    # Forecast
    forecast_res = client.get("/api/analytics/forecast")
    assert forecast_res.status_code == 200
    forecast = forecast_res.json()
    assert len(forecast["daily_projections"]) == 30
    assert "thirty_day_forecast_total" in forecast


def test_csv_import_endpoint(client: TestClient):
    csv_bytes = b"""Title,Amount,Category,Date,Payment Method
Internet Fiber,$70.00,Utilities,2026-10-05,Credit Card
Coffee,4.50,Food,2026-10-06,Cash
Bad Row,-20.00,Food,2026-10-07,Debit Card
"""
    files = {"file": ("test.csv", io.BytesIO(csv_bytes), "text/csv")}
    res = client.post("/api/expenses/import-csv", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["total_rows"] == 3
    assert data["imported_count"] == 2
    assert data["failed_count"] == 1
    assert len(data["errors"]) == 1
    assert data["errors"][0]["field"] == "amount"
