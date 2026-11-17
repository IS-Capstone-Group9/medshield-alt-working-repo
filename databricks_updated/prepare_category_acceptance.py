"""Record Adrian's delegated category-only decision and prepare isolated staging.

Does not modify the shared master, immutable proposal release or warehouse.
"""
import csv
import hashlib
import importlib.util
import json
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
PROPOSAL = HERE / 'classification_releases/classification_52342363a7ef3211'
RECORDER = 'Codex acting on Adrian instruction'
MUTABLE = ['product_category', 'category_status', 'display_category',
           'product_scope_status', 'catalog_evidence_source',
           'product_master_sha256', 'gold_published_at']


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_csv(path):
    with Path(path).open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def prepare():
    manifest = json.loads((PROPOSAL / 'manifest.json').read_text(encoding='utf-8'))
    assert sha(PROPOSAL / 'manifest.json') == 'd0114976fd7542ea26025b512afff494d64b911a0387a1ac6b2e8946fda36e02'
    validator = load(PROPOSAL / 'release_validation.py', 'accepted_input_validation')
    capture, proposals = validator.validate_files(PROPOSAL, manifest)
    catalog = load(HERE / 'medshield_project/product_catalog.py', 'product_catalog')
    previous_module = sys.modules.get('product_catalog')
    sys.modules['product_catalog'] = catalog
    try:
        publication = load(HERE / 'medshield_project/catalog_publication.py', 'accepted_category_validation')
    finally:
        if previous_module is None:
            sys.modules.pop('product_catalog', None)
        else:
            sys.modules['product_catalog'] = previous_module
    proposal_rows = read_csv(PROPOSAL / 'product_master_review.csv')
    proposed = {row['source_label']: row for row in proposals}
    recorded_at = datetime.now(timezone(timedelta(hours=8))).isoformat()
    rows, decisions = [], []
    for original in proposal_rows:
        row = dict(original)
        proposal = proposed[row['raw_product']]
        category = proposal['proposed_category']
        inherited = proposal['proposal_status'] == 'approved'
        action = 'accepted_unclassified' if category == 'unclassified' else 'accepted_category'
        evidence = ('Category-only decision under Adrian delegated instruction; '
                    'classification_52342363a7ef3211; ' + proposal['disposition'] + '; '
                    + (proposal['evidence_reference'] or 'Finalized submission and retained research sidecar'))
        row.update(product_category=category, category_status='approved',
                   evidence_source=evidence, reviewed_by=RECORDER, reviewed_at=recorded_at)
        for field in row:
            if field not in publication.REVIEW_FIELDS:
                assert row[field] == original[field], (row['raw_product'], field)
        rows.append(row)
        decisions.append(dict(raw_product=row['raw_product'], normalized_product=catalog.clean_label(row['raw_product']),
                              product_key=proposal['product_key'], product_category=category,
                              category_status='approved', evidence_source=evidence, reviewed_by=RECORDER,
                              reviewed_at=recorded_at, decision=action,
                              rationale=('Explicit unresolved reporting bucket; underlying identity remains unknown.'
                                         if category == 'unclassified' else
                                         'Preserve existing category decision.' if inherited else
                                         'Accept supported reporting category from finalized workbook translation.'),
                              inherited_category=inherited, proposal_disposition=proposal['disposition']))
    catalog.validate_master(rows)
    receipt = dict(schema_version=1, scope='reporting_category_only', requested_by='Adrian',
                   recorded_by=RECORDER, recorded_at=recorded_at,
                   instruction_basis='User delegated the best decision after the exact category-only scope was presented.',
                   dataset_id=capture['results']['identity']['rows'][0]['dataset_id'], baseline_fact_version=0,
                   prior_product_master_sha256=sha(PROPOSAL / 'predecessor_product_master_review.csv'),
                   proposal_master_sha256=sha(PROPOSAL / 'product_master_review.csv'),
                   input_submission_sha256=manifest['input_submission_sha256'],
                   business_release_approval=False, sku_or_unit_approval=False, forecast_approval=False,
                   decisions=decisions)
    review = ROOT / 'outputs/databricks_assessment_20261026/category_acceptance_accepted'
    review.mkdir(exist_ok=False)
    master_path = review / 'accepted_product_master.csv'
    with master_path.open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    receipt['product_master_sha256'] = sha(master_path)
    publication.validate_category_rows(rows, receipt)
    write_json(review / 'category_acceptance.json', receipt)
    identity = hashlib.sha256((sha(master_path) + sha(review / 'category_acceptance.json')).encode()).hexdigest()[:16]
    release_id = 'category_' + identity
    schema = capture['results']['schema']['rows']
    contract = dict(schema_version=1, release_id=release_id, mode='category_acceptance_candidate_only',
                    source_table=manifest['source_table'], source_version=0,
                    source_identity=capture['results']['identity']['rows'][0],
                    source_schema=[(row['col_name'], row['data_type'].lower()) for row in schema],
                    source_keys_sha256=manifest['source_keys_sha256'], source_rows=40160,
                    source_product_labels=5692, accepted_aliases=5694,
                    eligible_net_sales_php='637922399.530000', excluded_table=manifest['excluded_table'],
                    target_table='workspace.medshield_gold_source_20261022.' + release_id + '_candidate',
                    mutable_fields=MUTABLE, product_master_sha256=receipt['product_master_sha256'],
                    acceptance_sha256=sha(review / 'category_acceptance.json'),
                    recorded_at=recorded_at, live_serving_changed=False,
                    independent_approvals_added=0, full_original_or_contract_finance=False)
    write_json(review / 'publication_contract.json', contract)
    release = HERE / 'category_releases' / release_id
    release.mkdir(parents=True, exist_ok=False)
    for name in ['accepted_product_master.csv', 'category_acceptance.json', 'publication_contract.json']:
        (release / name).write_bytes((review / name).read_bytes())
    files = {p.name: dict(sha256=sha(p), bytes=p.stat().st_size) for p in sorted(release.iterdir())}
    package = dict(schema_version=1, release_id=release_id, files=files)
    write_json(release / 'manifest.json', package)
    notebook_path = HERE / 'medshield_project/maintenance/20261026_stage_accepted_categories.py'
    template = (HERE / 'stage_accepted_categories.template.py').read_text(encoding='utf-8')
    notebook = template.replace('__RELEASE_ID__', release_id).replace('__MANIFEST_SHA256__', sha(release / 'manifest.json'))
    notebook_path.write_text(notebook, encoding='utf-8')
    destination = ROOT / 'databricks_updated_2/category_releases' / release_id
    destination.mkdir(parents=True, exist_ok=False)
    for path in release.iterdir():
        (destination / path.name).write_bytes(path.read_bytes())
    upload_notebook = ROOT / 'databricks_updated_2/medshield_project/maintenance' / notebook_path.name
    upload_notebook.write_bytes(notebook_path.read_bytes())
    counts = dict(Counter(row['product_category'] for row in rows))
    summary = dict(status='CATEGORY_ONLY_ACCEPTED_LOCALLY_CANDIDATE_STAGING_NOT_RUN', release_id=release_id,
                   all_aliases=len(rows), known_categories=sum(v for k, v in counts.items() if k != 'unclassified'),
                   categories=counts, preserved_known=1584, newly_accepted_known=3235,
                   inactive_accepted_known=2, source_rows=40160,
                   independent_approvals_added=0, shared_master_changed=False, remote_writes=0,
                   acceptance_sha256=sha(review / 'category_acceptance.json'),
                   package_manifest_sha256=sha(release / 'manifest.json'),
                   notebook_sha256=sha(notebook_path))
    write_json(review / 'summary.json', summary)
    print(json.dumps(summary, indent=2))


if __name__ == '__main__':
    prepare()
