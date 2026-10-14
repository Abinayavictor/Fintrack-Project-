# FinTrack — Personal Finance & Subscription Intelligence

> **Production-Quality Take-Home Technical Assessment Implementation**  
> *Full-Stack / Python Development: FastAPI, SQLAlchemy 2.0, SQLite, React 19, Vite, TypeScript, Tailwind CSS, Recharts.*

---

## 1. Project Overview

**FinTrack** is an intelligent personal finance web application and subscription intelligence dashboard designed to give individuals complete command over their recurring obligations, day-to-day discretionary spending, category budgets, and future cashflow.

Unlike standard static prototypes or basic ledger apps, FinTrack executes **real mathematical normalization and calendar arithmetic** (including leap-year transitions and monthly renewal-day anchor preservation), models **30-day forward-looking cashflow projections**, enforces **defensive CSV ingestion** with row-level error reporting, and provides live **category budget utilization alerts**.

All metrics shown on the dashboard are driven entirely by dynamic calculations from the backend SQLite database—**zero hardcoded or fabricated figures**.

---

## 2. Key Features

- **Consolidated Financial Overview Dashboard**:
  - Four top-level real-time KPI metrics:
    1. **Monthly Recurring Baseline**: Active subscription burn rate normalized using exact financial multipliers.
    2. **Month-to-Date Spend**: Discretionary expenses strictly from the first day of the current month to today.
    3. **Upcoming Renewals (7-Day Window)**: Total eligible subscription charges scheduled in the next 7 calendar days.
    4. **Top Spend Category**: Real-time highest spending category for the current month.
  - Interactive **Recharts Category Donut Chart** with exact percentage shares, dollar totals, and transaction counts.
  - Interactive **30-Day Cashflow Trajectory Chart** plotting daily outflows and cumulative projected outflows.
  - Live **Category Budgets Snapshot** with color-coded progress bars and status badges (`OK`, `WARNING`, `EXCEEDED`).
  - **Recent Ledger Transactions** list.

- **Intelligent Subscription Lifecycle Management**:
  - Cost normalization across all billing cycles:
    - Weekly: $\text{cost} \times (52 / 12)$
    - Monthly: $\text{cost} \times 1$
    - Quarterly: $\text{cost} / 3$
    - Annual: $\text{cost} / 12$
  - Excludes paused and cancelled subscriptions from active recurring totals.
  - Preserves original renewal day anchors across month-end clamping (e.g., Jan 31 $\rightarrow$ Feb 28/29 $\rightarrow$ Mar 31).
  - Handles leap-year transitions (e.g., Feb 29 leap $\rightarrow$ Feb 28 non-leap).
  - Live countdown timers (`Renews Today!`, `Renews Tomorrow`, `In X days`).
  - Imminent renewal highlight indicator for subscriptions renewing within 48 hours.
  - Non-destructive pause/resume and soft-cancel lifecycle states with confirmation dialogs.

- **Comprehensive Expense & Ledger Management**:
  - Full CRUD operations with search by title, category filtering, date-range filtering, and sorting by date or amount.
  - Input boundary validation (positive amounts, non-empty titles, no future dates).
  - Pagination controls.
  - Confirmation modals before destructive operations.

- **Defensive CSV Import**:
  - Fault-tolerant ingestion endpoint (`POST /api/expenses/import-csv`).
  - Automatically handles currency symbols (`$`, `€`, `£`, `USD`), commas (`1,250.00`), multiple date formats (`YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`), and case-insensitive categories/payment methods.
  - Never crashes the batch import on single-row errors; persists valid rows in a transaction and returns an itemized row-level rejection log with accurate line numbers and error reasons.
  - In-app sample CSV download button.

- **Category Budgets & Utilization**:
  - Persistent monthly targets for all 7 standard categories (Housing, Food, Utilities, Transport, Entertainment, Healthcare, Misc).
  - Real-time utilization calculation: $\text{Percentage} = (\text{MTD Spend} / \text{Monthly Budget Target}) \times 100$.
  - Three visual threshold alerts:
    - `OK`: Below 80%.
    - `WARNING`: From 80% to 99.99%.
    - `EXCEEDED`: 100% or above (Budget Overrun).
  - Gracefully handles unconfigured categories as `UNSET` without division by zero.

