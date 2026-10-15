"""Build a local operator package and checksum manifest; never deploys anything."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import csv
from datetime import datetime, timezone
from zipfile import ZipFile, ZIP_DEFLATED
from catalog_publication import validate_package_contract, validate_publication_rows
from product_catalog import validate_master

ROOT = Path(__file__).resolve().parents[2]
PROJECT = ROOT / "databricks/medshield_project"


def main():
    subprocess.run([sys.executable, str(PROJECT/"render_readme.py"), "--check"], check=True)
    descriptor = PROJECT/"references/catalog_publication.json"
    contract = json.loads(descriptor.read_text(encoding="utf-8"))
    receipt = validate_package_contract(ROOT, contract)
    with (PROJECT/"references/product_master_review.csv").open(encoding="utf-8-sig", newline="") as source:
        master_rows = list(csv.DictReader(source))
        validate_master(master_rows)
        acceptance = json.loads((ROOT/contract['category_acceptance_path']).read_text(encoding='utf-8')) if contract['mode']=='category_acceptance_only' else None
        validate_publication_rows(master_rows, contract, acceptance)
    for filename in ("product_master_review.csv", "transaction_evidence_review.csv"):
        master = PROJECT/"references"/filename
        deployed = ROOT/"databricks/medshield_reference_csv/medshield_reference_csv"/filename
        if master.read_bytes() != deployed.read_bytes():
            raise ValueError("Divergent deployment copy: " + filename)
    files = [p for p in PROJECT.rglob("*") if p.is_file() and p.suffix in {".py", ".csv", ".sql", ".md", ".json"} and "__pycache__" not in p.parts]
    # Dated version-16 delivery guidance is historical, not this package's runbook.
    files += [ROOT/"docs/PRODUCT_CATALOG.md",ROOT/"docs/CATALOG_DEPLOYMENT.md"]
    files += [ROOT/"docs/PRODUCT_MASTER_REVIEW_GUIDE.md", receipt,
        ROOT/"outputs/catalog_preparation/product_evidence/REVIEW_QUEUE.md",
        ROOT/"outputs/catalog_preparation/product_evidence/review_candidates.json"]
    accessory_review = ROOT/"outputs/nebulizer_accessory_update_20261007"
    if accessory_review.exists():
        files += [accessory_review/name for name in ("README.md", "receipt.json", "verification.json")]
    medicine_review = ROOT/"outputs/medicine_review_20261008"
    if medicine_review.exists():
        files += [medicine_review/name for name in ("README.md", "receipt.json", "verification.json", "evidence.json", "cloud-check.json")]
    if contract['mode']=='category_acceptance_only':
        files += [ROOT/contract['prior_product_master_path'], ROOT/contract['category_acceptance_path']]
        category_review=ROOT/'outputs/category_acceptance_20261008'
        files += [category_review/name for name in ('README.md','assessment.json','assessment.md','targeted-evidence.json','targeted-evidence.md','verification.json','edit-receipt.json','final-validation.json')]
    gold_correction=ROOT/'outputs/gold_assertion_fix_20261009'
    if gold_correction.exists():
        files += [gold_correction/name for name in ('README.md','verification.json','cloud-diagnosis.json','cell3_corrected.py',
            'UPLOADED_BACKUP_REVIEW.md','uploaded-backup-verification.json','uploaded-backup-comparison.json',
            'uploaded-backup-cloud-recheck.json') if (gold_correction/name).is_file()]
    # Include unchanged reference bytes required at the exact Gold workspace paths.
    files += [ROOT/'databricks/medshield_reference_csv/medshield_reference_csv'/name for name in ('area_classification_mapping.csv','likely_non_medical_product_candidates.csv')]
    files += [ROOT/"databricks/medshield_reference_csv/medshield_reference_csv"/name for name in ("product_master_review.csv", "transaction_evidence_review.csv")]
    # Hash and include the actual application source, including existing user changes;
    # never confuse HEAD alone with this dirty working-tree revision.
    for directory in ("backend/src", "frontend/app", "frontend/components", "frontend/lib", "frontend/services", "frontend/types", "frontend/hooks", "frontend/styles"):
        folder=ROOT/directory
        if folder.exists():
            files += [p for p in folder.rglob("*") if p.is_file() and p.suffix in {".ts", ".tsx", ".css", ".json"}]
    for directory in ("backend", "frontend"):
        files += [p for p in (ROOT/directory).iterdir() if p.is_file() and (p.name.startswith(("package", "tsconfig", "next.config")))]
    files += [ROOT/"backend/scripts"/name for name in ("validate-catalog.ts", "catalog-validation-decisions.ts", "prepare-catalog-publication.ts", "review-product-catalog.ts", "publication-readiness.ts", "publication-readiness-helpers.ts", "validate-descriptive.ts")]
    files += [ROOT/'backend/tests/catalog-contract.test.ts']
    files += [ROOT/'backend/tests/catalog-validation-decisions.test.ts']
    files = sorted(set(files))
    # Hash the same captured bytes written to ZIP, even if another task edits a file.
    contents = {p.relative_to(ROOT).as_posix(): p.read_bytes() for p in files}
    hashes = {name: hashlib.sha256(payload).hexdigest() for name, payload in contents.items()}
    manifest = {"status":"LOCAL_CATEGORY_ACCEPTANCE_NOT_DEPLOYED_NOT_RELEASE_APPROVED" if contract['mode']=='category_acceptance_only' else "LOCAL_PACKAGE_NOT_DEPLOYED_NOT_APPROVED", "git_head":subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip(),
                "baseline_fact_version":contract["baseline_fact_version"],"resolution_policy":"catalog_v1_independent_evidence",
                "contract":contract, "recovery_rehearsal_verified":False, "ready_for_execution":False,
                "reconciliation_receipt":receipt.relative_to(ROOT).as_posix(),
                "reconciliation_receipt_sha256":hashlib.sha256(receipt.read_bytes()).hexdigest(),
                "files":hashes}
    correction_receipt='outputs/gold_assertion_fix_20261009/verification.json'
    if correction_receipt in hashes:
        manifest['latest_gold_correction_receipt']=correction_receipt
        manifest['latest_gold_correction_receipt_sha256']=hashes[correction_receipt]
    output=ROOT/"outputs/catalog_deployment"/datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S-%fZ")
    output.mkdir(parents=True,exist_ok=False)
    manifest_path=output/"manifest.json"
    manifest_path.write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
    archive=output/"medshield-catalog-candidate.zip"
    with ZipFile(archive,"w",ZIP_DEFLATED) as bundle:
        for name, payload in contents.items():
            bundle.writestr(name, payload)
        bundle.write(manifest_path,"manifest.json")
        bundle.writestr('reconciliation-summary.json',contents[receipt.relative_to(ROOT).as_posix()])
    checksums={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (archive,manifest_path)}
    (output/"SHA256.json").write_text(json.dumps(checksums,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"output":str(output),"files":len(files),"sha256":checksums},indent=2))


if __name__ == "__main__":
    main()
