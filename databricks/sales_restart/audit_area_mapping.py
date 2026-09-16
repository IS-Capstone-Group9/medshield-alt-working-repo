"""Reconcile local sales-area coverage against the configured master without approvals.

Run: python databricks/sales_restart/audit_area_mapping.py
Uses the same pure notebook helpers as the regression suite; no cloud writes.
"""
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE / "tests"))
from test_restart import SalesCorpusTests, GoldClassificationTests


def run():
    SalesCorpusTests.setUpClass()
    GoldClassificationTests.setUpClass()
    helpers = GoldClassificationTests.gold
    path = ROOT / "datasources/templates/area_classification_mapping.csv"
    with path.open(encoding="utf-8-sig", newline="") as handle:
        master = helpers["reviewed_mapping"](list(csv.DictReader(handle)), "raw_area", "area")
    retained, assessed = Counter(), Counter()
    for row in SalesCorpusTests.assessed:
        if row["area"]:
            label = helpers["normalize_label"](row["area"])
            assessed[label] += 1
            if row["is_analysis_candidate"]:
                retained[label] += 1
    result = []
    for label in sorted(assessed):
        mapping = master.get(label, {})
        scope = helpers["area_scope"](label, master)
        result.append(dict(source_area=label, assessed_record_count=assessed[label],
            retained_record_count=retained[label], mapping_status=mapping.get("mapping_status", "unmapped"),
            proposed_area_type=mapping.get("area_type", "unresolved"),
            approved_geographic=scope[2], territory_id=helpers["area_metadata"](label, master)[3],
            external_join_ready=False))
    assert sum(r["retained_record_count"] for r in result) == sum(r["is_analysis_candidate"] for r in SalesCorpusTests.assessed)
    unmatched = [r["source_area"] for r in result if r["mapping_status"] == "unmapped"]
    summary = dict(mapping_sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        source_manifest=[dict(file=p.name, sha256=hashlib.sha256(p.read_bytes()).hexdigest())
            for p in sorted(SalesCorpusTests.source_dir.glob("*.csv"))],
        observed_labels=len(result), master_labels=len(master), unmatched_labels=unmatched,
        retained_records=sum(retained.values()),
        approved_territory_records=sum(r["retained_record_count"] for r in result if r["approved_geographic"]),
        pending_or_nongeographic_records=sum(r["retained_record_count"] for r in result if not r["approved_geographic"]),
        external_join_ready_records=0,
        limitations="Existing approvals are inherited, not revalidated. New mappings are proposals. No weather station/DOH join was validated.")
    output = ROOT / "outputs/area_mapping_review"
    output.mkdir(parents=True, exist_ok=True)
    with (output / "area_coverage.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(result[0]))
        writer.writeheader()
        writer.writerows(result)
    (output / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    assert not unmatched, f"Unmapped source labels: {unmatched}"
    print(json.dumps({k: v for k, v in summary.items() if k != "source_manifest"}, indent=2))


if __name__ == "__main__":
    run()
