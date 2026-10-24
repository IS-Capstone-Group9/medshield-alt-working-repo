-- Optional operational ledger. Run through a reviewed migration process, never at gateway startup.
-- This schema does not replace Databricks dashboard analytics or Supabase identity.
BEGIN;
CREATE SCHEMA IF NOT EXISTS medshield_operations;
REVOKE ALL ON SCHEMA medshield_operations FROM PUBLIC;

CREATE TABLE medshield_operations.schema_version (version integer PRIMARY KEY, installed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE medshield_operations.product (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku text UNIQUE NOT NULL, name text NOT NULL, brand_name text,
  therapeutic_category text CHECK(therapeutic_category IN ('ANTIBIOTICS','CARDIOVASCULAR','ONCOLOGY','ANALGESICS','RESPIRATORY','DIABETES_CARE')),
  identity_status text NOT NULL DEFAULT 'needs_review' CHECK(identity_status IN ('approved','needs_review')),
  category_status text NOT NULL DEFAULT 'needs_review' CHECK(category_status IN ('approved','needs_review')),
  packaging_unit text NOT NULL, units_per_pack integer NOT NULL CHECK(units_per_pack > 0),
  unit_price numeric(14,2) NOT NULL CHECK(unit_price >= 0), cost_price numeric(14,2) NOT NULL CHECK(cost_price >= 0),
  safety_stock integer CHECK(safety_stock >= 0), reorder_point integer CHECK(reorder_point >= 0),
  lead_time_days integer NOT NULL DEFAULT 60 CHECK(lead_time_days BETWEEN 1 AND 365),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_category ON medshield_operations.product(therapeutic_category);
CREATE TABLE medshield_operations.client (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), account_code text UNIQUE NOT NULL, name text NOT NULL,
  category text NOT NULL CHECK(category IN ('HOSPITAL','CLINIC','RETAIL','OTHER')), region text NOT NULL,
  credit_limit numeric(14,2) CHECK(credit_limit >= 0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE medshield_operations.inventory_lot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES medshield_operations.product(id),
  lot_number text NOT NULL, expires_on date NOT NULL, units_on_hand integer NOT NULL CHECK(units_on_hand >= 0),
  verified_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(product_id,lot_number)
);
CREATE INDEX inventory_expiry ON medshield_operations.inventory_lot(product_id,expires_on);
CREATE TABLE medshield_operations.sales_receipt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), receipt_number text UNIQUE NOT NULL,
  client_id uuid NOT NULL REFERENCES medshield_operations.client(id), delivery_date date NOT NULL,
  gross_amount numeric(14,2) NOT NULL CHECK(gross_amount >= 0), vat_amount numeric(14,2) NOT NULL CHECK(vat_amount >= 0),
  withholding_tax numeric(14,2) NOT NULL CHECK(withholding_tax >= 0), net_amount numeric(14,2) NOT NULL CHECK(net_amount >= 0),
  status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','COMMITTED','DELIVERED','VOUCHER_ATTACHED','RECONCILED','VOID')),
  evidence_class text NOT NULL CHECK(evidence_class IN ('verified_receipt','unverified','synthetic_test_fixture')),
  source_document_sha256 text CHECK(source_document_sha256 ~ '^[a-f0-9]{64}$'), audited_at timestamptz, audited_by text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(gross_amount - withholding_tax = net_amount), CHECK(vat_amount <= gross_amount),
  CHECK(evidence_class <> 'verified_receipt' OR (source_document_sha256 IS NOT NULL AND audited_at IS NOT NULL AND audited_by IS NOT NULL))
);
CREATE INDEX receipt_period ON medshield_operations.sales_receipt(delivery_date);
CREATE INDEX receipt_client ON medshield_operations.sales_receipt(client_id);
CREATE TABLE medshield_operations.sales_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), receipt_id uuid NOT NULL REFERENCES medshield_operations.sales_receipt(id),
  product_id uuid NOT NULL REFERENCES medshield_operations.product(id), quantity integer NOT NULL CHECK(quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK(unit_price >= 0),
  subtotal numeric(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  lot_number text NOT NULL, expiration_date date NOT NULL
);
CREATE INDEX item_receipt ON medshield_operations.sales_item(receipt_id);
CREATE INDEX item_product ON medshield_operations.sales_item(product_id);
CREATE TABLE medshield_operations.ledger_payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), receipt_id uuid NOT NULL REFERENCES medshield_operations.sales_receipt(id),
  ledger_reference text UNIQUE NOT NULL, amount numeric(14,2) NOT NULL CHECK(amount >= 0),
  status text NOT NULL CHECK(status IN ('POSTED','VOID')), paid_on date NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_receipt ON medshield_operations.ledger_payment(receipt_id);
