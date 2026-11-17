# Databricks notebook source
# MAGIC %md
# MAGIC # Original itemized monthly STL — read-only review
# MAGIC Run on Python compute with **statsmodels** available. This notebook does not install packages.
# MAGIC It validates the pinned Gold source and the reviewed monthly export, then decomposes continuous
# MAGIC observed net-sales segments of at least 36 months. Missing months remain unavailable.
# MAGIC No tables, source files, approvals or dashboard pointers are changed. This is historical
# MAGIC diagnostic decomposition, **not a forecast**, verified medicine demand or financial approval.

# COMMAND ----------

import base64
import hashlib
import json
import math
import re
import zlib
from decimal import Decimal, InvalidOperation

SOURCE_TABLE = 'workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_itemized_candidates'
RECEIPT_TABLE = 'workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_receipt'
DATASET_ID = 'e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10'
POLICY = 'original_source_layers_v1_candidate_only'
RECEIPT_SHA256 = 'd69414d3bb72c706bba30f24489074e4677f403277e18c64bb8d2e643b0012dd'
SOURCE_KEYS_SHA256 = 'da74cc50c67e22fd33928f5ca3faaebc3e21a6e1b76f7f169829bf6515d8c580'
# Ordered fields/decimal values, independent of CSV quoting, newlines or numeric types.
MONTHLY_LOGICAL_SHA256 = '9d087afd9dce2ee41da1701d34cbb0083d92d5b5b24dc8aac6471d83e5ed8d0e'
MONTHLY_FIELDS = ['month', 'source_records', 'net_eligible_records', 'net_sales_php',
                  'supported_gross_profit_php', 'matching_margin_revenue_php']
