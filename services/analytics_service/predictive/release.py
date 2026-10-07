"""Build a review draft from one evaluated run. Never grants publication approval."""
from .contracts import digest, eligible


def release_draft(data, run):
    if run['status'] != 'evaluated_unpublished' or not run.get('selection', {}).get('model_id'):
        raise ValueError('An evaluated, selected candidate is required')
    if run['identity']['input_hash'] != digest(data):
        raise ValueError('Run/input hash mismatch')
    model = run['selection']['model_id']
    evaluation = next(e for e in run['evaluations'] if e['model_id'] == model)
    if evaluation['audit_reason'] or evaluation['audit']['n'] != 12:
        raise ValueError('Complete accepted final audit required for a release draft')
    selected = [p for p in run['predictions'] if p['model_id'] == model]
    future = [p for p in selected if p['stage'] == 'future']
    if len(future) != 12 or any(p['prediction'] is None for p in future):
        raise ValueError('Complete future candidate required')
    manifest = data['manifest']
    cutoff = future[0]['origin_period']
    points = []
    for p in selected:
        # The displayed backtest uses one audit origin, not overlapping dev folds.
        if p['stage'] == 'development':
            continue
        points.append(dict(p, target='net_sales', role='future' if p['stage'] == 'future' else 'backtest',
                           intervals=[dict(b, support=b['sample_count']) for b in p['intervals'] if b['lower'] is not None]))
    for row in data['rows']:
        if eligible(row) and row['period'] <= cutoff:
            points.append(dict(run_id=run['run_id'], model_id=model, series_id=row['series_id'], target='net_sales',
                               unit='PHP', role='actual', origin_period=row['period'], target_period=row['period'],
                               lead_months=0, prediction=None, actual=row['target_value'], intervals=[]))
    evaluations = []
    for entry in run['evaluations']:
        common = entry.get('development')
        evaluations.append(dict(entry, run_id=run['run_id'], dataset_id=manifest['dataset_id'],
                                protocol=run['protocol'], common_key_checksum=digest(common['common_keys'] if common else []),
                                metrics=entry['audit'], comparison_metrics=common['common'] if common else None))
    return dict(schema_version='2', publication_status='candidate', release_id='release_' + run['run_id'],
                run_id=run['run_id'], model_id=model, series_id=future[0]['series_id'], target='net_sales',
                unit='PHP', scope='company', dataset_id=manifest['dataset_id'], source_checksum=manifest['source_checksum'],
                fact_delta_version=manifest['fact_delta_version'], catalog_mapping_version=manifest['catalog_mapping_version'],
                geography_mapping_version=manifest['geography_mapping_version'], transformation_policy=manifest['transformation_policy'],
                input_hash=run['identity']['input_hash'], code_hash=digest(run['identity']['code_identity']),
                coverage_receipt_sha256=manifest.get('coverage_receipt_sha256'),
                data_publication_approved=manifest.get('publication_approved') is True,
                training_cutoff=cutoff, last_actual_period=cutoff, validated_max_lead=12,
                evaluation_protocol=run['protocol'], points=points, evaluations=evaluations,
                expected_point_count=len(points), expected_evaluation_count=len(evaluations),
                limitations=run['limitations'], selection=run['selection'])
