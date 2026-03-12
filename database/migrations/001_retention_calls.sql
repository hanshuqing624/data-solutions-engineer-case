-- Retention calls table for logging agent interactions with merchants
CREATE TABLE IF NOT EXISTS retention_calls (
    id SERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES dim_customer(merchant_id),
    call_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    outcome VARCHAR(100),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_retention_calls_customer_id ON retention_calls(customer_id);