EXPECTED_TOTALS = {'source_records': '40171', 'net_eligible_records': '39286',
                   'net_sales_php': '638015351.530000',
                   'supported_gross_profit_php': '334666271.550000',
                   'matching_margin_revenue_php': '566954921.920000'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def numeric(value):
    require(value is not None and not isinstance(value, bool), 'Missing/boolean monthly value')
    try:
        result = Decimal(str(value))
    except InvalidOperation as error:
        raise ValueError('Invalid monthly number') from error
    require(result.is_finite(), 'Nonfinite monthly value')
    return result


def month_index(period):
    require(isinstance(period, str) and re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', period), 'Invalid calendar month')
    year, month = map(int, period.split('-'))
    return year * 12 + month - 1


def monthly_identity(rows):
    require(0 < len(rows) <= 2400, 'Bounded monthly input required')
    ordered = sorted(rows, key=lambda row: month_index(row['month']))
    require(len({row['month'] for row in ordered}) == len(ordered), 'Duplicate calendar months')
    normalized = []
    for row in ordered:
        record = [row['month']]
        for field in MONTHLY_FIELDS[1:]:
            value = numeric(row[field])
            if field.endswith('records'):
                require(value == int(value) and value >= 0, 'Invalid record count')
                record.append(str(int(value)))
            else:
                require(value == value.quantize(Decimal('.000001')), 'Unsupported decimal precision')
                record.append(format(value, '.6f'))
        require(numeric(row['source_records']) > 0, 'An observed month must have source records')
        require(numeric(row['net_eligible_records']) <= numeric(row['source_records']), 'Eligibility exceeds records')
        normalized.append(record)
    payload = json.dumps(normalized, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    return hashlib.sha256(payload).hexdigest()


def validate_monthly(rows):
    require(monthly_identity(rows) == MONTHLY_LOGICAL_SHA256, 'Monthly input differs from the reviewed export; stop and reassess')
    for field, expected in EXPECTED_TOTALS.items():
        require(sum((numeric(row[field]) for row in rows), Decimal(0)) == Decimal(expected), 'Monthly total differs: ' + field)
    return sorted(rows, key=lambda row: row['month'])


def calendar_rows(rows):
    observed = {row['month']: row for row in rows}
    first, last = min(observed), max(observed)
    start = int(first[:4]) * 12
    stop = (int(last[:4]) + 1) * 12
    require(stop - start <= 2400, 'Calendar safety bound exceeded')
    result = []
    for index in range(start, stop):
        period = f'{index // 12:04d}-{index % 12 + 1:02d}'
        row = observed.get(period)
        result.append({'period': period,
                       'net_sales_php': str(row['net_sales_php']) if row else None,
                       'status': 'observed_source_month' if row else
                           'outside_observed_source_range' if period < first or period > last else 'missing_source_month'})
    return result


def decompose_review(rows):
    try:
        import numpy as np
        import statsmodels
        from statsmodels.tsa.seasonal import STL
    except ImportError as error:
        raise RuntimeError('statsmodels is unavailable. Add statsmodels to this notebook compute environment, then rerun. No tables have changed.') from error
    ordered = validate_monthly(rows)
    calendar = calendar_rows(ordered)
    segments, current = [], []
    for row in calendar:
        if row['net_sales_php'] is None:
            if current:
                segments.append(current)
                current = []
        else:
            current.append(row)
    if current:
        segments.append(current)
    fitted, excluded, components = [], [], []
    for segment in segments:
        descriptor = {'start': segment[0]['period'], 'end': segment[-1]['period'], 'months': len(segment)}
        if len(segment) < 36:
            excluded.append({**descriptor, 'reason': 'fewer_than_36_contiguous_months'})
            continue
        values = np.array([float(numeric(row['net_sales_php'])) for row in segment], dtype=float)
        fit = STL(values, period=12, seasonal=13, robust=True).fit()
        require(all(np.all(np.isfinite(part)) for part in (fit.trend, fit.seasonal, fit.resid)), 'Nonfinite STL component')
        error = float(np.max(np.abs(values - fit.trend - fit.seasonal - fit.resid)))
        require(math.isfinite(error) and error <= .000001, 'STL reconstruction failed')
        fitted.append({**descriptor, 'max_reconstruction_error_php': error})
        components.extend({'period': row['period'], 'observed': float(values[index]),
                           'trend': float(fit.trend[index]), 'seasonal': float(fit.seasonal[index]),
                           'residual': float(fit.resid[index])} for index, row in enumerate(segment))
    summary = {'status': 'STL_REVIEW_CANDIDATE' if fitted else 'INSUFFICIENT_CONTIGUOUS_HISTORY',
               'source_table': SOURCE_TABLE, 'source_delta_version': 0, 'dataset_id': DATASET_ID,
               'policy': POLICY, 'receipt_sha256': RECEIPT_SHA256, 'monthly_sha256': monthly_identity(ordered),
               'contracts_excluded': True, 'metric': 'technically_eligible_signed_net_sales_php',
               'monthly_source_records': len(ordered), 'calendar_months': len(calendar), 'controls': EXPECTED_TOTALS,
               'missing_source_months': [row['period'] for row in calendar if row['status'] == 'missing_source_month'],
               'outside_observed_source_months': [row['period'] for row in calendar if row['status'] == 'outside_observed_source_range'],
               'fitted_segments': fitted, 'short_segments_excluded': excluded, 'component_rows': len(components),
               'method': {'name': 'STL', 'period': 12, 'seasonal_window': 13, 'robust': True,
                          'minimum_contiguous_months': 36, 'missing_policy': 'no_imputation_split_at_gaps',
                          'statsmodels_version': statsmodels.__version__, 'numpy_version': np.__version__},
               'limitations': ['Recorded itemized PHP, not complete company sales or verified SKU demand.',
                              'Observed month presence does not prove source reporting completeness.',
                              'Full-segment retrospective STL uses later observations; not an origin-safe forecast feature.',
                              'Short pre-2020 segments remain in source evidence but receive no fitted components.'],
               'warehouse_tables_written': 0, 'source_files_modified': False, 'live_serving_changed': False,
               'financial_release_approved': False, 'model_publication_approved': False, 'forecasts_trained': 0}
    return {'summary': summary, 'calendar': calendar, 'components': components}

# COMMAND ----------

# MAGIC %md
# MAGIC ## Validate existing Gold and read monthly inputs
# MAGIC The selected source is fixed. The CSV need not be uploaded; this notebook reads Gold directly.

# COMMAND ----------

def read_gold_months(session):
    for table in (SOURCE_TABLE, RECEIPT_TABLE):
        history = session.sql(f'DESCRIBE HISTORY {table} LIMIT 1').collect()
        require(len(history) == 1 and int(history[0]['version']) == 0, 'Pinned Gold table changed after review')
    receipt = session.sql(f"SELECT dataset_id, payload_sha256, payload_b64 FROM {RECEIPT_TABLE} VERSION AS OF 0 WHERE record_id = 'gold_receipt'").collect()
    require(len(receipt) == 1 and receipt[0]['dataset_id'] == DATASET_ID and receipt[0]['payload_sha256'] == RECEIPT_SHA256, 'Gold receipt identity differs')
    payload = zlib.decompress(base64.b64decode(receipt[0]['payload_b64'], validate=True))
    require(hashlib.sha256(payload).hexdigest() == RECEIPT_SHA256, 'Gold receipt bytes differ')
    checks = session.sql(f"""SELECT COUNT(*) AS records, COUNT(DISTINCT source_record_id) AS unique_records,
      SHA2(CONCAT_WS('|', SORT_ARRAY(COLLECT_LIST(source_record_id))), 256) AS keys_sha256,
      COUNT_IF(dataset_id IS NULL OR dataset_id <> '{DATASET_ID}' OR policy_version IS NULL
        OR policy_version <> '{POLICY}' OR record_kind IS NULL OR record_kind <> 'itemized_sale'
        OR date_delivered IS NULL OR product_key IS NULL OR normalized_product IS NULL
        OR category_status IS NULL OR category_status <> 'approved'
        OR product_category IS NULL OR product_category NOT IN ('medicine','medical_supply','medical_equipment','non_medical','unclassified')
        OR is_net_sales_technically_eligible IS NULL
        OR (is_net_sales_technically_eligible AND net_sales IS NULL)
        OR is_gross_margin_technically_eligible IS NULL
        OR (is_gross_margin_technically_eligible AND (NOT is_net_sales_technically_eligible OR gross_margin_amount IS NULL))
        OR NOT (forecast_eligible <=> FALSE) OR NOT (source_unit_approved <=> FALSE)
        OR NOT (financial_release_approved <=> FALSE)) AS invalid_rows
      FROM {SOURCE_TABLE} VERSION AS OF 0""").collect()
    require(len(checks) == 1, 'Gold controls are missing')
    check = checks[0]
    require(check['records'] == 40171 and check['unique_records'] == 40171
            and check['keys_sha256'] == SOURCE_KEYS_SHA256 and check['invalid_rows'] == 0, 'Gold source/keys/eligibility/approval controls failed')
    rows = session.sql(f"""SELECT DATE_FORMAT(date_delivered, 'yyyy-MM') AS month,
      COUNT(*) AS source_records, COUNT_IF(is_net_sales_technically_eligible) AS net_eligible_records,
      SUM(CASE WHEN is_net_sales_technically_eligible THEN net_sales END) AS net_sales_php,
      SUM(CASE WHEN is_gross_margin_technically_eligible THEN gross_margin_amount END) AS supported_gross_profit_php,
      SUM(CASE WHEN is_gross_margin_technically_eligible THEN net_sales END) AS matching_margin_revenue_php
      FROM {SOURCE_TABLE} VERSION AS OF 0 WHERE record_kind = 'itemized_sale'
      GROUP BY DATE_FORMAT(date_delivered, 'yyyy-MM') ORDER BY month""").collect()
    return validate_monthly([row.asDict() for row in rows])


if 'spark' in globals():
    _review_months = read_gold_months(spark)
    _stl_review_result = decompose_review(_review_months)
    print(json.dumps(_stl_review_result['summary'], indent=2))
    print('PASS_ORIGINAL_ITEMIZED_STL_REVIEW. Read-only diagnostic candidate; live serving unchanged.')

# COMMAND ----------

# MAGIC %md
# MAGIC ## Review calendar coverage and fitted values
# MAGIC Calendar gaps remain unavailable. Components appear only for continuous stretches with enough history.

# COMMAND ----------

if 'spark' in globals() and '_stl_review_result' in globals():
    import pandas as pd
    display(pd.DataFrame(_stl_review_result['calendar']))
    display(pd.DataFrame(_stl_review_result['components']))
