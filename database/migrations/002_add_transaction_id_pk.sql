-- Add transaction_id as primary key to fct_transactions
-- Run this BEFORE prisma generate if your table already exists without a PK.
--
-- WARNING: This will fail if:
-- 1. transaction_id has NULL values
-- 2. transaction_id has duplicate values
--
-- Check first:
--   SELECT COUNT(*) FROM fct_transactions WHERE transaction_id IS NULL;
--   SELECT transaction_id, COUNT(*) FROM fct_transactions GROUP BY transaction_id HAVING COUNT(*) > 1;

ALTER TABLE fct_transactions
  ALTER COLUMN transaction_id SET NOT NULL;

ALTER TABLE fct_transactions
  ADD PRIMARY KEY (transaction_id);
