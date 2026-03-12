# Retention Agent Tool — Flatpay Case

**Live app:** [https://data-solutions-engineer-case.vercel.app/](https://data-solutions-engineer-case.vercel.app/)  
**Source:** [https://github.com/hanshuqing624/data-solutions-engineer-case](https://github.com/hanshuqing624/data-solutions-engineer-case)

An internal tool that helps retention agents monitor merchant activity, identify customers at risk of churn, and log outreach. Status is computed from transaction data using multi-signal rules: recency, volume vs baseline, and period-over-period decline.

---

## Setup

To run the app locally:

```bash
# Install dependencies
npm install

# Create PostgreSQL database and load seed data
createdb data_solutions_project
psql -d data_solutions_project -f database/seed.sql

# Run migrations
psql -d data_solutions_project -f database/migrations/001_retention_calls.sql
psql -d data_solutions_project -f database/migrations/002_add_transaction_id_pk.sql

# Configure environment
# Create .env.local with: DATABASE_URL=postgresql://user:pass@localhost:5432/data_solutions_project

# Generate Prisma client (runs automatically on npm install)
npx prisma generate

# Start dev server
npm run dev
```

---

## Customer Risk Classification Logic

Merchants are classified into **Active**, **At Risk**, or **Inactive** using three signals:

1. **Recency** — Days since last transaction (segment-aware thresholds)
2. **Volume vs baseline** — Last 30d volume vs merchant’s average monthly volume
3. **Period-over-period** — Last 30d vs prior 30d volume

Classification is done in this order:

1. No activity in 90 days?                    → Inactive
2. Last txn > At Risk days?                   → Inactive
3. Last txn in At Risk window (active < x ≤ at risk)? → At Risk
4. Volume decline (30d < 50% baseline) or period decline (30d < 70% prior 30d)? → At Risk
5. Otherwise                                  → Active

### Segment-aware thresholds

| Segment | Active (≤ days) | At Risk (≤ days) |
|---------|-----------------|-----------------|
| micro  | 14              | 60              |
| small  | 30              | 90              |
| medium | 45              | 120             |
| large  | 45              | 120             |

Micro merchants use shorter windows to surface risk sooner.

### Transaction aggregations

Metrics are computed from `fct_transactions` using these windows (as of a given date):

| Metric | Window | Use |
|--------|--------|-----|
| `volume90d` | Last 90 days | Recency check, transaction count |
| `volume30d` | Last 30 days | Current period |
| `volumePrior30d` | Days 31–60 ago | Period-over-period comparison |
| `avgMonthlyVolumeEur` | All-time span | Baseline (volume decline threshold) |

**Volume decline:** `volume30d < 50% of avgMonthlyVolumeEur` → At Risk  
**Period decline:** `volume30d < 70% of volumePrior30d` → At Risk

Thresholds are configurable in the UI (ThresholdsPanel) and persisted in `localStorage` via `lib/classification-store.ts`.

---

## Architectural Decisions

- **Next.js App Router** — Single app with API routes for backend and React for UI.
- **Compute-on-read** — Status and `risk_reason` are computed on each request, not stored.
- **Shared classification logic** — `lib/classification-defaults.ts` used by overview, detail, and status-over-time APIs.
- **Computed baseline** — `avgMonthlyVolumeEur` derived from `fct_transactions` instead of stored `dim_customer` values (avoids scaling issues).
- **Prisma + PostgreSQL** — ORM for schema and queries; `prisma db pull` for schema sync.
- **Client-side threshold tuning** — Zustand store with persisted thresholds; overview reclassifies when thresholds change.

---

## Trade-offs

- **Client-side filtering/sorting** — Overview filters and sorts in the browser; acceptable for ~150 merchants; may need server-side pagination for larger datasets.
- **Status-over-time API** — Runs N queries per request (one per week); could be optimized with a single query or materialized view.
- **Fixed 12-week chart window** — Chart always shows the last 12 weeks from “today”; weeks outside your transaction range may show zeros (e.g. all Inactive if no data exists).
- **Thresholds in localStorage** — Threshold changes persist per browser; no server-side sync across devices.
