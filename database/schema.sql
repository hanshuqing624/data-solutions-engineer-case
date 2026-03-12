-- Data Solutions Engineer Project - PostgreSQL Schema
-- Run this file to create the initial database tables
-- Tables match the 2 sheets in data/solutions case.xlsx

-- Table 1: dim_customer (from sheet 1)
CREATE TABLE IF NOT EXISTS dim_customer (
    merchant_id BIGINT PRIMARY KEY,
    company_name VARCHAR(255),
    contact_person VARCHAR(255),
    phone_number VARCHAR(50),
    address TEXT,
    country VARCHAR(10),
    product_type VARCHAR(50),
    merchant_segment VARCHAR(50),
    merchant_created_at TIMESTAMP,
    first_transaction TIMESTAMP,
    last_transaction VARCHAR(50),
    total_transactions BIGINT,
    total_volume_eur BIGINT,
    avg_ticket_eur BIGINT,
    avg_monthly_volume_eur BIGINT,
    corporate_ratio BIGINT
);

-- Table 2: fct_transactions (from sheet 2)
CREATE TABLE IF NOT EXISTS fct_transactions (
    transaction_id VARCHAR(50),
    payment_id VARCHAR(50),
    merchant_id BIGINT REFERENCES dim_customer(merchant_id),
    merchant_created_at TIMESTAMP,
    transaction_timestamp TIMESTAMP,
    country VARCHAR(10),
    currency VARCHAR(10),
    settlement_currency VARCHAR(10),
    card_country VARCHAR(10),
    card_type VARCHAR(50),
    flag_fees_missing BOOLEAN,
    flag_settlement_missing BOOLEAN,
    transaction_amount_eur BIGINT,
    transaction_amount_raw BIGINT,
    surcharge_amount_eur DOUBLE PRECISION,
    settlement_amount_raw BIGINT,
    merchant_rate BIGINT,
    cost_rate BIGINT,
    take_rate BIGINT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_fct_transactions_merchant_id ON fct_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_fct_transactions_timestamp ON fct_transactions(transaction_timestamp);

-- Table 3: retention_calls (for logging agent interactions)
CREATE TABLE IF NOT EXISTS retention_calls (
    id SERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES dim_customer(merchant_id),
    call_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    outcome VARCHAR(100),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_retention_calls_customer_id ON retention_calls(customer_id);
