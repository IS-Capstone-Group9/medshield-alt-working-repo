"""Run an explicit offline WP8 scenario grid, never load fallback company data.

Usage from repository root:
    python -m services.analytics_service.jobs.run_eoq_rop_sensitivity input.json output_dir

Input: dataset_id, policy_version, assumption_ids, unit_scope, base_inputs and
ranges. Acquisition cost/demand status must be described in input_provenance;
the run is always an assumed scenario, regardless of the underlying source.
This produces a bounded research result, not a complete WP8 acceptance packet.
Optional scenario_register explicitly binds a validated register. Select grids
with register_range_ids (A1–A6); paths are relative to input JSON. Explicit base
values remain unchanged. Conflicting explicit ranges are rejected. A5 service
probabilities are converted to z with the standard-normal inverse CDF.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
from statistics import NormalDist

from services.analytics_service.planning_assumptions import load_register
from services.analytics_service.planning_research import eoq_sensitivity


REGISTER_FIELDS = {"A1": "holding_fraction", "A2": "order_cost", "A3": "lead_days",
                   "A4": "lead_sd_days", "A5": "service_z", "A6": "shelf_life_days"}


def register_binding(path, source_path):
    """Bind only an explicitly named register; paths are relative to input JSON."""
    if not isinstance(path, str) or not path.strip():
        raise ValueError("scenario_register must be an explicit path")
    resolved = Path(path)
    if not resolved.is_absolute():
        resolved = Path(source_path).resolve().parent / resolved
    register = load_register(resolved)
    if not isinstance(register.get("policy_version"), str) or not register["policy_version"]:
        raise ValueError("Scenario register policy_version is required")
    return register, {"scenario_register_sha256": hashlib.sha256(resolved.read_bytes()).hexdigest(),
                      "scenario_register_schema": register["schema_version"],
                      "scenario_register_policy_version": register["policy_version"]}


def selected_register_grid(payload, source):
    """Explicit selected A1–A6 grids; explicit conflicting ranges fail visibly."""
    base, ranges = dict(payload.get("base_inputs", {})), dict(payload.get("ranges", {}))
    binding = {}
    if "scenario_register" in payload:
        register, binding = register_binding(payload["scenario_register"], source)
        selected = payload.get("register_range_ids", [])
        if not isinstance(selected, list) or any(key not in REGISTER_FIELDS for key in selected) or len(selected) != len(set(selected)):
            raise ValueError("register_range_ids must contain unique A1–A6 IDs")
        parameters = {parameter["id"]: parameter for parameter in register["parameters"]}
        for identity in selected:
            parameter, key = parameters[identity], REGISTER_FIELDS[identity]
            transform = (lambda probability: NormalDist().inv_cdf(probability)) if identity == "A5" else float
            if identity == "A5" and any(not 0.5 <= value < 1 for value in parameter["sensitivity_values"] + parameter["base_values"]):
                raise ValueError("A5 service probabilities must be in [0.5, 1)")
            grid = [transform(value) for value in parameter["sensitivity_values"]]
            if key in ranges and ranges[key] != grid:
                raise ValueError(f"Explicit {key} range conflicts with selected register grid")
            ranges[key] = grid
            if key not in base:
                if len(parameter["base_values"]) != 1:
                    raise ValueError(f"{identity} has multiple base values; provide explicit {key}")
                base[key] = transform(parameter["base_values"][0])
        binding["register_range_ids"] = selected
    elif "register_range_ids" in payload:
        raise ValueError("register_range_ids requires scenario_register")
    return base, ranges, binding


def run(input_path, output_dir):
    source = Path(input_path)
    payload = json.loads(source.read_text(encoding="utf-8-sig"))
    for name in ("dataset_id", "policy_version", "unit_scope", "input_provenance"):
        if not isinstance(payload.get(name), str) or not payload[name].strip():
            raise ValueError(f"Explicit {name} is required")
    if not isinstance(payload.get("assumption_ids"), list) or not payload["assumption_ids"] or any(
        not isinstance(identity, str) or not identity for identity in payload["assumption_ids"]
    ):
        raise ValueError("Explicit assumption_ids are required")
    if not {"A1", "A2", "A3", "A4", "A5", "A6"}.issubset(payload["assumption_ids"]):
        raise ValueError("The EOQ/ROP shelf-capacity grid requires assumption IDs A1–A6")
    base, ranges, binding = selected_register_grid(payload, source)
    rows = eoq_sensitivity(base, ranges)
    metadata = {key: payload[key] for key in
                ("dataset_id", "policy_version", "unit_scope", "input_provenance", "assumption_ids")}
    metadata.update(binding)
    rows = [{**row, "method_version": row["policy_version"], **metadata} for row in rows]
    result = {**metadata, "evidence_label": "Assumed", "status": "scenario_research_only",
              "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
              "operational_approval": False, "rows": rows,
              "base_inputs": base, "ranges": ranges,
              "limitations": ["No company cost/lead-time/expiry inputs verified by this job",
                              "No historical delivery-frequency comparison or dashboard parity executed",
                              "No measured savings, stockout or wastage outcome demonstrated"]}
    result["code_sha256"] = {str(path.relative_to(Path(__file__).resolve().parents[3])): hashlib.sha256(path.read_bytes()).hexdigest()
                             for path in (Path(__file__).resolve(), Path(__file__).resolve().parents[1] / "planning_research.py",
                                          Path(__file__).resolve().parents[1] / "planning_assumptions.py")}
    result["rows"] = [{**row, "source_sha256": result["source_sha256"], "code_sha256": result["code_sha256"]} for row in rows]
    output = Path(output_dir)
    if output.exists() and any(output.iterdir()):
        raise ValueError("Output directory must be empty to preserve prior evidence")
    output.mkdir(parents=True, exist_ok=True)
    (output / "results.json").write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    flattened = [{**metadata, **{key: value for key, value in row.items() if key != "inputs"},
                  **row["inputs"], "assumption_ids": ";".join(payload["assumption_ids"]),
                  "code_sha256": json.dumps(row["code_sha256"], sort_keys=True)} for row in result["rows"]]
    with (output / "T8.1_eoq_rop_product_scenarios.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(flattened[0]))
        writer.writeheader()
        writer.writerows(flattened)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_path", type=Path)
    parser.add_argument("output_dir", type=Path)
    arguments = parser.parse_args()
    result = run(arguments.input_path, arguments.output_dir)
    print(json.dumps({"status": result["status"], "scenarios": len(result["rows"]),
                      "source_sha256": result["source_sha256"]}))


if __name__ == "__main__":
    main()