- **Thirty-Day Cashflow Forecast Engine**:
  - Formula:
    $$\text{Projected 30-Day Outflow} = \text{Scheduled Renewals in Window} + (\text{Historical Average Daily Discretionary Spend} \times 30)$$
  - Baseline window: 30 preceding calendar days.
  - Forecast window: 30 future calendar days.
  - Day-by-day table and trajectory curve detailing discretionary vs. subscription outflows.
  - Empty history fallback ($0.00$) without division-by-zero crashes.

- **Dark / Light Mode**:
  - Seamless theme toggle in header with persistent storage and system preference detection.

- **One-Click Demonstration Seeding**:
  - Standalone script and in-app button (`Seed Sample Data`) to populate realistic transactions, subscriptions, and budgets.

---

## 3. Technology Stack & Architecture

### Backend
- **Python 3.10+** (Tested and verified on Python 3.14.2)
- **FastAPI**: Asynchronous web framework with automatic OpenAPI docs.
- **Uvicorn**: High-performance ASGI web server.
- **SQLAlchemy 2.0 ORM**: Strict typed declarative models and session lifecycle.
- **SQLite**: Local relational database with ACID persistence.
- **Pydantic v2**: Request validation, response serialization, and boundary checks.
- **Python Decimal**: Exact monetary calculations with `ROUND_HALF_UP` rounding.
- **python-dateutil & calendar**: Leap-year and calendar arithmetic.
- **pytest & pytest-cov**: Automated testing suite with **82% verified test coverage**.
- **Ruff**: Modern Python linter (zero lint errors).

### Frontend
- **React 19 with Vite**
- **TypeScript**
- **Tailwind CSS v3.4**
- **Recharts**: Responsive financial charts (Donut, Composed Area & Bar).
- **Lucide React**: Modern icon set.
- **Axios**: Configured API client with custom error envelopes and timeout handling.

---

## 4. Repository Structure

```
fintrack-assignment/
├── backend/
│   ├── app/
│   │   ├── models/           # SQLAlchemy 2.0 ORM models (Expense, Subscription, Budget)
│   │   ├── schemas/          # Pydantic v2 validation schemas
│   │   ├── routers/          # FastAPI routers (expenses, subscriptions, budgets, analytics, system)
│   │   ├── services/         # Pure calculation engines (burn rate, forecast, budget, ledger)
│   │   ├── utils/            # Defensive CSV parser, exceptions, error envelopes
│   │   ├── database.py       # Engine, sessionmaker, get_db dependency
│   │   └── main.py           # FastAPI entry point, CORS, exception handlers
│   ├── tests/                # Comprehensive unit and integration pytest suite
│   ├── Dockerfile            # Container configuration for backend
│   ├── requirements.txt      # Python dependencies
│   ├── ruff.toml             # Linter configuration
│   ├── sample_expenses.csv   # Sample CSV file with valid and edge-case invalid rows
│   └── seed.py               # Standalone database seeding script
├── frontend/
│   ├── src/
│   │   ├── components/       # Modals, charts, cards, empty states, toasts
│   │   ├── layouts/          # Sidebar navigation, Header, responsive drawer
│   │   ├── pages/            # Overview, Expenses, Subscriptions, Budgets, Analytics
│   │   ├── services/         # Axios API client functions
│   │   ├── types/            # TypeScript interfaces
│   │   └── utils/            # Currency/date formatters, category colors, status styles
│   ├── Dockerfile            # Multi-stage production container
│   ├── nginx.conf            # Nginx reverse proxy configuration
│   ├── package.json          # Node dependencies and scripts
│   ├── tailwind.config.js    # Tailwind configuration
│   └── vite.config.ts        # Vite configuration with API reverse proxy
├── docker-compose.yml        # Multi-container orchestration
├── .gitignore                # Git exclusions for Python, SQLite, and Node
└── README.md                 # Complete documentation
```

---

## 5. Prerequisites

- **Python**: Version 3.10 or higher.
- **Node.js**: Version 18 or higher (Node 20+ recommended).
- **npm**: Version 9 or higher.
- *(Optional)* **Docker & Docker Compose**: For containerized execution.

---

## 6. Installation & Setup

### A. Clone the Repository
```bash
git clone <repository-url>
cd "fintrack-assignment"
```

