"""Defensive CSV Parser for Expense Ingestion.

Features:
- Tolerates missing/fuzzy headers and arbitrary column orders.
- Strips leading/trailing whitespace on all fields.
- Handles currency symbols ($, €, £, etc.) and commas (e.g. $1,250.50).
- Supports multiple date formats (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, etc.).
- Rejects zero, negative, or unparseable monetary values.
- Rejects future expense dates.
- Normalizes category and payment_method case-insensitively to valid enums.
- Never crashes the batch import on single-row failures.
- Returns detailed structured report with accurate CSV line numbers.
"""

import csv
import io
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from pydantic import BaseModel

from app.models.expense import ExpenseCategory, PaymentMethod
from app.schemas.expense import ExpenseCreate


class RowError(BaseModel):
    row: int
    field: str
    reason: str


class CsvImportResult(BaseModel):
    total_rows: int
    imported_count: int
    failed_count: int
    errors: list[RowError]
    valid_expenses: list[ExpenseCreate]


# Supported canonical mappings
CATEGORY_LOOKUP = {c.value.lower(): c.value for c in ExpenseCategory}
PAYMENT_METHOD_LOOKUP = {p.value.lower(): p.value for p in PaymentMethod}

DATE_FORMATS = [
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%m/%d/%Y",
    "%d-%m-%Y",
    "%Y/%m/%d",
    "%d.%m.%Y",
]

HEADER_ALIASES = {
    "title": ["title", "name", "description", "item", "merchant", "expense", "details"],
    "amount": ["amount", "cost", "price", "total", "value", "spent"],
    "category": ["category", "expense_category", "type", "cat"],
    "date": ["date", "transaction_date", "expense_date", "trans_date"],
    "payment_method": ["payment_method", "payment method", "payment", "method", "payment_type", "payment type"],
}


def clean_currency_string(raw: str) -> str:
    """Strip currency symbols, letters, and extraneous spaces."""
    # Remove whitespace
    s = raw.strip()
    # Remove currency signs and codes
    s = re.sub(r"[\$€£₹¥\s]|USD|EUR|GBP|INR", "", s, flags=re.IGNORECASE)
    # Handle thousands comma (e.g. 1,234.56 -> 1234.56)
    if "," in s and "." in s:
        s = s.replace(",", "")
    elif "," in s and "." not in s:
        # Check if comma is used as decimal separator or thousands
        parts = s.split(",")
        if len(parts) == 2 and len(parts[1]) == 2:
            s = f"{parts[0]}.{parts[1]}"
        else:
            s = s.replace(",", "")
    return s


def parse_date_safely(raw: str, reference_date: date) -> tuple[date | None, str | None]:
    """Attempt to parse date across supported formats and enforce not-future rule."""
    cleaned = raw.strip()
    if not cleaned:
        return None, "Date field is missing or empty"

    parsed_date: date | None = None
    for fmt in DATE_FORMATS:
        try:
            parsed_date = datetime.strptime(cleaned, fmt).date()
            break
        except ValueError:
            continue

    if parsed_date is None:
        return None, f"Malformed date '{raw}'. Expected YYYY-MM-DD or DD/MM/YYYY."

    if parsed_date > reference_date:
        return None, f"Expense date cannot be in the future (given: {parsed_date}, current: {reference_date})"

    return parsed_date, None


