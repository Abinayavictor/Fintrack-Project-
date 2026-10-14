"""Standalone script to seed demonstration data into FinTrack SQLite database."""

import os
import sys

# Ensure backend directory is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from app.database import SessionLocal, init_db
from app.routers.system import seed_sample_data

if __name__ == "__main__":
    print("Initializing database schema...")
    init_db()
    db = SessionLocal()
    try:
        print("Seeding sample budgets, subscriptions, and expenses...")
        result = seed_sample_data(reset=True, db=db)
        print(f"Success! {result['message']}")
        print(f"Budgets: {result['budgets_seeded']}, Subscriptions: {result['subscriptions_seeded']}, Expenses: {result['expenses_seeded']}")
    finally:
        db.close()
