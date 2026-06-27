# MedShield Descriptive Analytics Task Checklist

This checklist tracks the accomplished tasks and the remaining steps needed to fully build, run, and productionise the descriptive analytics logic for MedShield.

---

## 1. Accomplished Tasks (Completed)

### A. Data Ingestion & Quality Filtering
- [x] **Date Validation Filter**: Skip any transactions with missing or invalid date formats in `enrich_rows()`.
- [x] **Quality Audit Enforcement**: Exclude records marked as `"rejected"` in `quality_status` to keep the analytics baseline clean.
- [x] **Sales Acceptance Check**: Retain only clean transactions by filtering out entries that do not carry `"accepted_clean_sales"` in `sales_acceptance_status`.

### B. Segment Enrichment & Classification
- [x] **Area Roll-up & Classification**: Standardize and map arbitrary location strings to standard territories, customer channels (e.g., Government), or business lines.
- [x] **Product Master Ingestion**: Load canonical SKU names, categories, and medicine flags directly from `product_master_mapping.csv`.
- [x] **Heuristic SKU Classifier**: Implement a fallback regex classifier (`classify_product_is_medicine`) to isolate non-medical overhead (stationery, promotional apparel) from active drugs.

### C. Analytical Logic & Algorithms
- [x] **Segregated ABC/Pareto Sorting**: Split transactions into medical and non-medical streams to perform separate 80/20 revenue concentration rankings.
- [x] **Seasonality Indexing**: Aggregate quantities per month to calculate index coefficients and seasonal strength factors.
- [x] **Year-over-Year Growth Trends**: Implement temporal YoY calculations comparing current-month transactions to prior-year equivalents.
- [x] **Output File Generation**: Save clean descriptive outputs as CSV files (`descriptive_product_abc_pareto.csv`, etc.) in the outputs folder.

### D. DSS Dashboard & UI Fixes
- [x] **Canvas Reuse Collision Fix**: Resolve the Chart.js `"Canvas is already in use"` error by checking for and destroying existing chart bindings (`Chart.getChart(canvas).destroy()`).
- [x] **Transition Resize Safeguard**: Wrap chart resizing in checks (`document.body.contains()`) and `try...catch` blocks to prevent unhandled TypeErrors when switching tabs.
- [x] **Remote Synchronisation**: Push all committed refactoring changes and fixes to the alt repository branch (`feature/mod` on `https://github.com/IS-Capstone-Group9/medshield-alt-working-repo`).

---

## 2. Outstanding Tasks (Remaining Work)

### A. Template Approvals
- [ ] **Stakeholder Mapping Sign-off**: Review and approve "proposed" and "needs_review" mappings in `product_master_mapping.csv` and `area_classification_mapping.csv`.
- [ ] **Remove Draft Labels**: Transition outputs from draft to approved status once mappings are finalized.

### B. Data Cleansing & Anomaly Resolution
- [ ] **Financial Auditing**: Address warning rows flagged in the database (e.g. transactions where `net_income` exceeds `total_trade_price` or results in negative values).
- [ ] **2025 Data Completeness**: Complete the partial 2025 sales transaction records to avoid skewing YoY comparisons.

### C. Future Modeling Integrations
- [ ] **Ingest DOH & PAGASA Data**: Retrieve and format historical disease outbreak cases and rainfall measurements to unblock the predictive adjustments path.
- [ ] **Urgency Target Labeling**: Define concrete supervised classification targets (e.g. stockout threshold) to train and enable the `XGBOOST_URGENCY` model.
