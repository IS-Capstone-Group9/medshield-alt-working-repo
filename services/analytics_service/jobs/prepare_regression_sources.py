"""Prepare approved DOH monthly regressors from the cleaned external candidates.

Run after ``prepare_external_sources``. Rows remain absent while the external
geography mapping is pending; missing signals are never filled with zero.
"""

from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

from services.analytics_service.jobs.prepare_external_sources import (
    AREA_MAPPING,
    DOH_TERRITORY_CANDIDATE,
    REPORT as EXTERNAL_REPORT,
)


ROOT = Path(__file__).resolve().parents[3]
DOH = DOH_TERRITORY_CANDIDATE
AREA_MAP = AREA_MAPPING
OUTPUT = ROOT / "data" / "medshield" / "processed" / "regression_external_monthly.json"
DISEASES = ("Dengue", "Leptospirosis", "Cholera", "Typhoid Fever")


def sha(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def prepare() -> dict[str, object]:
    if not DOH.exists() or not EXTERNAL_REPORT.exists():
        raise FileNotFoundError(
            "Cleaned external sources are missing. Run "
            "python -m services.analytics_service.jobs.prepare_external_sources first."
        )
    report = json.loads(EXTERNAL_REPORT.read_text(encoding="utf-8"))
    expected_checksum = report["doh"]["output_sha256"].get(DOH.relative_to(ROOT).as_posix())
    if expected_checksum != sha(DOH):
        raise ValueError("Cleaned DOH territory candidate is stale or modified; rebuild external sources")
    if report["area_mapping_sha256"] != sha(AREA_MAP):
        raise ValueError("External source output is stale after an area mapping change")

    rows = []
    audit = Counter()
    seen = set()
    with DOH.open(encoding="utf-8-sig", newline="") as handle:
        for raw in csv.DictReader(handle):
            audit["candidate_rows"] += 1
            if raw["signal"] not in DISEASES:
                audit["outside_model_disease_scope"] += 1
                continue
            if raw["is_external_join_ready"].lower() != "true":
                audit["external_mapping_pending_rows"] += 1
                continue
            identity = (raw["signal"], raw["territory"], raw["period"])
            if identity in seen:
                raise ValueError(f"Duplicate approved DOH monthly key: {identity}")
            seen.add(identity)
            value = float(raw["value"])
            if value < 0:
                raise ValueError(f"Negative DOH signal value: {identity}")
            rows.append(
                {
                    "provider": "DOH",
                    "signal": raw["signal"],
                    "territory": raw["territory"],
                    "period": raw["period"],
                    "value": value,
                    "unit": raw["unit"],
                    "source_rows": int(raw["source_record_count"]),
                }
            )
            audit["approved_rows"] += 1

    result = {
        "rows": rows,
        "source": {
            "file": DOH.relative_to(ROOT).as_posix(),
            "checksum": sha(DOH),
            "raw_dataset_checksum": report["doh"]["source_dataset_sha256"],
            "area_mapping_checksum": sha(AREA_MAP),
            "external_report": EXTERNAL_REPORT.relative_to(ROOT).as_posix(),
            "external_policy_version": report["policy_version"],
            "audit": dict(audit),
            "date_basis": "DOH onset month; retrospective final-revision records",
            "case_definition": "Reported non-discarded surveillance cases; not confirmed incidence",
            "coverage": "2018-2025 candidates; exact sales territory labels; external mapping approval required",
            "status": "APPROVED_EXTERNAL_ROWS_PREPARED" if rows else "BLOCKED_EXTERNAL_MAPPING_PENDING",
        },
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(OUTPUT)
    print(json.dumps({"monthly_rows": len(rows), "audit": dict(audit), "status": result["source"]["status"]}))
    return result


if __name__ == "__main__":
    prepare()
