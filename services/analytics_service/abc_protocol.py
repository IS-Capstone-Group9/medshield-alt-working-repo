"""Prepare a source-bound ABC research design and as-of features; never fit a model."""
import argparse
from collections import Counter, defaultdict
from decimal import Decimal
import hashlib
import json
from pathlib import Path

DATASET = 'e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10'
SOURCE_SHA = '9c48b9da2353d184420f1c5dea0713b7360d09130520e44d87384ef88f531673'
FEATURES = ('prior_net_sales_php', 'prior_positive_sales_php', 'prior_returns_php',
            'prior_eligible_records', 'prior_observed_months', 'prior_label_observed')
SALT = 'medshield_original_abc_label_split_v1'
CLASSES = ('A', 'B', 'C')


def digest(payload):
    return hashlib.sha256(payload).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def partition(product_key):
    # Identity only: the split cannot adapt to target classes or observed scores.
    bucket = int(digest((SALT + ':' + product_key).encode()), 16) % 100
    return 'train' if bucket < 70 else 'validation' if bucket < 85 else 'test'


def abc_labels(amounts, labels):
    total = sum(amounts.values(), Decimal(0))
    before = Decimal(0)
    result = {}
    for key in sorted(amounts, key=lambda k: (-amounts[k], labels[k])):
        amount = amounts[key]
        result[key] = ('Unclassified' if amount <= 0 or total <= 0 else
                       'A' if before < total * Decimal('.8') else
                       'B' if before < total * Decimal('.95') else 'C')
        before += amount
    return result


def annual_observations(source):
    q = {name: item['rows'] for name, item in source['queries'].items()}
    labels, annual = {}, {}
    month_keys = defaultdict(set)
    for row in q['comparison_months']:
        month_keys[(int(row['month'][:4]), row['product_key'])].add(row['month'])
    for row in q['product_years']:
        key, label, year = row['product_key'], row['normalized_product'], int(row['year'])
        require(digest(label.encode()) == key, 'Recorded-label key does not match exact normalized label')
        require(key not in labels or labels[key] == label, 'Ambiguous recorded-label key')
        labels[key] = label
        target = annual.setdefault((year, key), dict(records=0, eligible=0, net=Decimal(0),
            positive=Decimal(0), negative=Decimal(0), months=0, provenance=set()))
        require(row['source_data_status'] not in target['provenance'], 'Duplicate annual aggregate')
        if year < 2025:
            require(not target['provenance'], 'Overlapping provenance requires monthly coverage evidence')
            target['months'] = int(row['active_record_months'])
        else:
            target['months'] = len(month_keys[(year, key)])
        target['provenance'].add(row['source_data_status'])
        target['records'] += int(row['records'])
        target['eligible'] += int(row['revenue_records'])
        for dest, field in [('net', 'revenue'), ('positive', 'positive_revenue'), ('negative', 'negative_revenue')]:
            target[dest] += Decimal(row[field] or '0')
        require(0 < target['months'] <= 12, 'Invalid observed-month support')
    for row in annual.values():
        require(row['net'] == row['positive'] + row['negative'], 'Signed revenue does not reconcile')
    return labels, annual


def build_records(labels, annual):
    targets = {}
    for year in range(2020, 2027):
        amounts = {key: row['positive'] for (y, key), row in annual.items() if y == year}
        targets[year] = abc_labels(amounts, labels)
    records = []
    for (year, key), target in sorted(annual.items()):
        if not 2021 <= year <= 2026:
            continue
        prior = annual.get((year - 1, key))
        supported = prior is not None and prior['eligible'] > 0
        values = dict(prior_net_sales_php=str(prior['net']) if supported else None,
            prior_positive_sales_php=str(prior['positive']) if supported else None,
            prior_returns_php=str(-prior['negative']) if supported else None,
            prior_eligible_records=prior['eligible'] if prior else None,
            prior_observed_months=prior['months'] if prior else None,
            prior_label_observed=prior is not None)
        cohort = ('no_prior_observation' if prior is None else
                  'prior_ineligible_only' if not supported else
                  'low_history_1_to_6_observed_months' if prior['months'] <= 6 else
                  'more_than_6_observed_months')
        part = partition(key)
        stage = ('development_train' if part == 'train' and year <= 2023 else
                 'development_validation' if part == 'validation' and year == 2024 else
                 'frozen_refit_train' if part == 'train' and year == 2024 else
                 'retrospective_test_2025' if part == 'test' and year == 2025 else
                 'partial_2026_extension' if part == 'test' and year == 2026 else 'not_used')
        label = targets[year][key]
        records.append(dict(product_key=key, recorded_label=labels[key], target_year=year,
            target_window_end=f'{year}-09-30' if year == 2026 else f'{year}-12-31',
            partition=part, stage=stage, cohort=cohort, target_abc=label,
            eligible_for_three_class_evaluation=label in CLASSES,
            feature_year=year-1, feature_cutoff=f'{year-1}-12-31', features=values,
            prior_abc_baseline=targets[year-1].get(key),
            target_provenance=sorted(target['provenance']),
            feature_provenance=sorted(prior['provenance']) if prior else [],
            membership='retrospective_target_observed_label_not_historical_catalog'))
    validate_records(records)
    return records


