"""Expense router handling CRUD and CSV import."""

from datetime import date

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.expense import Expense
from app.schemas.expense import (
    ExpenseCreate,
    ExpensePagination,
    ExpenseResponse,
)
from app.utils.csv_parser import parse_csv_expenses
from app.utils.exceptions import ResourceNotFoundException, ValidationException

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])


@router.get("", response_model=ExpensePagination)
def list_expenses(
    start_date: date | None = Query(None, description="Filter transactions on or after this date"),
    end_date: date | None = Query(None, description="Filter transactions on or before this date"),
    category: str | None = Query(None, description="Filter by category"),
    search: str | None = Query(None, description="Search transaction title"),
    limit: int = Query(50, ge=1, le=500, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    sort_by: str = Query("date", description="Field to sort by: 'date' or 'amount'"),
    order: str = Query("desc", description="Sort order: 'asc' or 'desc'"),
    db: Session = Depends(get_db),
):
    query = select(Expense)

    if start_date:
        query = query.where(Expense.date >= start_date)
    if end_date:
        query = query.where(Expense.date <= end_date)
    if category:
        query = query.where(Expense.category == category)
    if search:
        query = query.where(Expense.title.ilike(f"%{search.strip()}%"))

    # Count total matching rows
    count_query = select(func.count()).select_from(query.subquery())
    total_count = db.execute(count_query).scalar_one()

    # Sorting
    sort_col = Expense.amount if sort_by.lower() == "amount" else Expense.date
    if order.lower() == "asc":
        query = query.order_by(asc(sort_col), asc(Expense.id))
    else:
        query = query.order_by(desc(sort_col), desc(Expense.id))

    query = query.limit(limit).offset(offset)
    items = db.execute(query).scalars().all()

    return ExpensePagination(
        items=[ExpenseResponse.model_validate(item) for item in items],
        total=total_count,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
):
    db_expense = Expense(
        title=payload.title,
        amount=payload.amount,
        category=payload.category.value,
        date=payload.date,
        payment_method=payload.payment_method.value,
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return ExpenseResponse.model_validate(db_expense)


@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
):
    expense = db.get(Expense, expense_id)
    if not expense:
        raise ResourceNotFoundException("Expense", expense_id)
    return ExpenseResponse.model_validate(expense)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
):
    expense = db.get(Expense, expense_id)
    if not expense:
        raise ResourceNotFoundException("Expense", expense_id)
    db.delete(expense)
    db.commit()


@router.post("/import-csv", response_model=dict)
async def import_expenses_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise ValidationException("Only .csv files are supported for import.")

    content_bytes = await file.read()
    if not content_bytes:
        raise ValidationException("Uploaded CSV file is empty.")

    # Handle utf-8 with or without BOM
    try:
        csv_text = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            csv_text = content_bytes.decode("latin-1")
        except Exception as e:
            raise ValidationException(f"Unable to decode CSV file: {e}")

    result = parse_csv_expenses(csv_text, reference_date=date.today())

    # Persist valid expenses in a single transaction
    if result.valid_expenses:
        db_entities = [
            Expense(
                title=exp.title,
                amount=exp.amount,
                category=exp.category.value,
                date=exp.date,
                payment_method=exp.payment_method.value,
            )
            for exp in result.valid_expenses
        ]
        db.add_all(db_entities)
        db.commit()

    return {
        "total_rows": result.total_rows,
        "imported_count": result.imported_count,
        "failed_count": result.failed_count,
        "errors": [err.model_dump() for err in result.errors],
    }
