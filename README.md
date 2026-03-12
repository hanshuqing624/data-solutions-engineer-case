# Retention Agent Tool — Flatpay Case

A small internal tool that helps retention agents monitor merchant activity, identify customers at risk of churn, and log outreach.

## Setup

```bash
# Install dependencies
npm install

# Create database and load seed data (PostgreSQL required)
createdb data_solutions_project
psql -d data_solutions_project -f database/seed.sql

# Run migration for retention_calls table
psql -d data_solutions_project -f database/migrations/001_retention_calls.sql

# Set environment
cp .env.example .env.local  # Add DATABASE_URL=postgresql://user:pass@localhost:5432/data_solutions_project

# Start dev server
npm run dev
```

## Customer Risk Classification Logic

- **Active**: Last transaction within 30 days (14 for micro merchants), no decline signals.
- **At Risk**: (1) Last transaction 31–90 days ago, or (2) Volume decline: last 30d &lt; 50% of merchant’s baseline, or (3) Period-over-period: last 30d &lt; 70% of prior 30d.
- **Inactive**: No transactions in last 90 days, or last transaction &gt; 90 days ago.

**Segment-aware**: micro merchants use shorter thresholds (14/60 days). All thresholds are configurable in `lib/classification.ts`.

## Architectural Decisions

- **Next.js App Router**: Single app with API routes for backend and React for UI.
- **Compute-on-read**: Status and `risk_reason` are computed on each request, not stored.
- **Shared classification logic**: `lib/classification.ts` used by overview, detail, and status-over-time APIs.
- **Computed baseline**: `avg_monthly_volume_eur` derived from `fct_transactions` instead of stored `dim_customer` values (avoids scaling issues).

## Trade-offs

- **Client-side filtering/sorting**: Overview filters and sorts in the browser; acceptable for ~150 merchants; may need server-side pagination for larger datasets.
- **Status-over-time API**: Runs N queries per request (one per week); could be optimized with a single query or materialized view.
- **No ORM**: Raw SQL with `pg` for clarity and control; ORM would be useful for more complex schemas.
