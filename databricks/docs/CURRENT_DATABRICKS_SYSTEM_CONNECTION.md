# Connect the Current Databricks Workspace to MedShield

Last updated: 2026-09-14

## Connection design

MedShield connects through its TypeScript backend. The browser sends the signed-in
administrator's Supabase token to the backend. Only the backend stores and uses the
Databricks credential. The backend calls the Databricks SQL Statement Execution API,
validates nine yearly candidate rows, and can copy that controlled snapshot into the
protected Supabase candidate cache.

The rebuilt sales pipeline publishes `sales_restart_*_candidate` tables. The current
application consumes a fixed 47-column yearly contract, so run the versioned bridge
SQL before changing credentials.

## Step 1 — Publish and validate the bridge view in Databricks

1. Confirm `01_sales_bronze.py`, `02_sales_silver.py`, and `03_sales_gold.py` have
   completed successfully in the current workspace.
2. Open **SQL Editor** in Databricks and select the SQL warehouse MedShield will use.
3. Open `databricks/sql/05_sales_restart_system_bridge.sql` in the local project,
   copy the complete script into a new Databricks SQL query, and run it.
4. Confirm the contract-check result:

| Check | Expected value |
|---|---:|
| `yearly_rows` | 9 |
| `minimum_year` | 2017 |
| `maximum_year` | 2025 |
| `distinct_years` | 9 |
| `accepted_transactions` | 37,178 |
| `minimum_calendar_months` | 12 |
| `maximum_calendar_months` | 12 |
| `eligibility_reconciliation_failures` | 0 |

The bridge view is
`workspace.medshield_gold.vw_dashboard_yearly_sales_candidate`. It does not publish
the records as approved medical demand or merge the 21,456 review-only source rows
into analytical totals.

## Step 2 — Get the three private connection values

### Workspace host

Copy the origin shown in the current Databricks browser address bar, including
`https://` and excluding any path after the hostname.

### SQL warehouse ID

1. In Databricks, open **SQL Warehouses**.
2. Select the warehouse used in Step 1.
3. Open **Connection details** and find **HTTP path**.
4. Copy only the letters and numbers after `/sql/1.0/warehouses/`.

### Access token

1. Open your Databricks user settings.
2. Open **Developer**, then **Access tokens**.
3. Generate a token for the MedShield backend and copy it immediately.
4. Give the token's identity **CAN USE** on the selected SQL warehouse plus
   `USE CATALOG`, `USE SCHEMA`, and `SELECT` access for the bridge view and its
   source tables.

Keep the token in `backend/.env` only. Never put it in `frontend/.env.local`, a
notebook, a screenshot, Git, or a chat message.

## Step 3 — Replace the old workspace values locally

Edit `backend/.env` and replace the old account values:

```dotenv
DATABRICKS_HOST=https://your-current-workspace-host
DATABRICKS_TOKEN=your-current-token
DATABRICKS_SQL_WAREHOUSE_ID=the-id-after-sql-1.0-warehouses
DATABRICKS_CATALOG=workspace
DATABRICKS_SCHEMA=medshield_gold
```

Do not paste the entire HTTP path into `DATABRICKS_SQL_WAREHOUSE_ID`.

## Step 4 — Run the backend extraction check

From PowerShell:

```powershell
cd C:\Users\Adrian\projects\medshield1\medshield\backend
npm run build
npm run databricks:extract:sales
```

The successful extraction should report 9 rows, 47 columns, 2017-2025, and 37,178
source transactions. The command updates the candidate evidence files under
`outputs/databricks`.

If the command reports HTTP 401, replace the token. For HTTP 403, fix warehouse or
Unity Catalog permissions. A statement failure mentioning a missing relation means
the bridge SQL was not run in this workspace or the catalog/schema names differ.

## Step 5 — Start MedShield and verify the live connection

Open two PowerShell terminals.

Backend:

```powershell
cd C:\Users\Adrian\projects\medshield1\medshield\backend
npm run dev
```

Frontend:

```powershell
cd C:\Users\Adrian\projects\medshield1\medshield\frontend
npm run dev
```

Open `http://localhost:3000`, sign in with a MedShield administrator account, and
go to **View Sales Data**. Click **Verify Gold Connection**. The result must show:

- Connected
- `workspace.medshield_gold.vw_dashboard_yearly_sales_candidate`
- 2017-2025
- 9 years
- 9 yearly rows

This proves the live Databricks connection. It has not copied or published the data.

## Step 6 — Synchronize the protected candidate cache

Confirm Supabase migrations 013, 014, and 015 are applied to the MedShield Supabase
project and that the backend has a server-only `SUPABASE_SECRET_KEY` or
`SUPABASE_SERVICE_ROLE_KEY`. After the connection check passes, click
**Sync Yearly Gold Data** once.

Expected reconciliation:

- extracted rows: 9
- loaded rows: 9
- years: 2017-2025
- source transactions: 37,178
- loaded transactions: 37,178
- candidate cache synchronized

This cache is a controlled integration checkpoint. The existing public dashboard
facts do not automatically switch to this source. Monthly, territory, product, and
transaction-level publication require their own reviewed contracts after this yearly
pilot passes.
