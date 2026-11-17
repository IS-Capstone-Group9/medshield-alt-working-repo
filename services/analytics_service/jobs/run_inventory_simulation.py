"""Run explicit, source-bound offline FEFO scenarios; no default company data.

Usage: python -m services.analytics_service.jobs.run_inventory_simulation input.json output_dir

Input requires dataset_id, policy_version, unit_scope, unit_review_status,
monthly_demand_evidence_label, input_provenance, scenario_register (path relative
to input JSON), assumption_ids/assumption_values A1–A7, complete monthly_demand,
explicit policies, simulation_inputs, seed and runs. Observed inputs require
unit_review_status=reviewed and an existing unit_review_evidence_path (relative
to input JSON); synthetic fixtures use synthetic_fixture/Simulated.
Policy arrays must be prepared outside this job using issue-time-known inputs.
No observed stock, costs, forecast champion, disease uplift or benefit is inferred.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path

from services.analytics_service.inventory_simulation import monte_carlo_comparison
from services.analytics_service.jobs.run_eoq_rop_sensitivity import register_binding
from services.analytics_service.planning_research import nonnegative


def run(input_path, output_dir):
    source = Path(input_path)
    payload = json.loads(source.read_text(encoding="utf-8-sig"))
    for key in ("dataset_id", "policy_version", "unit_scope", "input_provenance"):
        if not isinstance(payload.get(key), str) or not payload[key].strip():
            raise ValueError(f"Explicit {key} is required")
    label, review = payload.get("monthly_demand_evidence_label"), payload.get("unit_review_status")
    if (label, review) not in {("Observed", "reviewed"), ("Simulated", "synthetic_fixture")}:
        raise ValueError("Monthly demand must be reviewed Observed units or an explicitly Simulated synthetic_fixture")
    unit_binding = {}
    if label == "Observed":
        evidence = payload.get("unit_review_evidence_path")
        if not isinstance(evidence, str) or not evidence.strip():
            raise ValueError("Observed demand requires an explicit unit_review_evidence_path")
        evidence_path = Path(evidence)
        if not evidence_path.is_absolute():
            evidence_path = source.resolve().parent / evidence_path
        if not evidence_path.is_file():
            raise ValueError("Unit-review evidence file is unavailable")
        unit_binding["unit_review_evidence_sha256"] = hashlib.sha256(evidence_path.read_bytes()).hexdigest()
    register, binding = register_binding(payload.get("scenario_register"), source)
    del register  # The validated register binds provenance, never supplies hidden inputs.
    required_ids = {f"A{index}" for index in range(1, 8)}
    identities = payload.get("assumption_ids")
    if not isinstance(identities, list) or not all(isinstance(identity, str) for identity in identities) or not required_ids.issubset(identities):
        raise ValueError("Explicit assumption_ids A1–A7 are required")
    values = payload.get("assumption_values")
    if not isinstance(values, dict) or not required_ids.issubset(values):
        raise ValueError("Explicit assumption_values A1–A7 are required")
    for identity in required_ids:
        nonnegative(values[identity], identity, positive=identity != "A4")
    if not .5 <= values["A5"] < 1:
        raise ValueError("A5 must be an explicit cycle-service probability in [0.5, 1)")
    simulation = payload.get("simulation_inputs")
    if not isinstance(simulation, dict) or set(simulation) != {
        "initial_lots", "lead_mean_days", "lead_sd_days", "shelf_life_days", "burn_in_days"
    }:
        raise ValueError("simulation_inputs must explicitly contain initial_lots, lead_mean_days, lead_sd_days, shelf_life_days and burn_in_days")
    for identity, key in (("A3", "lead_mean_days"), ("A4", "lead_sd_days"), ("A6", "shelf_life_days")):
        if simulation[key] != values[identity]:
            raise ValueError(f"{key} conflicts with explicit {identity}")
    seed = nonnegative(payload.get("seed"), "seed", integer=True)
    runs = nonnegative(payload.get("runs"), "runs", integer=True, positive=True)
    concentration = nonnegative(payload.get("daily_disaggregation_concentration"), "daily_disaggregation_concentration", positive=True)
    result = monte_carlo_comparison(payload.get("monthly_demand"), payload.get("policies"),
                                    runs=runs, seed=seed, concentration=concentration, **simulation)
    metadata = {key: payload[key] for key in ("dataset_id", "policy_version", "unit_scope", "unit_review_status",
                                             "monthly_demand_evidence_label", "input_provenance", "assumption_ids")}
    metadata.update(binding)
    metadata.update(unit_binding)
    method = result["policy_version"]
    result.update(metadata)
    result["method_version"] = method
    result["assumption_values"] = values
    result["simulation_inputs"] = simulation
    result["policies"] = payload["policies"]
    result["daily_disaggregation_concentration"] = concentration
    result["period_start"], result["period_end"] = min(payload["monthly_demand"]), max(payload["monthly_demand"])
    result["status"] = "simulated_research_only"
    result["source_sha256"] = hashlib.sha256(source.read_bytes()).hexdigest()
    root = Path(__file__).resolve().parents[3]
    paths = [Path(__file__).resolve(), root / "services/analytics_service/inventory_simulation.py",
             root / "services/analytics_service/planning_research.py",
             root / "services/analytics_service/planning_assumptions.py",
             root / "services/analytics_service/jobs/run_eoq_rop_sensitivity.py"]
    result["code_sha256"] = {str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest() for path in paths}
    result["limitations"] = ["Simulation quantiles are not confidence intervals for actual company outcomes",
                             "Sales quantities do not establish unconstrained demand or verified historical inventory",
                             "Initial lots, expiry, lead times and policy inputs remain assumptions",
                             "A1/A2/A5/A7 are declared upstream policy/initialization assumptions; this engine does not infer their effects",
                             "No measured wastage reduction, operational publication or procurement approval"]
    result["rows"] = [{**row, **metadata, "method_version": method, "source_sha256": result["source_sha256"],
                       "code_sha256": result["code_sha256"]} for row in result["rows"]]
    output = Path(output_dir)
    if output.exists() and any(output.iterdir()):
        raise ValueError("Output directory must be empty to preserve prior evidence")
    output.mkdir(parents=True, exist_ok=True)
    (output / "results.json").write_text(json.dumps(result, ensure_ascii=False, allow_nan=False, indent=2) + "\n", encoding="utf-8")
    with (output / "T11.1_policy_comparison_simulation_quantiles.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        rows = [{**row, "assumption_ids": ";".join(row["assumption_ids"]),
                 "code_sha256": json.dumps(row["code_sha256"], sort_keys=True)} for row in result["rows"]]
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_path", type=Path)
    parser.add_argument("output_dir", type=Path)
    arguments = parser.parse_args()
    result = run(arguments.input_path, arguments.output_dir)
    print(json.dumps({"status": result["status"], "runs": result["runs"], "source_sha256": result["source_sha256"]}))


if __name__ == "__main__":
    main()
