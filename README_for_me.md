# Retention Agent Tool — Presentation & Q&A Guide

Detailed guide for understanding the project and preparing for interview questions.

---

## Project Structure

```
data-solutions-engineer-case/
├── app/
│   ├── page.tsx                    # Customer overview (chart, cards, table)
│   ├── customers/[id]/page.tsx     # Customer detail view
│   ├── api/
│   │   ├── customers/route.ts           # GET all customers + classification
│   │   ├── customers/[id]/route.ts     # GET single customer detail
│   │   └── customers/status-over-time/route.ts  # GET weekly status counts
│   │   └── retention-calls/route.ts    # POST new retention call
│   └── layout.tsx
├── lib/
│   ├── classification.ts           # Churn classification logic
│   ├── db.ts                       # PostgreSQL connection pool
│   └── format.ts                   # Cents → EUR display formatting
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── migrations/001_retention_calls.sql
└── README.md
```

---

## Data Flow

### Overview Page
1. **Fetch**: `GET /api/customers` → returns all merchants with status, risk_reason, metrics
2. **Chart**: `GET /api/customers/status-over-time?weeks=12` → weekly status counts
3. **UI**: Summary cards (filter on click) → Search/filters → Sortable table → Pagination (10/page)

### Customer Detail Page
1. **Fetch**: `GET /api/customers/[id]` → customer, transactions (500), monthly volume, retention calls
2. **Log call**: `POST /api/retention-calls` with `{ customerId, outcome, notes }` → optimistic UI update

### Classification (computed on read)
- Inputs: `daysSinceLastTransaction`, `transactionCount90d`, `volume30d`, `volumePrior30d`, `avgMonthlyVolumeEur`, `merchantSegment`
- Output: `{ status, reason }` — never stored in DB

---

## Database Schema

| Table | Purpose |
|------|---------|
| `dim_customer` | Merchant metadata (company, contact, country, segment) |
| `fct_transactions` | Transaction records; `transaction_amount_eur` in **cents** |
| `retention_calls` | Logged outreach (customer_id, call_timestamp, outcome, notes) |

**Important**: Amounts are stored in cents. `lib/format.ts` converts for display.

---

## Classification Logic (Detailed)

**File**: `lib/classification.ts`

### Thresholds (adjustable)
```typescript
ACTIVE_DAYS: 30      // Last txn within 30d → Active
AT_RISK_DAYS: 90     // Last txn 31–90d → At Risk; >90d → Inactive
VOLUME_DECLINE_PCT: 0.5   // volume30d < 50% of baseline → At Risk
PERIOD_DECLINE_PCT: 0.7   // volume30d < 70% of prior 30d → At Risk
```

### Segment-specific recency
| Segment | Active (days) | At Risk (days) |
|---------|---------------|----------------|
| micro   | 14            | 60             |
| small   | 30            | 90             |
| medium/large | 45       | 120            |

### Decision order
1. No txns in 90d → **Inactive**
2. Days since last > atRiskDays → **Inactive**
3. Days in 31–90 window OR volume decline OR period decline → **At Risk**
4. Else → **Active**

### Baseline (avg_monthly_volume_eur)
- **Computed** from `fct_transactions`: `total_volume / GREATEST(months_span, 1)`
- Not from `dim_customer.avg_monthly_volume_eur` (stored values had scaling issues)

---

## Evaluation Criteria — Suggested Answers

### Data reasoning

**Q: Sensible churn/risk classification logic?**
- Multi-signal: recency (primary), volume vs baseline, period-over-period
- Segment-aware: micro merchants more sensitive
- Explainable: `risk_reason` shown per merchant (e.g. "volume 30d (7% of baseline)")
- Adjustable: all thresholds in `CLASSIFICATION_THRESHOLDS`

**Q: Appropriate aggregation of transaction data?**
- 30d, 60d, 90d windows for volume and counts
- Prior 30d (31–60 days ago) for period-over-period
- All-time for baseline (avg monthly)
- Amounts in cents; display uses `formatVolumeCents`

---

### Architecture

**Q: Separation between API, UI, and data access?**
- **API**: `app/api/*` — HTTP handlers, call `lib/classification` and `lib/db`
- **UI**: `app/page.tsx`, `app/customers/[id]/page.tsx` — React, fetch APIs, no DB access
- **Data**: `lib/db.ts` (pool), SQL in route handlers (no ORM)

**Q: Maintainable project structure?**
- `lib/` for shared logic (classification, format, db)
- API routes colocated with app
- Single source of truth for classification in `lib/classification.ts`

---

### Code quality

**Q: Readability?**
- Named thresholds, clear variable names
- Comments on classification rules
- TypeScript types for API responses

**Q: Simplicity?**
- No ORM, raw SQL
- Client-side filtering/sorting for current scale
- Minimal dependencies (Next.js, pg, recharts)

**Q: Consistency?**
- Same classification used in overview, detail, status-over-time
- Shared `formatVolumeCents` for all amount display
- Consistent status colors (green/amber/red)

---

### Product thinking

**Q: Does the tool solve the retention workflow effectively?**
- **Overview**: At-a-glance counts, chart for trends, filterable/sortable table, risk-first ordering
- **Detail**: Full context (transactions, monthly volume, retention history) before calling
- **Logging**: Log calls without page refresh; outcome + notes
- **risk_reason**: Explains why each merchant is classified, supports agent judgment

---

## Key Implementation Details

### Status-over-time chart
- API runs classification for each of the last N weeks (as-of each week end)
- Filters `fct_transactions` by date for historical accuracy
- Only includes merchants who existed at week end (`merchant_created_at <= weekEnd`)

### Pagination & sorting
- Default sort: Days Since Last (desc) — most urgent first
- All columns sortable; page resets when filters change
- 10 merchants per page

### Retention call logging
- `POST /api/retention-calls` with `customerId`, `outcome`, `notes`
- `call_timestamp` set server-side
- Frontend appends new call to list without refetch

---

## Potential Interview Questions & Answers

**Why compute status on read instead of storing it?**
- Always up to date with latest transactions
- No ETL or batch jobs
- Classification logic can change without data migration

**Why not use dim_customer.avg_monthly_volume_eur?**
- Sanity check showed stored values ~10x too high for most rows
- Computed from `fct_transactions` is consistent and correct

**Why segment-specific thresholds?**
- Micro merchants may churn faster with less activity
- One-size-fits-all would misclassify small vs large merchants

**How would you scale this for 10,000+ merchants?**
- Server-side pagination and filtering
- Cache status-over-time or materialize weekly snapshots
- Consider background job for classification if real-time not required