### B. Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   - **Windows**:
     ```powershell
     python -m venv .venv
     .venv\Scripts\activate
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
3. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Seed the SQLite database with realistic demonstration data:
   ```bash
   python seed.py
   ```

### C. Frontend Setup
1. Open a new terminal in the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```

---

## 7. Running the Application

### Option 1: Running Locally (Development Mode)

1. **Start the Backend Server**:
   From `backend/` (with `.venv` activated):
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   *The backend will be available at `http://127.0.0.1:8000`.*
   *Interactive Swagger API documentation will be at `http://127.0.0.1:8000/docs`.*

2. **Start the Frontend Client**:
   From `frontend/`:
   ```bash
   npm run dev
   ```
   *The frontend dashboard will be available at `http://127.0.0.1:5173`.*

---

### Option 2: Running with Docker Compose (Production Mode)

To start both services inside Docker containers:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

---

## 8. Application URLs

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | `http://127.0.0.1:5173` | React Dashboard UI |
| **Backend API Health** | `http://127.0.0.1:8000/api/health` | Health Check Endpoint |
| **Interactive OpenAPI Docs** | `http://127.0.0.1:8000/docs` | Swagger UI for testing API endpoints |
| **ReDoc Documentation** | `http://127.0.0.1:8000/redoc` | Alternative API reference format |

---

## 9. Automated Testing & Code Quality

### Running Backend Tests
Execute pytest with verbose output and coverage reporting:
```bash
cd backend
pytest tests -v --cov=app --cov-report=term-missing
```

### Measured Test Coverage
The backend test suite contains **25 comprehensive tests** covering formulas, calendar arithmetic, leap years, CSV edge cases, and REST endpoints:

```
Name                                   Stmts   Miss  Cover   Missing
--------------------------------------------------------------------
app/models/budget.py                      12      0   100%
app/models/expense.py                     28      0   100%
app/models/subscription.py                27      0   100%
app/routers/analytics.py                  23      0   100%
app/routers/budgets.py                    42      8    81%
app/routers/expenses.py                   72     12    83%
app/routers/subscriptions.py              71     17    76%
app/schemas/analytics.py                  13      0   100%
app/schemas/budget.py                     30      4    87%
app/schemas/expense.py                    66     17    74%
app/schemas/subscription.py               52     13    75%
app/services/budget_service.py            35      0   100%
app/services/finance_service.py           49      9    82%
app/services/forecast_service.py          61      7    89%
app/services/subscription_service.py      92     21    77%
app/utils/csv_parser.py                  142     30    79%
app/utils/exceptions.py                   38      3    92%
--------------------------------------------------------------------
TOTAL                                    951    167    82%
======================= 25 passed in 1.53s =======================
```
*Measured Total Service & Logic Coverage: **82%** (exceeds the 70% requirement).*

### Running Python Linter (Ruff)
```bash
cd backend
ruff check app tests
```
*(All checks pass with zero warnings or errors).*

### Running Frontend Production Build & Typecheck
```bash
cd frontend
npm run build
```
*(TypeScript check and Vite bundle build succeed cleanly with zero errors).*

---

## 10. REST API Specification

### Common Error Envelope
All error responses adhere to the standard envelope:
```json
{
  "success": false,
  "error_code": "RESOURCE_NOT_FOUND",
  "message": "Expense with ID '999' was not found.",
  "details": []
}
```

### Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status |
| `POST` | `/api/seed` | Seed realistic demonstration data into SQLite |
| `GET` | `/api/expenses` | List expenses (supports `search`, `category`, `start_date`, `end_date`, `limit`, `offset`, `sort_by`, `order`) |
| `POST` | `/api/expenses` | Create a new expense record |
| `GET` | `/api/expenses/{id}` | Retrieve expense details by ID |
| `DELETE` | `/api/expenses/{id}` | Delete expense by ID |
| `POST` | `/api/expenses/import-csv` | Defensive CSV ingestion with row-level validation |
| `GET` | `/api/subscriptions` | List subscriptions (supports `status` filter) |
| `POST` | `/api/subscriptions` | Create subscription with automated renewal date calculation |
| `GET` | `/api/subscriptions/{id}` | Retrieve subscription details by ID |
| `PATCH` | `/api/subscriptions/{id}` | Update subscription cost, status (active/paused/cancelled), cycle, auto-renew |
| `DELETE` | `/api/subscriptions/{id}` | Delete subscription by ID |
| `GET` | `/api/budgets` | List all configured category monthly budget targets |
| `GET` | `/api/budgets/utilization` | Retrieve live budget utilization across all categories with thresholds |
| `POST` | `/api/budgets` | Upsert monthly target limit for a category |
| `DELETE` | `/api/budgets/{id}` | Delete category budget limit |
| `GET` | `/api/analytics/summary` | Consolidated metrics for overview dashboard |
| `GET` | `/api/analytics/forecast` | Detailed 30-day daily cashflow trajectory |

