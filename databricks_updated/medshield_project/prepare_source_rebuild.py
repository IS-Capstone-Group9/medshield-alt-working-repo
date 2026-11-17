"""Prepare an upload bundle from a fresh read-only predecessor capture; no cloud writes."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import zipfile

PROJECT = Path(__file__).resolve().parent
ROOT = PROJECT.parents[1]


def load_module(name):
    spec = importlib.util.spec_from_file_location(name, PROJECT / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def prepare(preflight_path, output_directory):
    source_api = load_module("source_rebuild")
    verifier = load_module("verify_local_sources")
    capture = json.loads(Path(preflight_path).read_text(encoding="utf-8"))
    age = (datetime.now(timezone.utc) - datetime.fromisoformat(capture["checked_at_utc"].replace("Z", "+00:00"))).total_seconds()
    if not 0 <= age <= 24 * 3600:
        raise ValueError("Recapture the serving predecessor; preflight is older than 24 hours or future dated")
    results = capture["results"]
    if results["target_schemas"]["rows"]:
        raise ValueError("Isolated target schemas already exist; inspect the prior run before preparing a replacement")
    identities = results["fact_identity"]["rows"]
    if len(identities) != 1 or identities[0]["records"] != identities[0]["unique_records"]:
        raise ValueError("Predecessor identity or source keys are ambiguous")
    identity = dict(identities[0])
    records = int(identity.pop("records"))
    identity.pop("unique_records")
    baseline_sources = []
    for row in results["source_manifest"]["rows"]:
        item = dict(row)
        if item.pop("dataset_id") != identity["dataset_id"]:
            raise ValueError("Predecessor Bronze and Gold datasets differ")
        for key in ("data_source_year", "source_file_bytes", "raw_line_count"):
            item[key] = int(item[key])
        baseline_sources.append(item)
    bronze = verifier.parser_namespace("01_sales_bronze.py")
    manifest = []
    for path in sorted(verifier.DEFAULT_SOURCE.glob("medshield_data_*.csv")):
        payload = path.read_bytes()
        digest = hashlib.sha256(payload).hexdigest()
        status, policy = bronze["source_provenance"](path.name, digest)
        manifest.append({"source_workbook": path.name, "data_source_year": int(path.stem[-4:]),
                         "source_file_sha256": digest, "source_file_bytes": len(payload),
                         "raw_line_count": len(bronze["decode_csv_source"](payload, path.name)),
                         "source_data_status": status, "source_adjustment_policy": policy})
    refs = ROOT / "databricks_updated/medshield_reference_csv"
    artifacts = {"product_master_sha256": refs / "product_master_review.csv",
                 "transaction_evidence_sha256": refs / "transaction_evidence_review.csv",
                 "area_mapping_sha256": refs / "area_classification_mapping.csv",
                 "product_reference_sha256": refs / "likely_non_medical_product_candidates.csv",
                 "catalog_helper_sha256": PROJECT / "product_catalog.py"}
    hashes = {key: hashlib.sha256(path.read_bytes()).hexdigest() for key, path in artifacts.items()}
    if any(identity[key] != digest for key, digest in hashes.items()):
        raise ValueError("Local reference bytes differ from the current serving predecessor")
    contract = {"schema_version": 1, "mode": source_api.SOURCE_MODE, "batch": "source_20261022",
                "baseline_table": source_api.BASELINE_TABLE,
                "baseline_fact_version": int(results["fact_history"]["rows"][0]["version"]),
                "baseline_identity": identity, "baseline_records": records, "baseline_sources": baseline_sources,
                "source_manifest": manifest, "dataset_id": source_api.digest_identity(manifest),
                "target_schemas": {layer: f"workspace.medshield_{layer}_source_20261022" for layer in ("bronze", "silver", "gold", "audit")},
                "reference_hashes": hashes, "activate_serving": False, "business_approval": False, "train_models": False,
                "prepared_at_utc": datetime.now(timezone.utc).isoformat(), "preflight_at_utc": capture["checked_at_utc"],
                "execution_status": "NOT_EXECUTED_WORKSPACE_AND_JOBS_SCOPES_REQUIRED"}
    source_api.validate_contract(contract)
    output = Path(output_directory)
    output.mkdir(parents=True, exist_ok=True)
    descriptor = output / "source_rebuild_20261022.json"
    if descriptor.exists():
        previous = json.loads(descriptor.read_text(encoding="utf-8"))
        if any(previous[key] != contract[key] for key in ("dataset_id", "baseline_identity", "baseline_fact_version", "reference_hashes", "source_manifest")):
            raise ValueError("Existing prepared source identity differs; retain it and use a new reviewed batch")
    descriptor.write_text(json.dumps(contract, indent=2) + "\n", encoding="utf-8")
    files = {}
    for name in ("01_sales_bronze.py", "02_sales_silver.py", "03_sales_gold.py", "source_rebuild.py", "product_catalog.py", "catalog_publication.py"):
        files["medshield_project/" + name] = PROJECT / name
    for name in ("catalog_publication.json", "category_acceptance.json"):
        files["medshield_project/references/" + name] = PROJECT / "references" / name
    files["medshield_project/references/" + descriptor.name] = descriptor
    for name in ("product_master_review.csv", "transaction_evidence_review.csv", "area_classification_mapping.csv", "likely_non_medical_product_candidates.csv"):
        files["medshield_reference_csv/" + name] = refs / name
    files["medshield_project_csv/medshield_data_2026.csv"] = verifier.DEFAULT_SOURCE / "medshield_data_2026.csv"
    files["SOURCE_INGESTION_2026.md"] = PROJECT / "SOURCE_INGESTION_2026.md"
    manifest_out = {"created_at_utc": datetime.now(timezone.utc).isoformat(), "dataset_id": contract["dataset_id"],
                    "serving_activation": False, "cloud_executed": False, "access": capture["access"],
                    "files": [{"workspace_relative_path": target, "bytes": file.stat().st_size, "sha256": hashlib.sha256(file.read_bytes()).hexdigest()} for target, file in sorted(files.items())]}
    with zipfile.ZipFile(output / "medshield_2026_ingestion.zip", "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for target, file in sorted(files.items()):
            archive.write(file, target)
        archive.writestr("upload-manifest.json", json.dumps(manifest_out, indent=2) + "\n")
    (output / "upload-manifest.json").write_text(json.dumps(manifest_out, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"dataset_id": contract["dataset_id"], "files": len(files), "bundle": str(output / "medshield_2026_ingestion.zip"), "cloud_executed": False}))
    return contract


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preflight", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    prepare(args.preflight, args.output)