def parse_csv_expenses(
    csv_content: str,
    reference_date: date | None = None,
) -> CsvImportResult:
    """Parse CSV text defensively, returning validated expenses and detailed row errors."""
    today = reference_date or date.today()
    errors: list[RowError] = []
    valid_expenses: list[ExpenseCreate] = []

    # Handle blank or whitespace-only file
    if not csv_content.strip():
        return CsvImportResult(
            total_rows=0,
            imported_count=0,
            failed_count=0,
            errors=[],
            valid_expenses=[],
        )

    # Use csv.reader on string buffer
    f = io.StringIO(csv_content.strip())
    reader = csv.reader(f)

    # Determine headers
    try:
        raw_header = next(reader)
    except StopIteration:
        return CsvImportResult(
            total_rows=0,
            imported_count=0,
            failed_count=0,
            errors=[],
            valid_expenses=[],
        )

    header_cols = [c.strip().lower() for c in raw_header]

    # Map column aliases to index
    col_map: dict[str, int] = {}
    for col_key, aliases in HEADER_ALIASES.items():
        for idx, col in enumerate(header_cols):
            if col in aliases:
                col_map[col_key] = idx
                break

    # If key columns missing, check if first row was actually data (no header)
    required_keys = {"title", "amount", "category", "date", "payment_method"}
    has_header = len(col_map.keys() & required_keys) >= 3

    if not has_header:
        # Rewind to treat first line as data, using default order
        f.seek(0)
        reader = csv.reader(f)
        col_map = {
            "title": 0,
            "amount": 1,
            "category": 2,
            "date": 3,
            "payment_method": 4,
        }
        line_offset = 1
    else:
        line_offset = 2

    row_index = line_offset - 1
    total_data_rows = 0

    for row in reader:
        row_index += 1
        # Skip completely empty or blank rows
        if not row or not any(cell.strip() for cell in row):
            continue

        total_data_rows += 1
        row_has_error = False

        # 1. Title validation
        title_idx = col_map.get("title")
        if title_idx is None or title_idx >= len(row):
            errors.append(RowError(row=row_index, field="title", reason="Title column is missing"))
            row_has_error = True
            title_val = ""
        else:
            title_val = row[title_idx].strip()
            if not title_val:
                errors.append(RowError(row=row_index, field="title", reason="Title cannot be empty"))
                row_has_error = True
            elif len(title_val) > 100:
                errors.append(RowError(row=row_index, field="title", reason="Title exceeds 100 characters"))
                row_has_error = True

        # 2. Amount validation
        amount_idx = col_map.get("amount")
        amount_val: Decimal | None = None
        if amount_idx is None or amount_idx >= len(row):
            errors.append(RowError(row=row_index, field="amount", reason="Amount column is missing"))
            row_has_error = True
        else:
            raw_amt = row[amount_idx].strip()
            cleaned_amt = clean_currency_string(raw_amt)
            try:
                amount_val = Decimal(cleaned_amt)
                if amount_val <= Decimal("0.00"):
                    errors.append(RowError(row=row_index, field="amount", reason="Amount must be strictly positive (> 0.00)"))
                    row_has_error = True
            except (InvalidOperation, ValueError):
                errors.append(RowError(row=row_index, field="amount", reason=f"Invalid numeric amount '{raw_amt}'"))
                row_has_error = True

        # 3. Category validation
        cat_idx = col_map.get("category")
        cat_enum: ExpenseCategory | None = None
        if cat_idx is None or cat_idx >= len(row):
            errors.append(RowError(row=row_index, field="category", reason="Category column is missing"))
            row_has_error = True
        else:
            raw_cat = row[cat_idx].strip().lower()
            canonical_cat = CATEGORY_LOOKUP.get(raw_cat)
            if not canonical_cat:
                valid_cats = ", ".join([c.value for c in ExpenseCategory])
                errors.append(
                    RowError(
                        row=row_index,
                        field="category",
                        reason=f"Unsupported category '{row[cat_idx].strip()}'. Supported: {valid_cats}",
                    )
                )
                row_has_error = True
            else:
                cat_enum = ExpenseCategory(canonical_cat)

        # 4. Date validation
        date_idx = col_map.get("date")
        date_val: date | None = None
        if date_idx is None or date_idx >= len(row):
            errors.append(RowError(row=row_index, field="date", reason="Date column is missing"))
            row_has_error = True
        else:
            raw_date = row[date_idx].strip()
            parsed_d, err = parse_date_safely(raw_date, today)
            if err:
                errors.append(RowError(row=row_index, field="date", reason=err))
                row_has_error = True
            else:
                date_val = parsed_d

        # 5. Payment method validation
        pm_idx = col_map.get("payment_method")
        pm_enum: PaymentMethod | None = None
        if pm_idx is None or pm_idx >= len(row):
            errors.append(RowError(row=row_index, field="payment_method", reason="Payment method column is missing"))
            row_has_error = True
        else:
            raw_pm = row[pm_idx].strip().lower()
            canonical_pm = PAYMENT_METHOD_LOOKUP.get(raw_pm)
            if not canonical_pm:
                valid_pms = ", ".join([p.value for p in PaymentMethod])
                errors.append(
                    RowError(
                        row=row_index,
                        field="payment_method",
                        reason=f"Unsupported payment method '{row[pm_idx].strip()}'. Supported: {valid_pms}",
                    )
                )
                row_has_error = True
            else:
                pm_enum = PaymentMethod(canonical_pm)

        # If all fields passed validation, add to valid expenses
        if not row_has_error and title_val and amount_val and cat_enum and date_val and pm_enum:
            valid_expenses.append(
                ExpenseCreate(
                    title=title_val,
                    amount=amount_val,
                    category=cat_enum,
                    date=date_val,
                    payment_method=pm_enum,
                )
            )

    return CsvImportResult(
        total_rows=total_data_rows,
        imported_count=len(valid_expenses),
        failed_count=total_data_rows - len(valid_expenses),
        errors=errors,
        valid_expenses=valid_expenses,
    )