def validate_records(records):
    groups = defaultdict(set)
    seen = set()
    for row in records:
        identity = row['product_key'], row['target_year']
        require(identity not in seen, 'Duplicate label/year sample')
        seen.add(identity)
        require(set(row['features']) == set(FEATURES), 'Feature allowlist violation')
        require(row['feature_year'] == row['target_year'] - 1, 'Target-period feature leakage')
        require(row['feature_cutoff'] == f"{row['feature_year']}-12-31", 'Invalid feature cutoff')
        require(row['partition'] == partition(row['product_key']), 'Identity partition changed')
        require(row['target_abc'] in (*CLASSES, 'Unclassified'), 'Unexpected ABC target')
        groups[row['product_key']].add(row['partition'])
    require(all(len(parts) == 1 for parts in groups.values()), 'Label crossed partitions')


def prepare(source):
    require(source['release']['dataset_id'] == DATASET, 'Wrong source dataset')
    require(source['release']['fact_delta_version'] == 0, 'Wrong source Delta version')
    require(source['contracts_excluded'] is True and source['warehouse_writes'] == 0, 'Invalid source scope')
    require(source['source_latest_version_before'] == source['source_latest_version_after'] == '0', 'Source version changed')
    for query in source['queries'].values():
        require(digest(query['sql'].encode()) == query['sql_sha256'], 'Source SQL hash changed')
    labels, annual = annual_observations(source)
    require(sum(r['records'] for r in annual.values()) == 40171, 'Wrong retained population')
    require(sum(r['eligible'] for r in annual.values()) == 39286, 'Wrong eligible population')
    require(sum((r['net'] for r in annual.values()), Decimal(0)) == Decimal('638015351.53'), 'Wrong net control')
    records = build_records(labels, annual)
    support = {}
    for stage in ['development_train', 'development_validation', 'frozen_refit_train',
                  'retrospective_test_2025', 'partial_2026_extension']:
        rows = [r for r in records if r['stage'] == stage and r['eligible_for_three_class_evaluation']]
        support[stage] = dict(samples=len(rows), classes=dict(Counter(r['target_abc'] for r in rows)),
                              cohorts=dict(Counter(r['cohort'] for r in rows)))
        require(all(support[stage]['classes'].get(c, 0) > 0 for c in CLASSES), 'Class missing in frozen stage')
    return records, support


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    raw = args.source.read_bytes()
    require(digest(raw) == SOURCE_SHA, 'Source receipt changed; create a new protocol version')
    records, support = prepare(json.loads(raw))
    protocol = dict(status='FROZEN_RESEARCH_DESIGN_NOT_FITTED', version='original_abc_label_v1',
        source_sha256=SOURCE_SHA, dataset_id=DATASET, source_delta_version=0,
        implementation_sha256=digest(Path(__file__).read_bytes()),
        target='Annual positive eligible source-line contribution ABC; full observed portfolio, crossing-inclusive 80/95; zero contribution unclassified',
        input_features=list(FEATURES), split=dict(salt=SALT, method='SHA256(key) modulo 100; 70/15/15 exact-label groups across every year'),
        selection=dict(train_years=[2021,2022,2023], validation_year=2024,
            refit_train_years=[2021,2022,2023,2024], test_year=2025,
            primary_metric='macro_f1', secondary_metrics=['balanced_accuracy','per_class_precision_recall_f1_support','confusion_matrix','cohort_coverage'],
            challenger_minimum_macro_f1_gain='0.02 over best validation baseline',
            a_recall_guard='not lower than best validation baseline; ties prefer baseline then smaller model',
            early_stopping=False, test_tuning_allowed=False),
        baseline_policy=['Training-only majority class; ABC order breaks ties',
                         'Prior-year ABC persistence; missing/unclassified prior falls back to training majority'],
        challengers=[dict(model='XGBoost', n_estimators=100, max_depth=depth, learning_rate=.05,
                         objective='multi:softprob', num_class=3, subsample=1, colsample_bytree=1,
                         random_state=20261027, n_jobs=1, tree_method='hist') for depth in (2,3)],
        preprocessing='Fit medians and missingness indicators on training partition only; no key/name/year/category as model input; no scaling or oversampling',
        decision_policy='Research comparison and human review only; no automatic inventory decision or invented review capacity',
        cohorts='No prior observation; ineligible-only; 1-6 prior observed months; >6 prior observed months. Company month presence does not certify product completeness.',
        sample_support=support, records=records,
        limitations=['Labels and outcomes were inspected before this design: no untouched/blind final test claim',
            'Exact label disjointness is not verified SKU-family disjointness; aliases may remain across partitions',
            'Retrospective target-observed membership cannot certify true catalog cold-start or all-catalog future ABC',
            'No prior observation means missing features, not zero sales; cold cohort is a prior-only diagnostic',
            '2026 January-September is a separate partial-year extension; no tuning or annualization',
            'Current restored Gold is retrospective evidence, not proof of historical publication availability',
            'Unreviewed source exports retain their provenance; units, geography, inventory and business/model publication unapproved',
            'This reconciles an engineering experiment, not an accepted academic amendment or full SO2 closure'],
        warehouse_writes=0, models_trained=0, financial_publication_approved=False, model_publication_approved=False)
    content = (json.dumps(protocol, indent=2) + '\n').encode()
    args.output.mkdir(parents=True, exist_ok=True)
    path = args.output / 'protocol.json'
    if path.exists():
        require(path.read_bytes() == content, 'Frozen protocol exists with different bytes; use a new version')
    else:
        path.write_bytes(content)
    (args.output / 'protocol.sha256').write_bytes((digest(content) + '\n').encode())
    print(json.dumps(dict(status=protocol['status'], protocol_sha256=digest(content), samples=len(records), stages=support,
                         warehouse_writes=0, models_trained=0)))


if __name__ == '__main__':
    main()
