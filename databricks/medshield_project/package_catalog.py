"""Build a local operator package and checksum manifest; never deploys anything."""
import hashlib
import json
from pathlib import Path
import subprocess
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[2]
PROJECT = ROOT / "databricks/medshield_project"


def main():
    subprocess.run(["python", str(PROJECT/"render_readme.py"), "--check"], check=True)
    for filename in ("product_master_review.csv", "transaction_evidence_review.csv"):
        master = PROJECT/"references"/filename
        deployed = ROOT/"databricks/medshield_reference_csv/medshield_reference_csv"/filename
        if master.read_bytes() != deployed.read_bytes():
            raise ValueError("Divergent deployment copy: " + filename)
    files = [p for p in PROJECT.rglob("*") if p.is_file() and p.suffix in {".py", ".csv", ".sql", ".md"}]
    files += [ROOT/"docs/PRODUCT_CATALOG.md",ROOT/"docs/CATALOG_DEPLOYMENT.md",ROOT/"docs/CATALOG_DELIVERY.md"]
    # Hash and include the actual application source, including existing user changes;
    # never confuse HEAD alone with this dirty working-tree revision.
    for directory in ("backend/src", "frontend/app", "frontend/components", "frontend/lib", "frontend/services", "frontend/types", "frontend/hooks", "frontend/styles"):
        folder=ROOT/directory
        if folder.exists():
            files += [p for p in folder.rglob("*") if p.is_file() and p.suffix in {".ts", ".tsx", ".css", ".json"}]
    for directory in ("backend", "frontend"):
        files += [p for p in (ROOT/directory).iterdir() if p.is_file() and (p.name.startswith(("package", "tsconfig", "next.config")))]
    files += [ROOT/"backend/scripts"/name for name in ("validate-catalog.ts", "review-product-catalog.ts", "publication-readiness.ts", "publication-readiness-helpers.ts", "validate-descriptive.ts")]
    files = sorted(set(files))
    hashes = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
    receipt = ROOT/"outputs/product_catalog_implementation/2026-09-27T07-51-00-423Z/summary.json"
    manifest = {"status":"LOCAL_PACKAGE_NOT_DEPLOYED_NOT_APPROVED", "git_head":subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip(),
                "baseline_fact_version":16,"resolution_policy":"catalog_v1_independent_evidence",
                "reconciliation_receipt":receipt.relative_to(ROOT).as_posix(),
                "reconciliation_receipt_sha256":hashlib.sha256(receipt.read_bytes()).hexdigest(),
                "files":hashes}
    output=ROOT/"outputs/catalog_deployment"
    output.mkdir(parents=True,exist_ok=True)
    manifest_path=output/"manifest.json"
    manifest_path.write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
    archive=output/"medshield-catalog-candidate.zip"
    with ZipFile(archive,"w",ZIP_DEFLATED) as bundle:
        for p in files:
            bundle.write(p,p.relative_to(ROOT).as_posix())
        bundle.write(manifest_path,"manifest.json")
        bundle.write(receipt,"reconciliation-summary.json")
    checksums={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (archive,manifest_path)}
    (output/"SHA256.json").write_text(json.dumps(checksums,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"output":str(output),"files":len(files),"sha256":checksums},indent=2))


if __name__ == "__main__":
    main()
