import sys
from collections import defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

from services.data_pipeline import VALID_YEAR_MIN, VALID_YEAR_MAX, ingest_sales_bytes

csv_dir = Path("data/medshield/dataset_csv")
files = sorted(csv_dir.glob("medshield_data_*.csv"))

print(f"Starting batch ingestion of {len(files)} CSV files into data pipeline...")
print(f"Analysis window: {VALID_YEAR_MIN}–{VALID_YEAR_MAX}\n")

results = []
per_year_accepted: dict[str, int] = defaultdict(int)
per_year_warning: dict[str, int] = defaultdict(int)
per_year_rejected: dict[str, int] = defaultdict(int)
carryover_warnings: list[str] = []

for f in files:
    content = f.read_bytes()
    res = ingest_sales_bytes(content, f.name, persist_raw=True)
    q = res["quality"]
    years_dict: dict[str, int] = q.get("years", {})
    years_str = ", ".join(f"{y}: {c}" for y, c in years_dict.items())

    print(
        "Ingested {:<25}: Extracted={:>5}, Accepted={:>5}, Rejected={:>4}, Warnings={:>4}  Years=[{}]".format(
            f.name,
            q["rows_extracted"],
            q["rows_accepted"],
            q["rows_rejected"],
            q.get("rows_with_warnings", 0),
            years_str,
        )
    )

    # Accumulate per-year counts
    for yr, cnt in years_dict.items():
        per_year_accepted[yr] += cnt

    # Carry-over detection: flag if data years differ significantly from filename year
    # e.g. medshield_data_2019.csv with 2018 rows
    import re
    match = re.search(r"(20\d{2})", f.name)
    if match:
        file_year = match.group(1)
        for yr in years_dict:
            if yr != file_year and int(years_dict[yr]) > 10:
                carryover_warnings.append(
                    f"  ⚠  {f.name}: {years_dict[yr]} rows have year={yr} "
                    f"(expected {file_year}) — possible carry-over section"
                )

    results.append(res)

# ── Per-year quality summary table ─────────────────────────────────────────────
print()
print("=" * 65)
print(" Per-Year Accepted Row Summary")
print("=" * 65)
print(f"  {'Year':<8} {'Accepted':>10}")
print(f"  {'-'*8} {'-'*10}")
all_years_ok = True
for yr in sorted(per_year_accepted.keys()):
    cnt = per_year_accepted[yr]
    flag = ""
    try:
        yr_int = int(yr)
        if not (VALID_YEAR_MIN <= yr_int <= VALID_YEAR_MAX):
            flag = " ← OUT OF RANGE"
            all_years_ok = False
    except ValueError:
        flag = " ← INVALID YEAR"
        all_years_ok = False
    print(f"  {yr:<8} {cnt:>10}{flag}")
print()

# ── Carry-over warnings ────────────────────────────────────────────────────────
if carryover_warnings:
    print("Carry-over rows detected (delivery year ≠ workbook year):")
    for w in carryover_warnings:
        print(w)
    print()

# ── Final assertions ───────────────────────────────────────────────────────────
print("=" * 65)
print(" Verification Assertions")
print("=" * 65)

issues: list[str] = []

if not all_years_ok:
    issues.append("FAIL: Accepted rows found outside 2017–2025 range")

# Total accepted must not have regressed massively
total_accepted = sum(per_year_accepted.values())
if total_accepted < 35000:
    issues.append(f"FAIL: Total accepted rows ({total_accepted}) looks too low — check for regression")

# 2025 should have 12 months coverage (checked via the status file)
from pathlib import Path
import json, gzip

sales_gz = Path("data/medshield/processed/sales_transactions.json.gz")
if sales_gz.exists():
    with gzip.open(sales_gz, "rt", encoding="utf-8") as fh:
        data = json.load(fh)
    rows = data.get("rows", [])
    accepted_rows = [r for r in rows if r.get("quality_status") != "rejected"]

    # Year range check
    bad_year_rows = [
        r for r in accepted_rows
        if r.get("year") is not None
        and not (VALID_YEAR_MIN <= r["year"] <= VALID_YEAR_MAX)
    ]
    if bad_year_rows:
        issues.append(
            f"FAIL: {len(bad_year_rows)} accepted rows still have year outside {VALID_YEAR_MIN}–{VALID_YEAR_MAX}"
        )
    else:
        print(f"  PASS: Zero accepted rows outside {VALID_YEAR_MIN}–{VALID_YEAR_MAX}")

    # All accepted rows have area_type
    missing_area_type = [r for r in accepted_rows if not r.get("area_type")]
    if missing_area_type:
        issues.append(f"FAIL: {len(missing_area_type)} accepted rows missing area_type column")
    else:
        print(f"  PASS: All accepted rows have area_type column")

    # 2025 month coverage
    rows_2025 = [r for r in accepted_rows if r.get("year") == 2025]
    months_2025 = {r["date_delivered"][:7] for r in rows_2025 if r.get("date_delivered")}
    if len(months_2025) < 12:
        issues.append(
            f"WARN: 2025 only has {len(months_2025)} months covered: {sorted(months_2025)}"
        )
    else:
        print(f"  PASS: 2025 has all 12 months covered")

    print(f"  INFO: Total accepted rows = {len(accepted_rows):,}")
    print(f"  INFO: Total rejected rows = {sum(1 for r in rows if r.get('quality_status') == 'rejected'):,}")
    print(f"  INFO: Total warning rows  = {sum(1 for r in rows if r.get('quality_status') == 'warning'):,}")

if issues:
    print()
    print("Issues found:")
    for issue in issues:
        print(f"  {issue}")
else:
    print()
    print("All assertions passed. Dataset is analytics-ready for 2017–2025.")

print("\nBatch ingestion complete!")