---

## 11. Architectural Decisions & Assumptions

1. **Decimal Monetary Arithmetic**:
   All monetary amounts in the database, schemas, and calculations use `Decimal` with `ROUND_HALF_UP` precision to two decimal places. Binary floating-point errors (e.g. `0.1 + 0.2 = 0.30000000000000004`) are prevented.

2. **Original Anchor Day Preservation**:
   A subscription created on January 31st with a monthly cycle clamps to February 28th (or February 29th in a leap year). When moving into March, instead of staying clamped on March 28th, FinTrack retrieves the stored `original_renewal_day = 31` and schedules March 31st.

3. **Upcoming Renewals & Inactive Exclusion**:
   Paused and cancelled subscriptions are strictly excluded from the baseline recurring burn rate and upcoming renewals calculation. For subscriptions with `auto_renew = False`, they are only charged on their next renewal date if it falls within the window, and do not repeat.

4. **Historical Discretionary Spend**:
   Historical average daily spending is calculated over the preceding 30 days (`[today - 30 days, today - 1 day]`). If no transactions exist, the rate defaults to `$0.00` rather than causing a division-by-zero error.

5. **Defensive CSV Parsing**:
   Rows with malformed dates, currency symbols, thousands separators, negative amounts, or unexpected categories are handled gracefully. Valid rows are committed, and invalid rows return detailed feedback with CSV line numbers.

---

## 12. Interviewer Demonstration Walkthrough Checklist

Use this 2-to-3 minute checklist to demonstrate all capabilities during technical evaluation:

1. **Overview Dashboard**:
   - Verify the 4 top KPI cards (Baseline, MTD Spend, Upcoming 7d, Top Category).
   - Inspect the Recharts Category Donut Chart and 30-Day Cashflow Projection curve.
   - Observe the Budget Status snapshot bars with `OK`, `WARNING`, and `EXCEEDED` badges.

2. **Ledger & Expense Creation**:
   - Navigate to **Expenses & Ledger**.
   - Click **Add Expense** and create a transaction (e.g., Title: `Team Lunch`, Amount: `45.00`, Category: `Food`, Date: Today, Payment: `Credit Card`).
   - Observe that the ledger updates instantly and MTD spend increases.

3. **Defensive CSV Ingestion**:
   - Click **Import CSV** on the Expenses page.
   - Click **Download Sample CSV** (which contains valid rows, as well as test invalid rows such as negative amount and bad date).
   - Upload the sample file and observe the summary cards (Imported vs. Rejected) and the row-level rejection log.

4. **Subscription Intelligence & Imminent Renewal Alert**:
   - Navigate to **Subscriptions**.
   - Note the imminent renewal badge (`Renews Tomorrow` / `Urgent`) on subscriptions renewing within 48 hours.
   - Click the **Pause** icon on an active subscription; observe that its status changes to `Paused` and the active monthly burn rate recalculates immediately.

5. **Budget Overrun & Utilization Alerts**:
   - Navigate to **Category Budgets**.
   - Inspect categories with `OK` ($<80\%$), `WARNING` ($80\%-99\%$), and `EXCEEDED` ($\ge 100\%$) states.
   - Click the edit pencil on a category to adjust its monthly limit and watch the threshold update dynamically.

6. **Cashflow Forecasting**:
   - Navigate to **Analytics & Forecast**.
   - Review the mathematical formula breakdown banner and component cards.
   - Scroll through the 30-Day Outflow Schedule table and note days with scheduled subscription renewals highlighted.

7. **Dark Mode & Demonstration Reset**:
   - Click the Moon/Sun toggle in the header to switch between light and dark themes.
   - Click **Seed Sample Data** in the header to reset the database to a fresh demonstration state at any time.

8. **Automated Test Suite**:
   - Run `pytest tests -v --cov=app` in `backend` to demonstrate the **82% test coverage** and 25 passing unit/integration tests.
