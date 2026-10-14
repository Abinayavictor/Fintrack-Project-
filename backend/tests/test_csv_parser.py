"""Unit tests for defensive CSV parsing and validation."""

from datetime import date
from decimal import Decimal

from app.models.expense import ExpenseCategory, PaymentMethod
from app.utils.csv_parser import clean_currency_string, parse_csv_expenses


def test_clean_currency_string():
    assert clean_currency_string("$45.00") == "45.00"
    assert clean_currency_string("€1,250.75") == "1250.75"
    assert clean_currency_string("£ 99.50 ") == "99.50"
    assert clean_currency_string(" 1500 ") == "1500"


def test_parse_csv_expenses_valid_and_edge_cases():
    ref_date = date(2026, 10, 15)
    csv_data = """Title,Amount,Category,Date,Payment Method
Grocery Run,$55.40,Food,2026-10-10,Credit Card
Electric Utility,120.00,Utilities,08/10/2026,Debit Card
Train Ticket,€15.50,Transport,2026/10/05,Cash
Rent Payment,"1,500.00",Housing,2026-10-01,Bank Transfer
"""
    result = parse_csv_expenses(csv_data, reference_date=ref_date)
    assert result.total_rows == 4
    assert result.imported_count == 4
    assert result.failed_count == 0
    assert len(result.errors) == 0

    assert result.valid_expenses[0].amount == Decimal("55.40")
    assert result.valid_expenses[0].category == ExpenseCategory.FOOD
    assert result.valid_expenses[3].amount == Decimal("1500.00")
    assert result.valid_expenses[3].payment_method == PaymentMethod.BANK_TRANSFER


def test_parse_csv_rejects_negative_amount_and_future_date():
    ref_date = date(2026, 10, 15)
    csv_data = """Title,Amount,Category,Date,Payment Method
Valid Coffee,4.50,Food,2026-10-14,Cash
Negative Spend,-25.00,Food,2026-10-10,Debit Card
Zero Spend,0.00,Misc,2026-10-10,Debit Card
Future Transaction,100.00,Transport,2026-10-20,Credit Card
Bad Date,50.00,Food,invalid-date,Credit Card
Bad Category,30.00,Unicorns,2026-10-12,Cash
Bad Payment Method,30.00,Food,2026-10-12,Bitcoin
"""
    result = parse_csv_expenses(csv_data, reference_date=ref_date)
    assert result.total_rows == 7
    assert result.imported_count == 1
    assert result.failed_count == 6
    assert len(result.errors) == 6

    # Verify error fields
    error_fields = {err.field for err in result.errors}
    assert "amount" in error_fields
    assert "date" in error_fields
    assert "category" in error_fields
    assert "payment_method" in error_fields


def test_parse_csv_empty_and_blank_lines():
    result = parse_csv_expenses("", reference_date=date.today())
    assert result.total_rows == 0
    assert result.imported_count == 0

    blank_lines = "\n\n   \n\n"
    result2 = parse_csv_expenses(blank_lines, reference_date=date.today())
    assert result2.total_rows == 0
