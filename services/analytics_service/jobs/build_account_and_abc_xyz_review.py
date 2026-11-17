"""Build offline candidate review JSON from explicitly assessed JSON records.

Run from repository root with python -m services.analytics_service.jobs.
build_account_and_abc_xyz_review --help. This does not ingest or publish Gold.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from services.analytics_service.account_priority import (
    abc_xyz_review, account_inactivity_review, join_reviewed_accounts,
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--records", type=Path, required=True)
    parser.add_argument("--reviewed-mappings", type=Path, required=True)
    parser.add_argument("--dataset-id", required=True)
    parser.add_argument("--policy-version", required=True)
    parser.add_argument("--last-closed-month", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    records = json.loads(args.records.read_text(encoding="utf-8"))
    mappings = json.loads(args.reviewed_mappings.read_text(encoding="utf-8"))
    joined = join_reviewed_accounts(records, mappings, dataset_id=args.dataset_id,
                                    policy_version=args.policy_version)
    result = {"account_join_audit": joined["audit"],
              "product_review": abc_xyz_review(records, dataset_id=args.dataset_id,
                                                policy_version=args.policy_version),
              "account_inactivity": account_inactivity_review(
                  joined["rows"], last_closed_month=args.last_closed_month),
              "input_sha256": {str(p): hashlib.sha256(p.read_bytes()).hexdigest()
                               for p in (args.records, args.reviewed_mappings)},
              "candidate_only": True, "operational_approval": False}
    # Avoid accidental overwrite of an earlier review artifact.
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8") as handle:
        json.dump(result, handle, ensure_ascii=False, indent=2, allow_nan=False)
        handle.write("\n")


if __name__ == "__main__":
    main()
