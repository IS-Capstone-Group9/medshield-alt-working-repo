# MedShield Data Layout

This folder separates source files, runtime uploads, and processed analytical datasets.

## Folders

| Folder | Purpose |
|---|---|
| `raw/sales/` | Canonical raw internal sales source files. |
| `raw/sales/yearly_csv/` | Yearly CSV exports from the sales workbook. |
| `uploads/` | Runtime upload copies created by the app. Ignored by Git. |
| `processed/` | Cleaned local fallback datasets used by services and dashboard fallback logic. |

## Current Raw Sales Sources

- `raw/sales/Sales Report.xlsx`
- `raw/sales/yearly_csv/2021s.csv`
- `raw/sales/yearly_csv/2022s.csv`
- `raw/sales/yearly_csv/2023s.csv`
- `raw/sales/yearly_csv/2024s.csv`
- `raw/sales/yearly_csv/2025s.csv`

Keep raw files unchanged. Generate cleaned and modeled outputs through the scripts under `tools/` and `services/`.
