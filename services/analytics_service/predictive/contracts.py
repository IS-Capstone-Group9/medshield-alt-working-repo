"""Versioned frozen-input validation and calendar arithmetic."""
import hashlib
import json
import math
import re


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()).hexdigest()


def month(period):
    if not isinstance(period, str) or not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', period):
        raise ValueError(f'Invalid monthly period: {period}')
    year, number = map(int, period.split('-'))
    return year * 12 + number - 1


def period(number):
    year, number = divmod(number, 12)
    return f'{year:04d}-{number + 1:02d}'


def display_periods(origin, current_month, horizon, validated_lead=12):
    if horizon not in (3, 6, 12):
        raise ValueError('Display horizon must be 3, 6 or 12')
    return [{'target_period': period(month(current_month) + offset),
             'lead_months': month(current_month) + offset - month(origin),
             'supported': 1 <= month(current_month) + offset - month(origin) <= validated_lead}
            for offset in range(horizon)]


def validate_input(data):
    if data.get('schema_version') != '1.0':
        raise ValueError('Unsupported frozen input schema')
    manifest = data['manifest']
    required = ('dataset_id', 'source_checksum', 'fact_delta_version', 'transformation_policy',
                'catalog_mapping_version', 'geography_mapping_version', 'accepted_descriptive_release_id',
                'extracted_at', 'source_available_at', 'revision_policy')
    for field in required:
        if manifest.get(field) is None or manifest[field] == '':
            raise ValueError(f'Missing manifest provenance: {field}')
    blockers = list(manifest.get('blockers', []))
    for field in ('reconciliation_passed', 'training_approved'):
        if manifest.get(field) is not True:
            blockers.append(f'{field} is not accepted')
    keys = set()
    for row in data['rows']:
        key = (row['series_id'], row['target_name'], month(row['period']))
        if key in keys:
            raise ValueError(f'Duplicate monthly key: {key}')
        keys.add(key)
        if (row['target_name'], row['grain'], row['scope'], row['unit']) != ('net_sales', 'company_month', 'company', 'PHP'):
            raise ValueError('First release permits company monthly net-sales PHP only')
        value = row['target_value']
        if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value)):
            raise ValueError('Target must be finite or null')
        if row['value_status'] not in ('observed', 'recorded_zero', 'confirmed_zero', 'missing', 'ineligible', 'partial'):
            raise ValueError('Unknown value status')
        if row['value_status'] in ('recorded_zero', 'confirmed_zero') and value != 0:
            raise ValueError('Zero status requires an explicit zero')
        if row['value_status'] in ('missing', 'ineligible') and value is not None:
            raise ValueError('Unavailable target must be null')
        if row.get('eligible_for_evaluation') and not eligible(row):
            raise ValueError('Eligibility contradicts closed complete nonmissing period')
    return sorted(set(blockers))


def eligible(row):
    return (row.get('eligible_for_evaluation') is True and row.get('period_closed') is True
            and row.get('coverage_status') == 'complete' and row.get('target_value') is not None
            and row.get('value_status') in ('observed', 'recorded_zero', 'confirmed_zero')
            and not row.get('blockers'))