CREATE TABLE medshield_operations.withholding_voucher (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), receipt_id uuid NOT NULL REFERENCES medshield_operations.sales_receipt(id),
  voucher_reference text UNIQUE NOT NULL, form_code text NOT NULL DEFAULT '2307',
  amount numeric(14,2) NOT NULL CHECK(amount >= 0), recorded_rate numeric(8,6) CHECK(recorded_rate BETWEEN 0 AND 1),
  taxable_basis numeric(14,2) CHECK(taxable_basis >= 0), document_sha256 text CHECK(document_sha256 ~ '^[a-f0-9]{64}$'), verified_at timestamptz,
  CHECK(verified_at IS NULL OR document_sha256 IS NOT NULL)
);
CREATE INDEX voucher_receipt ON medshield_operations.withholding_voucher(receipt_id);

-- These are operational preparation/audit records, never a runtime analytical fallback.
CREATE TABLE medshield_operations.monthly_sales_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid REFERENCES medshield_operations.product(id),
  period text NOT NULL CHECK(period ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  total_revenue numeric(14,2) NOT NULL, baseline_trend numeric(14,2) NOT NULL,
  seasonal_cycle numeric(14,2) NOT NULL, unexplained_variance numeric(14,2) NOT NULL,
  units_sold bigint CHECK(units_sold >= 0), order_count bigint CHECK(order_count >= 0), source_checksum text NOT NULL,
  evidence_class text NOT NULL CHECK(evidence_class IN ('candidate','synthetic_test_fixture')),
  CHECK(total_revenue = baseline_trend + seasonal_cycle + unexplained_variance)
);
CREATE UNIQUE INDEX monthly_product_period ON medshield_operations.monthly_sales_evidence(period,product_id) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX monthly_company_period ON medshield_operations.monthly_sales_evidence(period) WHERE product_id IS NULL;
CREATE TABLE medshield_operations.forecast_run (
  id text PRIMARY KEY, anchor_period text NOT NULL CHECK(anchor_period ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  source_checksum text NOT NULL, dataset_id text NOT NULL, fact_version bigint NOT NULL CHECK(fact_version >= 0),
  publication_status text NOT NULL DEFAULT 'candidate' CHECK(publication_status IN ('candidate','reviewed','rejected')),
  payload_sha256 text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE medshield_operations.product_forecast (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id text NOT NULL REFERENCES medshield_operations.forecast_run(id),
  product_id uuid NOT NULL REFERENCES medshield_operations.product(id), forecast_period text NOT NULL CHECK(forecast_period ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  scenario text NOT NULL CHECK(scenario IN ('none','monsoon','typhoon','conservative')),
  projected_units bigint CHECK(projected_units >= 0), projected_sales numeric(14,2), lower80 numeric(14,2), upper80 numeric(14,2),
  lower95 numeric(14,2), upper95 numeric(14,2), po_cutoff_date date NOT NULL,
  UNIQUE(run_id,product_id,forecast_period,scenario), CHECK(lower80 <= upper80), CHECK(lower95 <= upper95)
);
CREATE TABLE medshield_operations.allocation_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES medshield_operations.product(id),
  client_id uuid NOT NULL REFERENCES medshield_operations.client(id), target_period text NOT NULL CHECK(target_period ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  requested_units integer NOT NULL CHECK(requested_units >= 0), usable_units_before_expiry integer NOT NULL CHECK(usable_units_before_expiry >= 0),
  approved_at timestamptz, UNIQUE(product_id,client_id,target_period)
);
CREATE TABLE medshield_operations.order_allocation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), batch_code text NOT NULL, client_id uuid NOT NULL REFERENCES medshield_operations.client(id),
  product_id uuid NOT NULL REFERENCES medshield_operations.product(id), requested_units integer NOT NULL CHECK(requested_units >= 0),
  allocated_units integer NOT NULL CHECK(allocated_units >= 0 AND allocated_units <= requested_units),
  safety_buffer integer NOT NULL CHECK(safety_buffer >= 0), projected_unused_pct numeric(7,4) CHECK(projected_unused_pct BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'SCENARIO' CHECK(status IN ('SCENARIO','REVIEWED','REJECTED')), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(batch_code,product_id,client_id)
);

CREATE FUNCTION medshield_operations.enforce_receipt_reconciliation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE receipt_key uuid; r medshield_operations.sales_receipt; items numeric; paid numeric; withheld numeric;
BEGIN
  IF TG_OP='UPDATE' AND TG_TABLE_NAME <> 'sales_receipt' THEN
    IF NEW.receipt_id <> OLD.receipt_id THEN RAISE EXCEPTION 'Receipt evidence cannot be reparented'; END IF;
  END IF;
  IF TG_TABLE_NAME='sales_receipt' THEN receipt_key := COALESCE(NEW.id,OLD.id); ELSE receipt_key := COALESCE(NEW.receipt_id,OLD.receipt_id); END IF;
  SELECT * INTO r FROM medshield_operations.sales_receipt WHERE id=receipt_key FOR UPDATE;
  IF NOT FOUND OR r.status <> 'RECONCILED' THEN RETURN NULL; END IF;
  SELECT SUM(subtotal) INTO items FROM medshield_operations.sales_item WHERE receipt_id=r.id;
  SELECT SUM(amount) INTO paid FROM medshield_operations.ledger_payment WHERE receipt_id=r.id AND status='POSTED';
  SELECT SUM(amount) INTO withheld FROM medshield_operations.withholding_voucher WHERE receipt_id=r.id AND verified_at IS NOT NULL;
  IF r.evidence_class <> 'verified_receipt' OR items IS NULL OR paid IS NULL OR items+r.vat_amount <> r.gross_amount OR paid <> r.net_amount OR COALESCE(withheld,0) <> r.withholding_tax OR EXISTS(SELECT 1 FROM medshield_operations.withholding_voucher WHERE receipt_id=r.id AND verified_at IS NULL) THEN
    RAISE EXCEPTION 'Receipt lacks complete reconciled evidence';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER receipt_balance AFTER INSERT OR UPDATE ON medshield_operations.sales_receipt DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION medshield_operations.enforce_receipt_reconciliation();
CREATE CONSTRAINT TRIGGER item_balance AFTER INSERT OR UPDATE OR DELETE ON medshield_operations.sales_item DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION medshield_operations.enforce_receipt_reconciliation();
CREATE CONSTRAINT TRIGGER payment_balance AFTER INSERT OR UPDATE OR DELETE ON medshield_operations.ledger_payment DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION medshield_operations.enforce_receipt_reconciliation();
CREATE CONSTRAINT TRIGGER withholding_balance AFTER INSERT OR UPDATE OR DELETE ON medshield_operations.withholding_voucher DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION medshield_operations.enforce_receipt_reconciliation();

-- Default-deny browser/database access. A dedicated server role must be provisioned separately.
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='medshield_operations' LOOP
    EXECUTE format('ALTER TABLE medshield_operations.%I ENABLE ROW LEVEL SECURITY',t.tablename);
    EXECUTE format('REVOKE ALL ON medshield_operations.%I FROM PUBLIC',t.tablename);
  END LOOP;
END $$;
INSERT INTO medshield_operations.schema_version(version) VALUES (1);
COMMIT;
