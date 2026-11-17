# Databricks notebook source
"""RUN THIS NOTEBOOK: read-only original-versus-serving reconciliation.

No external Python helper files are imported or executed. Uploaded CSVs and pinned warehouse tables
are read. Generated from the reviewed canonical parsing modules; no table writes,
invented quantities, model training or approval changes occur.
"""


from __future__ import annotations
from collections import Counter, defaultdict
from decimal import Decimal
import hashlib
import json
import re
from pathlib import Path
from datetime import datetime, timezone

ASSESSMENT_NOTEBOOK_VERSION = '20261026-self-contained-v1'
PROJECT = Path('/Workspace/medshield/medshield_project')
ROOT = PROJECT.parents[1]
DEFAULT_SOURCE = PROJECT.parent / 'medshield_project_csv'
SOURCE_DIRECTORY = DEFAULT_SOURCE
EMBEDDED_SOURCE_SHA256 = {'sales_csv_assessment.py': '60d0ea2f0394a84401b2bf232b084ec7525503dbbb285d536004d9655e1b5d88', 'verify_local_sources.py': 'cccf681f4a4eb111d9f3b77b0c3233c406956ab01209d6293ac180e1b6075e13'}

def bronze_namespace():
    import csv
    import hashlib
    import io
    import json
    import re
    from pathlib import Path
    from pathlib import Path
    MAX_SOURCE_BYTES = 100 * 1024 * 1024
    MAX_DRIVER_ROWS = 250000
    REVIEWED_HISTORICAL_SOURCES = {'medshield_data_2020.csv': {'adjusted': 'd5d17c2c6514a652294a23426e8ff9c35b5410d9a65a8273cd0dd6e573254a62', 'original': '98c83e6a440298e145b8bbfc2463791f393f0946f26a11c6b0472752d30ce733', 'policy': 'one_to_one_same_year_same_area_nearest_financial_profile'}, 'medshield_data_2024.csv': {'adjusted': '12ebda6996de76cf6af6c958485900fb81597f6f7f19dec4c8eea066919fb938', 'original': 'c38245983b918c0e44eecfccb3b63be00e8de9c848048dd007d1c086c714831f', 'policy': 'one_to_one_same_year_same_area_nearest_financial_profile'}, 'medshield_data_2025.csv': {'adjusted': 'd05fec98a3a312416118fab4d11ca1f6e0c19f1951248b7b22fcc518eeb15569', 'original': '2738afaf114d9480928e37b6c2b53dc0cac9ba2f10dc74a98b2549e3345d235c', 'policy': 'contract_parent_replaced_with_existing_product_allocation_v1'}}
    REVIEWED_2026_LOGICAL_CSV_SHA256 = '518276221504164844067cc0ecbeb4fe3ec2e4b975c941d89aefc4d556ca074e'

    def reviewed_2026_csv_representation(payload):
        """Accept only the reviewed ordered CSV field values, retaining actual bytes."""
        if len(payload) > MAX_SOURCE_BYTES:
            return False
        try:
            text = payload.decode('utf-8-sig', errors='strict')
            if not text or '\x00' in text:
                return False
            normalized = text.replace('\r\n', '\n').replace('\r', '\n')
            records = []
            for number, fields in enumerate(csv.reader(io.StringIO(normalized, newline=''), strict=True), 1):
                if number > MAX_DRIVER_ROWS:
                    return False
                records.append(fields)
            logical = json.dumps(records, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
            return hashlib.sha256(logical).hexdigest() == REVIEWED_2026_LOGICAL_CSV_SHA256
        except (UnicodeDecodeError, csv.Error):
            return False

    def source_provenance(filename, digest, payload=None):
        if payload is not None and hashlib.sha256(payload).hexdigest() != digest:
            raise ValueError('Source digest does not match provided bytes')
        if filename == 'medshield_data_2026.csv':
            if digest != '2e5f1b6b10f2e9e439e3ed2599bdad4409cf46dd5a6a9d7ae68d640d70e10693':
                if payload is None or not reviewed_2026_csv_representation(payload):
                    raise ValueError('2026: CSV contents differ from the reviewed export; actual SHA256=' + digest)
            return ('UNREVIEWED_SOURCE_EXPORT', None)
        reviewed = REVIEWED_HISTORICAL_SOURCES.get(filename)
        if reviewed:
            if digest == reviewed['original']:
                return ('ORIGINAL_SOURCE_EXPORT', None)
            if digest == reviewed['adjusted']:
                return ('ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE', reviewed['policy'])
            if digest != reviewed['original']:
                raise ValueError(f'{filename}: unreviewed source hash; provenance review required')
        if filename == 'medshield_data_2025.csv':
            if digest != 'd05fec98a3a312416118fab4d11ca1f6e0c19f1951248b7b22fcc518eeb15569':
                raise ValueError('2025: unreviewed replacement source hash')
            return ('ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE', 'contract_parent_replaced_with_existing_product_allocation_v1')
        if filename.startswith('medshield_data_') and filename.endswith('.csv'):
            year = filename[-8:-4]
            if year.isdigit() and int(year) > 2026:
                return ('UNREVIEWED_SOURCE_EXPORT', None)
        return ('ORIGINAL_SOURCE_EXPORT', None)

    def stable_digest(value):
        """Hash JSON with unambiguous field boundaries and stable ordering."""
        encoded = json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
        return hashlib.sha256(encoded.encode('utf-8')).hexdigest()

    def decode_csv_source(payload, filename, max_lines=250000):
        """Preserve every physical line; allow reviewed equivalent multiline CSV content only."""
        try:
            text = payload.decode('utf-8-sig', errors='strict')
        except UnicodeDecodeError as error:
            raise ValueError(f'{filename}: expected a valid UTF-8 CSV export.') from error
        if not text or '\x00' in text:
            raise ValueError(f'{filename}: empty file or unexpected NUL byte.')
        normalized = text.replace('\r\n', '\n').replace('\r', '\n')
        if normalized.count('\n') + 1 > max_lines:
            raise ValueError(f'{filename}: source exceeds the raw-line driver limit.')
        reader = csv.reader(io.StringIO(normalized, newline=''), strict=True)
        multiline_supported = filename == 'medshield_data_2026.csv' and (hashlib.sha256(payload).hexdigest() == '2e5f1b6b10f2e9e439e3ed2599bdad4409cf46dd5a6a9d7ae68d640d70e10693' or reviewed_2026_csv_representation(payload))
        previous_end = 0
        try:
            for _ in reader:
                if reader.line_num - previous_end != 1 and (not multiline_supported):
                    if filename == 'medshield_data_2026.csv':
                        raise ValueError(f'{filename}: multiline record ending at line {reader.line_num}, but CSV contents differ from the reviewed 2026 export; actual SHA256=' + hashlib.sha256(payload).hexdigest())
                    raise ValueError(f'{filename}: multiline CSV record ending at line {reader.line_num}; this source layout has not been reviewed for multiline fields.')
                previous_end = reader.line_num
        except csv.Error as error:
            raise ValueError(f'{filename}: invalid CSV near line {reader.line_num}.') from error
        return normalized.split('\n')

    def build_dataset_id(manifest):
        """A source-content identity, independent of machine path and run time."""
        identity = sorted(((item['source_workbook'], item['source_file_sha256']) for item in manifest))
        return stable_digest(identity)

    def source_record_key(filename, file_sha256, row_number):
        return stable_digest([filename, file_sha256, row_number])
    return locals()

def silver_namespace():
    import csv
    import hashlib
    import json
    import re
    from collections import Counter, defaultdict
    from datetime import date, datetime, timedelta
    from decimal import Decimal, InvalidOperation, ROUND_HALF_UP, localcontext
    import io
    from pathlib import Path
    SILVER_VERSION = 'sales_restart_silver_v4_2025_allocation_validation'
    CONTRACT_PREFIX_PATTERN = re.compile('^(?:(?:PAGBILAO|QMC|PPDC|TOURISM|PROVINCIAL\\s+TOURISM\\s+OFFICE|MARINDUQUE|GULANG\\s+GULANG|PESO(?:\\s+PROVINCIAL)?|PHO|ABOITIZ|PADRE\\s+BURGOS|PPOC)(?:\\s*#|\\s+\\d)|DR\\s*#|PR\\s+\\d)', re.IGNORECASE)
    MEASURE_FIELDS = ('quantity', 'unit_selling_price', 'gross_sales', 'discount_amount', 'net_sales', 'unit_acquisition_cost', 'total_acquisition_cost', 'gross_margin_amount', 'margin_pct', 'discount_rate')
    RAW_MEASURE_FIELDS = MEASURE_FIELDS + ('quantity_secondary',)
    DECIMAL_QUANTUM = Decimal('0.000001')
    FORMULA_TOLERANCE = Decimal('0.02')
    INVALID_TOKENS = {'#REF!', '#N/A', '#VALUE!', '#NAME?', '#NULL!', '#DIV/0!', 'NAN', 'NULL', 'NONE', 'N/A'}
    NUMBER_PATTERN = re.compile('^[+-]?(?:(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?$')
    HEADER_LAYOUTS = {'legacy_2017': ('dr', 'date', 'area', 'product', 'grosssales', 'unitprice', 'gross', 'discount', '', 'qty', 'tp', 'total', 'netincome'), 'legacy_2018': ('drnumber', 'drdate', 'salesrep', 'product', 'qty', 'cpunit', 'totalcp', 'discount', 'netcp', 'tpunit', 'totaltp', 'netincome'), 'legacy_2019': ('drnumber', 'drdate', 'area', 'product', 'qty', 'contractprice', 'totalcp', 'discount', 'totalcp', 'transferprice', 'totaltp', 'netincome'), 'modern_12': ('area', 'drnumber', 'datedelivered', 'product', 'qty', 'cp', 'totalcp', 'disc', 'netcp', 'tpunit', 'totaltp', 'netincome'), 'modern_13': ('area', 'drnumber', 'datedelivered', 'product', 'qty', 'cp', 'totalcp', 'disc', 'netcp', 'tpunit', 'totaltp', 'netincome', '%'), 'modern_grouped_17': ('mo', 'date', 'area', 'drnumber', 'datedelivered', 'doctor', 'product', 'grosssales', '', '', 'netsales', '', '', 'costofsales', '', '', 'grossincome')}

    def normalized_text(value):
        text = re.sub('\\s+', ' ', str(value or '')).strip()
        return None if not text or text.upper() in INVALID_TOKENS else text.upper()

    def normalized_dr(value):
        text = normalized_text(value)
        if text is None:
            return None
        text = re.sub('[‐‑‒–—−]', '-', text)
        text = re.sub('^(DR\\s*NUMBER|DR\\s*NO\\.?|D\\.R\\.|DR)\\s*[:#-]?\\s*', 'DR-', text)
        text = re.sub('\\s+', '', text)
        text = re.sub('-{2,}', '-', text).strip('-')
        return 'DR-' + text if text.isdigit() else text

    def is_contract_parent_label(value):
        """Recognize reviewed contract-parent prefixes without rejecting SKU size markers."""
        return bool(CONTRACT_PREFIX_PATTERN.search(str(value or '').strip()))

    def parse_decimal(raw, percent_points=False, discount_dash_zero=False):
        """Return (value, status); never remove arbitrary text to invent a number."""
        text = str(raw or '').strip()
        if not text or text.upper() in INVALID_TOKENS:
            return (None, 'MISSING' if not text else 'INVALID')
        if text in {'-', '—', '–'}:
            return (Decimal('0.000000'), 'DASH_ZERO') if discount_dash_zero else (None, 'MISSING')
        if text.endswith('%'):
            if not percent_points:
                return (None, 'INVALID')
            text = text[:-1].strip()
        text = re.sub('^(?:PHP|₱)\\s*', '', text, flags=re.IGNORECASE)
        parenthesized = text.startswith('(') and text.endswith(')')
        if parenthesized:
            text = text[1:-1].strip()
            if text.startswith(('+', '-')):
                return (None, 'INVALID')
        if len(text) > 80 or not NUMBER_PATTERN.fullmatch(text):
            return (None, 'INVALID')
        try:
            with localcontext() as decimal_context:
                decimal_context.prec = 40
                value = Decimal(text.replace(',', ''))
                if parenthesized:
                    value = -value
                if percent_points:
                    value /= 100
                if not value.is_finite() or abs(value) >= Decimal('100000000000000'):
                    return (None, 'INVALID')
                return (value.quantize(DECIMAL_QUANTUM, rounding=ROUND_HALF_UP), 'PARSED')
        except (InvalidOperation, OverflowError):
            return (None, 'INVALID')

    def parse_delivery_date(raw, layout):
        text = str(raw or '').strip()
        if not text or text.upper() in INVALID_TOKENS:
            return None
        if layout == 'modern_grouped_17':
            for date_format in ('%B %d, %Y', '%b %d, %Y', '%Y-%m-%d'):
                try:
                    return datetime.strptime(text, date_format).date()
                except ValueError:
                    continue
            return None
        if re.fullmatch('(?:\\d{5}|\\d{2},\\d{3})(?:\\.0+)?', text):
            return date(1899, 12, 30) + timedelta(days=int(Decimal(text.replace(',', ''))))
        formats = ['%Y-%m-%d', '%d-%b-%y', '%d-%b-%Y', '%d/%b/%Y']
        formats += ['%m/%d/%y', '%m/%d/%Y'] if layout == 'legacy_2017' else ['%d/%m/%Y', '%d/%m/%y', '%d-%m-%Y']
        for date_format in formats:
            try:
                return datetime.strptime(text, date_format).date()
            except ValueError:
                continue
        return None

    def parse_csv_record(raw_line):
        try:
            rows = list(csv.reader([raw_line], strict=True))
            return (rows[0] if rows else [], None)
        except csv.Error as error:
            return ([], str(error))

    def header_layout(fields):
        tokens = [re.sub('[^a-z0-9%]', '', item.lower()) for item in fields]
        while tokens and tokens[-1] == '':
            tokens.pop()
        for layout, expected in HEADER_LAYOUTS.items():
            if tuple(tokens) == expected:
                return layout
        return None

    def layout_positions(layout):
        if layout == 'modern_grouped_17':
            return dict(area=2, dr_number=3, date_delivered=4, product=6, quantity=7, unit_selling_price=8, gross_sales=9, discount_rate=10, discount_amount=11, net_sales=12, quantity_secondary=13, unit_acquisition_cost=14, total_acquisition_cost=15, gross_margin_amount=16)
        if layout == 'legacy_2017':
            return dict(area=2, dr_number=0, date_delivered=1, product=3, quantity=4, quantity_secondary=9, unit_selling_price=5, gross_sales=6, discount_rate=7, discount_amount=8, unit_acquisition_cost=10, total_acquisition_cost=11, gross_margin_amount=12)
        positions = dict(area=2, dr_number=0, date_delivered=1, product=3, quantity=4, unit_selling_price=5, gross_sales=6, discount_amount=7, net_sales=8, unit_acquisition_cost=9, total_acquisition_cost=10, gross_margin_amount=11)
        if layout.startswith('modern'):
            positions.update(area=0, dr_number=1, date_delivered=2)
        if layout == 'modern_13':
            positions['margin_pct'] = 12
        return positions

    def record_fingerprint(row):
        fields = ('date_delivered', 'area', 'dr_number', 'product') + MEASURE_FIELDS
        serialized = json.dumps([None if row.get(key) is None else str(row[key]) for key in fields], ensure_ascii=False)
        return hashlib.sha256(serialized.encode('utf-8')).hexdigest()

    def blank_assessment(source):
        row = dict(source)
        row.update({key + '_raw': None for key in RAW_MEASURE_FIELDS})
        row.update({key: None for key in MEASURE_FIELDS})
        row.update({key: None for key in ('area_raw', 'product_raw', 'dr_number_raw', 'date_delivered_raw', 'area', 'product', 'dr_number', 'date_delivered', 'calendar_year', 'quantity_primary_candidate', 'quantity_secondary_candidate', 'business_fingerprint', 'snapshot_reference_source_record_id')})
        row.update(raw_fields=[], source_layout=None, quality_rule_codes=[], net_value_source='UNAVAILABLE', record_kind='PREAMBLE', disposition='EXCLUDE_PREAMBLE', is_analysis_candidate=False, silver_version=SILVER_VERSION, is_area_placeholder=False, is_date_missing=False, is_provisional_year_candidate=False, reporting_year=None, reporting_year_basis='NOT_APPLICABLE')
        return row

    def assess_transaction(row, fields, layout):
        positions = layout_positions(layout)
        for name, position in positions.items():
            row[name + '_raw'] = fields[position] if position < len(fields) else None
        row['area'] = normalized_text(row['area_raw'])
        row['product'] = normalized_text(row['product_raw'])
        row['dr_number'] = normalized_dr(row['dr_number_raw'])
        row['date_delivered'] = parse_delivery_date(row['date_delivered_raw'], layout)
        row['calendar_year'] = row['date_delivered'].year if row['date_delivered'] else None
        rules = row['quality_rule_codes']
        if row['date_delivered'] and re.fullmatch('(?:\\d{5}|\\d{2},\\d{3})(?:\\.0+)?', str(row['date_delivered_raw'] or '').strip()):
            rules.append('EXCEL_SERIAL_DELIVERY_DATE_PARSED')
        row['is_area_placeholder'] = row['area'] is None
        if row['is_area_placeholder']:
            row['area'] = 'UNKNOWN_AREA'
            rules.append('MISSING_AREA_PLACEHOLDER')
        row['is_date_missing'] = normalized_text(row['date_delivered_raw']) is None
        row['reporting_year'] = row['calendar_year']
        row['reporting_year_basis'] = 'OBSERVED_DELIVERY_DATE' if row['date_delivered'] else 'UNRESOLVED_INVALID_DATE'
        if row['is_date_missing']:
            row['reporting_year'] = row['data_source_year']
            row['reporting_year_basis'] = 'PROVISIONAL_SOURCE_FILE_YEAR'
            rules.append('MISSING_DATE_SOURCE_YEAR_PLACEHOLDER')
        for name in MEASURE_FIELDS:
            value, status = parse_decimal(row[name + '_raw'], percent_points=name in {'margin_pct', 'discount_rate'}, discount_dash_zero=name == 'discount_amount')
            row[name] = value
            if status == 'INVALID':
                rules.append('INVALID_NUMERIC_' + name.upper())
            if status == 'DASH_ZERO':
                rules.append('DISCOUNT_DASH_INTERPRETED_AS_ZERO')
        row['quantity_primary_candidate'] = row['quantity']
        secondary, secondary_status = parse_decimal(row['quantity_secondary_raw'])
        row['quantity_secondary_candidate'] = secondary
        if layout == 'modern_grouped_17':
            if secondary_status == 'INVALID':
                rules.append('INVALID_NUMERIC_QUANTITY_SECONDARY')
            if secondary is None:
                rules.append('MISSING_COST_QUANTITY')
            if secondary is not None and row['quantity'] is not None and (secondary != row['quantity']):
                rules.append('SALES_AND_COST_QUANTITIES_DIFFER')
            source_month = str(fields[0]).strip()
            if row['date_delivered'] and source_month != str(row['date_delivered'].month):
                rules.append('SOURCE_MONTH_DIFFERS_FROM_DELIVERY_MONTH')
            if str(row['date_delivered_raw'] or '').strip().upper() == 'NO DATE':
                rules.append('EXPLICIT_NO_DELIVERY_DATE')
        if layout == 'legacy_2017':
            rules.append('2017_LOW_TRUST_SOURCE')
            if secondary_status == 'INVALID':
                rules.append('INVALID_NUMERIC_QUANTITY_SECONDARY')
            if secondary is not None:
                if row['quantity'] is not None and row['quantity'] != secondary:
                    rules.append('2017_QUANTITY_CANDIDATES_DISAGREE')
                row['quantity'] = secondary
            if row['gross_sales'] is not None and row['discount_amount'] is not None:
                row['net_sales'] = row['gross_sales'] - row['discount_amount']
                row['net_value_source'] = 'DERIVED_2017_GROSS_LESS_EXPLICIT_DISCOUNT'
                rules.append('NET_SALES_DERIVED_2017')
        elif row['net_sales'] is not None:
            row['net_value_source'] = 'SOURCE_REPORTED'
        if row['margin_pct'] is None and row['gross_margin_amount'] is not None and (row['net_sales'] not in (None, 0)):
            try:
                value = row['gross_margin_amount'] / row['net_sales']
                if abs(value) < Decimal('100000000000000'):
                    row['margin_pct'] = value.quantize(DECIMAL_QUANTUM, rounding=ROUND_HALF_UP)
                    rules.append('MARGIN_PCT_DERIVED')
            except InvalidOperation:
                rules.append('INVALID_DERIVED_MARGIN_PCT')
        for key, rule in (('quantity', 'INVALID_OR_MISSING_QUANTITY'), ('net_sales', 'MISSING_NET_SALES'), ('gross_sales', 'MISSING_GROSS_SALES'), ('gross_margin_amount', 'MISSING_GROSS_MARGIN')):
            if row[key] is None:
                rules.append(rule)
        if row['quantity'] is not None and row['quantity'] <= 0:
            rules.append('NEGATIVE_QUANTITY' if row['quantity'] < 0 else 'ZERO_QUANTITY')
        if row['net_sales'] is not None and row['net_sales'] < 0:
            rules.append('NEGATIVE_NET_SALES')
        if row['dr_number'] is None:
            rules.append('MISSING_DR_NUMBER')
        formula_checks = (('gross_sales', 'quantity', 'unit_selling_price', 'multiply', 'GROSS_VALUE_FORMULA_MISMATCH'), ('net_sales', 'gross_sales', 'discount_amount', 'subtract', 'NET_VALUE_FORMULA_MISMATCH'), ('total_acquisition_cost', 'quantity_secondary_candidate' if layout == 'modern_grouped_17' else 'quantity', 'unit_acquisition_cost', 'multiply', 'TRANSFER_VALUE_FORMULA_MISMATCH'), ('gross_margin_amount', 'net_sales', 'total_acquisition_cost', 'subtract', 'GROSS_MARGIN_FORMULA_MISMATCH'))
        for actual, left, right, operation, rule in formula_checks:
            if all((row[key] is not None for key in (actual, left, right))):
                expected = row[left] * row[right] if operation == 'multiply' else row[left] - row[right]
                if abs(row[actual] - expected) > FORMULA_TOLERANCE:
                    rules.append(rule)
        blocking = []
        for key, rule in (('area', 'MISSING_AREA'), ('product', 'INVALID_OR_MISSING_PRODUCT'), ('date_delivered', 'INVALID_OR_MISSING_DELIVERY_DATE')):
            if row[key] is None:
                blocking.append(rule)
        rules.extend(blocking)
        row['record_kind'] = 'TRANSACTION_CANDIDATE'
        if row['product'] is None and row['date_delivered'] is None:
            row['record_kind'] = 'CONTINUATION_OR_MISSING_IDENTITY'
        if blocking:
            row['disposition'] = 'REVIEW_INVALID_TRANSACTION_IDENTITY'
        elif row['calendar_year'] > row['data_source_year']:
            rules.append('SOURCE_YEAR_MISMATCH')
            row['disposition'] = 'REVIEW_FUTURE_DATED_SOURCE'
        else:
            if row['calendar_year'] != row['data_source_year']:
                rules.append('SOURCE_YEAR_MISMATCH')
            row['disposition'] = 'PENDING_RECONCILIATION'
            row['business_fingerprint'] = record_fingerprint(row)
        row['is_provisional_year_candidate'] = bool(row['is_date_missing'] and row['product'] is not None and any((row[key] is not None for key in ('quantity', 'net_sales', 'gross_sales'))))
        return row

    def reconcile_sales(rows):
        """One disposition per source row; exact snapshots before within-file duplicates."""
        pending = [row for row in rows if row['disposition'] == 'PENDING_RECONCILIATION']
        strong_groups = defaultdict(list)
        relaxed_groups = defaultdict(list)
        for row in pending:
            strong_groups[row['business_fingerprint']].append(row)
            relaxed_groups[row['date_delivered'], row['area'], row['product']].append(row)
        for group in strong_groups.values():
            preferred_year = min((row['data_source_year'] for row in group))
            preferred = [row for row in group if row['data_source_year'] == preferred_year]
            preferred.sort(key=lambda row: (row['source_workbook'], row['source_row_number'], row['source_record_id']))
            reference = preferred[0]
            matched_by_file = Counter()
            sufficient_evidence = all((reference[key] is not None for key in ('dr_number', 'quantity', 'net_sales')))
            for row in sorted(group, key=lambda row: (row['data_source_year'], row['source_workbook'], row['source_row_number'], row['source_record_id'])):
                if row['data_source_year'] > preferred_year:
                    row['snapshot_reference_source_record_id'] = reference['source_record_id']
                    file_key = (row['data_source_year'], row['source_workbook'])
                    matched_by_file[file_key] += 1
                    if len(preferred) == 1 and sufficient_evidence and (matched_by_file[file_key] == 1):
                        row['disposition'] = 'EXCLUDE_HISTORICAL_SNAPSHOT_DUPLICATE'
                    else:
                        row['disposition'] = 'REVIEW_POSSIBLE_DUPLICATE'
                        row['quality_rule_codes'].append('INSUFFICIENT_SNAPSHOT_MATCH_EVIDENCE' if not sufficient_evidence else 'EXCESS_OR_AMBIGUOUS_SNAPSHOT_OCCURRENCES')
                elif len(preferred) > 1:
                    row['disposition'] = 'REVIEW_POSSIBLE_DUPLICATE'
                    row['quality_rule_codes'].append('EXACT_BUSINESS_DUPLICATE_CANDIDATE')
                elif row['data_source_year'] == row['calendar_year']:
                    row['disposition'] = 'KEEP_SOURCE_YEAR_ALIGNED'
                else:
                    row['disposition'] = 'KEEP_HISTORICAL_BACKFILL_CANDIDATE'
        for group in relaxed_groups.values():
            first_year = min((row['data_source_year'] for row in group))
            references = [row for row in group if row['data_source_year'] == first_year]
            reference = min(references, key=lambda row: (row['source_workbook'], row['source_row_number']))
            for row in group:
                if row['disposition'] == 'KEEP_HISTORICAL_BACKFILL_CANDIDATE' and row['data_source_year'] > first_year:
                    row['disposition'] = 'REVIEW_HISTORICAL_RESTATEMENT'
                    row['snapshot_reference_source_record_id'] = reference['source_record_id']
                    row['quality_rule_codes'].append('CHANGED_HISTORICAL_DR_OR_MEASURES')
        for row in rows:
            if row['disposition'] == 'KEEP_HISTORICAL_BACKFILL_CANDIDATE':
                row['quality_rule_codes'].append('HISTORICAL_BACKFILL_CANDIDATE')
            row['is_analysis_candidate'] = row['disposition'] in {'KEEP_SOURCE_YEAR_ALIGNED', 'KEEP_HISTORICAL_BACKFILL_CANDIDATE'}
            row['quality_rule_codes'] = sorted(set(row['quality_rule_codes']))
        return rows

    def assess_sales_records(source_rows):
        """Transform verified Bronze dictionaries into the complete Silver ledger."""
        by_file = defaultdict(list)
        earliest_source_year = min((int(source['data_source_year']) for source in source_rows))
        for source in source_rows:
            by_file[source['source_workbook']].append(source)
        assessed = []
        for filename, sources in sorted(by_file.items()):
            sources.sort(key=lambda row: row['source_row_number'])
            parsed = [(source, *parse_csv_record(source['raw_csv_line'])) for source in sources]
            continuation_numbers = set()
            multiline_start_numbers = set()
            if any((not error and header_layout(fields) == 'modern_grouped_17' for source, fields, error in parsed)):
                reader = csv.reader(io.StringIO('\n'.join((s['raw_csv_line'] for s in sources)), newline=''), strict=True)
                first_fields, previous_end = ({}, 0)
                for fields in reader:
                    start, end = (previous_end + 1, reader.line_num)
                    first_fields[start] = fields
                    if end > start:
                        multiline_start_numbers.add(start)
                        continuation_numbers.update(range(start + 1, end + 1))
                    previous_end = end
                parsed = [(source, first_fields.get(source['source_row_number'], []), None) for source in sources]
            headers = [(source['source_row_number'], header_layout(fields), len(fields)) for source, fields, error in parsed if not error and header_layout(fields)]
            if not headers:
                raise ValueError(f'Unrecognized CSV header/layout in {filename}; inspect before changing the parser.')
            header_number, layout, header_width = headers[0]
            source_year = int(sources[0]['data_source_year'])
            expected_legacy = {2017: 'legacy_2017', 2018: 'legacy_2018', 2019: 'legacy_2019'}
            if source_year in expected_legacy and layout != expected_legacy[source_year]:
                raise ValueError(f'Unexpected {source_year} layout {layout} in {filename}.')
            if source_year >= 2020 and (not layout.startswith('modern')):
                raise ValueError(f'Unsupported modern layout {layout} in {filename}.')
            if any((item[1] != layout for item in headers)):
                raise ValueError(f'Mixed layouts in {filename}; split or review the source file.')
            if layout == 'legacy_2017':
                secondary = next((fields for source, fields, error in parsed if source['source_row_number'] == header_number + 1 and (not error)), [])
                if len(secondary) < 9 or secondary[7].strip() != '%' or secondary[8].strip().upper() != 'AMOUNT':
                    raise ValueError(f'2017 discount subheader is missing in {filename}.')
            if layout == 'modern_grouped_17':
                secondary = next((fields for source, fields, error in parsed if source['source_row_number'] == header_number + 1 and (not error)), [])
                tokens = tuple((re.sub('[^a-z0-9%]', '', value.lower()) for value in secondary))
                expected = ('', '', '', '', '', '', '', 'quantity', 'cpunit', 'totalsales', '%discount', 'discount', 'netsales', 'quantity', 'tpunit', 'totalcost', '')
                if tokens != expected:
                    raise ValueError(f'Grouped sales/cost subheader is missing or changed in {filename}.')
            for source, fields, error in parsed:
                row = blank_assessment(source)
                row['raw_fields'] = fields
                row['source_layout'] = layout
                if source['source_row_number'] in continuation_numbers:
                    row.update(record_kind='CSV_RECORD_CONTINUATION', disposition='EXCLUDE_MULTILINE_CSV_CONTINUATION')
                    row['quality_rule_codes'].append('MULTILINE_CSV_CONTINUATION_RETAINED')
                elif error:
                    row.update(record_kind='CSV_PARSE_FAILURE', disposition='REVIEW_CSV_PARSE_FAILURE')
                    row['quality_rule_codes'].append('MALFORMED_CSV_RECORD')
                elif not any((value.strip() for value in fields)):
                    row.update(record_kind='BLANK', disposition='EXCLUDE_BLANK')
                elif source['source_row_number'] < header_number:
                    pass
                elif header_layout(fields) or (layout in {'legacy_2017', 'modern_grouped_17'} and source['source_row_number'] == header_number + 1):
                    row.update(record_kind='HEADER', disposition='EXCLUDE_HEADER')
                elif len(fields) > header_width and any((value.strip() for value in fields[header_width:])):
                    row.update(record_kind='CSV_PARSE_FAILURE', disposition='REVIEW_CSV_COLUMN_MISMATCH')
                    row['quality_rule_codes'].append('UNEXPECTED_NONEMPTY_CSV_COLUMNS')
                elif len(fields) < max(layout_positions(layout).values()) + 1:
                    row.update(record_kind='CSV_PARSE_FAILURE', disposition='REVIEW_CSV_COLUMN_MISMATCH')
                    row['quality_rule_codes'].append('MISSING_CSV_COLUMNS')
                else:
                    summary_label = normalized_text(fields[layout_positions(layout)['product']]) or ''
                    is_summary = 'SALES SUMM' in summary_label or 'DISCREPANCY' in summary_label or summary_label in {'TOTAL', 'GRAND TOTAL', 'SUBTOTAL', 'SUB-TOTAL'}
                    if is_summary:
                        row.update(record_kind='SOURCE_SUMMARY', disposition='EXCLUDE_SOURCE_SUMMARY')
                    else:
                        assess_transaction(row, fields, layout)
                        if source['source_row_number'] in multiline_start_numbers:
                            row['quality_rule_codes'].append('MULTILINE_CSV_RECORD_REASSEMBLED_FROM_PRESERVED_LINES')
                        if row['calendar_year'] is not None and row['calendar_year'] < earliest_source_year:
                            row['disposition'] = 'REVIEW_DELIVERY_DATE_BEFORE_SCOPE'
                            row['quality_rule_codes'].append('DELIVERY_DATE_BEFORE_SOURCE_SCOPE')
                assessed.append(row)
        reconcile_sales(assessed)
        assert len(assessed) == len(source_rows), 'Silver lost a raw source row.'
        assert Counter((row['source_record_id'] for row in assessed)) == Counter((row['source_record_id'] for row in source_rows))
        assert all((row['disposition'] != 'PENDING_RECONCILIATION' for row in assessed))
        return assessed

    def identity_digest(rows):
        """Order-independent content check for persisted read-back, not just row counts."""
        records = [(row['dataset_id'], row['source_record_id'], row['source_file_sha256'], row['source_row_number'], row['raw_csv_line']) for row in rows]
        serialized = json.dumps(sorted(records), ensure_ascii=False, separators=(',', ':'))
        return hashlib.sha256(serialized.encode('utf-8')).hexdigest()
    return locals()

# COMMAND ----------

def parser_namespace(filename):
    factories = {'01_sales_bronze.py': bronze_namespace, '02_sales_silver.py': silver_namespace}
    if filename not in factories:
        raise ValueError('Unsupported parser source: ' + filename)
    return factories[filename]()


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def sum_measure(rows, name):
    return str(sum((r[name] for r in rows if r[name] is not None), Decimal(0)))

def audit_sources(source_dir=DEFAULT_SOURCE, maximum_source_year=None):
    source_dir = Path(source_dir)
    paths = sorted(source_dir.glob('medshield_data_*.csv'))
    if maximum_source_year is not None:
        paths = [p for p in paths if re.fullmatch('medshield_data_20\\d{2}\\.csv', p.name) and int(p.stem[-4:]) <= maximum_source_year]
    if not {f'medshield_data_{y}.csv' for y in range(2017, 2026)} <= {p.name for p in paths} or any((not re.fullmatch('medshield_data_20\\d{2}\\.csv', p.name) for p in paths)):
        raise ValueError('Expected the nine canonical 2017–2025 CSV filenames plus supported additional years')
    bronze = parser_namespace('01_sales_bronze.py')
    silver = parser_namespace('02_sales_silver.py')
    manifest, source_rows = ([], [])
    for path in paths:
        payload = path.read_bytes()
        digest = hashlib.sha256(payload).hexdigest()
        lines = bronze['decode_csv_source'](payload, path.name)
        provenance, policy = bronze['source_provenance'](path.name, digest, payload=payload)
        manifest.append({'source_workbook': path.name, 'source_file_sha256': digest, 'bytes': len(payload), 'raw_lines': len(lines), 'source_data_status': provenance, 'source_adjustment_policy': policy, 'representation_check': 'REVIEWED_CSV_FIELD_VALUES_MATCH_ACTUAL_BYTES_RETAINED' if path.name == 'medshield_data_2026.csv' else 'EXISTING_PROVENANCE_POLICY'})
        for line_number, line in enumerate(lines, 1):
            source_rows.append({'dataset_id': '', 'source_record_id': bronze['source_record_key'](path.name, digest, line_number), 'source_workbook': path.name, 'data_source_year': int(path.stem[-4:]), 'source_row_number': line_number, 'source_file_sha256': digest, 'raw_csv_line': line, 'source_path': str(path)})
    dataset_id = bronze['build_dataset_id'](manifest)
    for r in source_rows:
        r['dataset_id'] = dataset_id
    assessed = silver['assess_sales_records'](source_rows)
    clean = [r for r in assessed if r['is_analysis_candidate']]
    contracts = [r for r in clean if silver['is_contract_parent_label'](r['product'])]
    itemized = [r for r in clean if not silver['is_contract_parent_label'](r['product'])]
    checks = {'nine_year_baseline_present': {f'medshield_data_{y}.csv' for y in range(2017, 2026)} <= {p.name for p in paths}, 'raw_lines_preserved': len(assessed) == len(source_rows), 'source_ids_unique': len({r['source_record_id'] for r in assessed}) == len(assessed), 'all_lines_disposed': all((r['disposition'] != 'PENDING_RECONCILIATION' for r in assessed)), 'raw_ids_preserved': Counter((r['source_record_id'] for r in assessed)) == Counter((r['source_record_id'] for r in source_rows)), 'source_bytes_unchanged': all((sha(path) == item['source_file_sha256'] for path, item in zip(paths, manifest)))}
    if not all(checks.values()):
        raise ValueError(f'Raw-source reconciliation failed: {checks}')
    yearly = []
    for item in manifest:
        all_file = [r for r in assessed if r['source_workbook'] == item['source_workbook']]
        kept = [r for r in all_file if r['is_analysis_candidate']]
        eligible = [r for r in kept if r['net_sales'] is not None and 'NET_VALUE_FORMULA_MISMATCH' not in r['quality_rule_codes']]
        contract_part = [r for r in kept if silver['is_contract_parent_label'](r['product'])]
        itemized_part = [r for r in kept if not silver['is_contract_parent_label'](r['product'])]
        months = sorted({r['date_delivered'].replace(day=1).isoformat() for r in kept})
        headers = [r['raw_fields'] for r in all_file if r['record_kind'] == 'HEADER']
        unit_headers = sorted({v for fields in headers for v in fields if v.strip().lower() in {'uom', 'unit', 'sales unit', 'unit of measure', 'pack size'}})
        yearly.append({**item, 'source_year': int(item['source_workbook'][-8:-4]), 'dispositions': dict(Counter((r['disposition'] for r in all_file))), 'clean_records': len(kept), 'financial_eligible_records': len(eligible), 'financial_eligible_net_sales_php': sum_measure(eligible, 'net_sales'), 'clean_identity_sha256': hashlib.sha256('|'.join(sorted((r['source_record_id'] for r in kept))).encode()).hexdigest(), 'clean_quantity_sum': sum_measure(kept, 'quantity'), 'quantity_sum_scope': 'parsed source values across incompatible/unverified units, not physical medicine demand', 'itemized_source_quantity_sum': sum_measure(itemized_part, 'quantity'), 'contract_candidate_records': len(contract_part), 'contract_recorded_net_sales_php': sum_measure(contract_part, 'net_sales'), 'contract_physical_quantity': None, 'contract_product_breakdown': 'unavailable', 'clean_net_sales_sum': sum_measure(kept, 'net_sales'), 'observed_calendar_months': months, 'separate_sales_unit_headers': unit_headers, 'quality_rules': dict(Counter((rule for r in all_file for rule in r['quality_rule_codes']))), 'positive_quantity_rows': sum((r['quantity'] is not None and r['quantity'] > 0 for r in kept)), 'negative_quantity_rows': sum((r['quantity'] is not None and r['quantity'] < 0 for r in kept)), 'null_quantity_rows': sum((r['quantity'] is None for r in kept)), 'source_layouts': sorted({r['source_layout'] for r in all_file})})
    calendar = []
    for year in range(2017, max((int(p.stem[-4:]) for p in paths)) + 1):
        for month in range(1, 13):
            key = f'{year:04d}-{month:02d}-01'
            part = [r for r in clean if r['date_delivered'].replace(day=1).isoformat() == key]
            eligible = [r for r in part if r['net_sales'] is not None and 'NET_VALUE_FORMULA_MISMATCH' not in r['quality_rule_codes']]
            calendar.append({'period': key, 'records': len(part), 'financial_eligible_records': len(eligible), 'net_sales_php': sum_measure(eligible, 'net_sales') if eligible else None, 'observation_status': 'records_present_completeness_unverified' if part else 'no_records_unknown_not_zero'})
    products = defaultdict(list)
    for r in itemized:
        products[r['product']].append(r)
    product_review = []
    for title, part in sorted(products.items()):
        clues = sorted(set(re.findall('\\b(?:BOX|STRIP|PACK|VIAL|BOTTLE|AMPOULE|TAB(?:LET)?S?|CAPS?(?:ULE)?S?)\\b', title)))
        status_by_file = {m['source_workbook']: m['source_data_status'] for m in manifest}
        original = [r for r in part if status_by_file[r['source_workbook']] == 'ORIGINAL_SOURCE_EXPORT']
        product_review.append({'source_label': title, 'records': len(part), 'original_records': len(original), 'adjusted_records': sum((status_by_file[r['source_workbook']] == 'ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE' for r in part)), 'unreviewed_provenance_records': sum((status_by_file[r['source_workbook']] == 'UNREVIEWED_SOURCE_EXPORT' for r in part)), 'latest_record': max((r['date_delivered'] for r in part)).isoformat(), 'latest_original_record': max((r['date_delivered'] for r in original), default=None).isoformat() if original else None, 'packaging_words_only': clues, 'verified_billed_unit': None, 'physical_quantity_model_approved_by_audit': False})
    eligible_contracts = [r for r in contracts if r['net_sales'] is not None and 'NET_VALUE_FORMULA_MISMATCH' not in r['quality_rule_codes']]
    report = {'schema_version': 'sales-source-verification.v2_original_contracts', 'at_utc': datetime.now(timezone.utc).isoformat(), 'dataset_id': dataset_id, 'source_directory': source_dir.relative_to(ROOT).as_posix() if source_dir.is_relative_to(ROOT) else str(source_dir), 'status': 'PASS_LOCAL_PARSER_VERIFICATION_NOT_BUSINESS_APPROVAL', 'checks': checks, 'raw_lines': len(source_rows), 'clean_records': len(clean), 'financial_eligible_records': sum((r['financial_eligible_records'] for r in yearly)), 'financial_eligible_net_sales_php': str(sum((Decimal(r['financial_eligible_net_sales_php']) for r in yearly))), 'financial_eligibility_scope': 'technical net-value checks only; not revenue recognition, overlap clearance or publication approval', 'contract_candidate_records': len(contracts), 'contract_recorded_net_sales_php': sum_measure(contracts, 'net_sales'), 'contract_technically_eligible_records': len(eligible_contracts), 'contract_technically_eligible_net_sales_php': sum_measure(eligible_contracts, 'net_sales'), 'itemized_candidate_records': len(itemized), 'contract_physical_quantity': None, 'contract_product_breakdown': 'unavailable', 'files': yearly, 'monthly_observation_calendar': calendar, 'products': product_review, 'missing_calendar_months': [r['period'] for r in calendar if not r['records']], 'code_sha256': EMBEDDED_SOURCE_SHA256, 'source_files_modified': False, 'approvals_created': 0, 'models_trained': 0, 'limitations': ['No invoices/UOM/stockout evidence invented', 'Records present does not prove complete monthly sales', 'Adjusted product allocations are not original physical demand', 'Local parse is not live reconciliation until matching readback checked']}
    return report

# COMMAND ----------


"""Read-only original/source comparison. Match evidence, never approve extra revenue."""
from collections import Counter, defaultdict, deque
from datetime import date, datetime
from decimal import Decimal
import hashlib
import json
import re
from pathlib import Path

SIGNATURE_FIELDS = ('source_workbook', 'data_source_year', 'date_delivered', 'area',
                    'dr_number', 'product', 'quantity', 'quantity_primary_candidate',
                    'quantity_secondary_candidate', 'unit_selling_price', 'gross_sales',
                    'discount_amount', 'net_sales', 'unit_acquisition_cost',
                    'total_acquisition_cost', 'gross_margin_amount', 'discount_rate')
SOURCE_TABLE = 'workspace.medshield_gold_source_20261022.truth_48a447f8fe9556d3_fact'
CATEGORY_TABLE = 'workspace.medshield_gold_source_20261022.category_b160d6aad4376d64_candidate'
SOURCE_KEYS_SHA256 = '10c8386a2f97587baf55cc1b6ae41648c0046a66a2e7e185f2ad31b1ae7cdb82'
SOURCE_DATASET = 'abb5af9adc151cc7a88b5e2241ea6d4d0a1c78bbd7875a10e66fa67c1353f94d'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def signature(row):
    """Exact typed business fields; displayed margin ratio alone is not matched.

    Include source workbook/year so cross-year snapshots cannot consume another
    file's evidence. Preserve null versus zero and actual repeated observations.
    """
    values = []
    for field in SIGNATURE_FIELDS:
        value = row.get(field)
        if isinstance(value, Decimal):
            value = ('decimal', str(value.normalize()) if value else '0')
        elif isinstance(value, (date, datetime)):
            value = ('date', value.isoformat())
        values.append(value)
    return tuple(values)


def original_eligible(row):
    return row.get('net_sales') is not None and 'NET_VALUE_FORMULA_MISMATCH' not in row.get('quality_rule_codes', [])


def net(rows, eligible):
    return sum((row['net_sales'] for row in rows if eligible(row)), Decimal(0))


def reconcile_rows(assessed, serving, is_contract):
    require(len({row['source_record_id'] for row in assessed}) == len(assessed), 'Duplicate original physical-line keys')
    require(len({row['source_record_id'] for row in serving}) == len(serving), 'Duplicate serving keys')
    require(not any(row.get('is_contract_label') for row in serving), 'Unexpected contract row in itemized serving source')
    candidates = [row for row in assessed if row['is_analysis_candidate']]
    contracts = [row for row in candidates if is_contract(row.get('product'))]
    itemized = [row for row in candidates if not is_contract(row.get('product'))]
    original_groups, reviewed_groups = defaultdict(deque), defaultdict(deque)
    for row in sorted(itemized, key=lambda item: item['source_record_id']):
        original_groups[signature(row)].append(row)
    for row in sorted(assessed, key=lambda item: item['source_record_id']):
        if not row['is_analysis_candidate'] and row.get('product') and row.get('date_delivered') and not is_contract(row.get('product')):
            reviewed_groups[signature(row)].append(row)
    matched, noncandidate, serving_only = [], [], []
    eligibility_differences = 0
    for row in sorted(serving, key=lambda item: item['source_record_id']):
        key = signature(row)
        if original_groups[key]:
            original = original_groups[key].popleft()
            matched.append(original)
            eligibility_differences += original_eligible(original) != bool(row['is_net_sales_eligible'])
        elif reviewed_groups[key]:
            noncandidate.append(reviewed_groups[key].popleft())
        else:
            serving_only.append(row)
    original_only = [row for group in original_groups.values() for row in group]
    require(len(itemized) == len(matched) + len(original_only), 'Original candidate conservation failed')
    require(len(serving) == len(matched) + len(noncandidate) + len(serving_only), 'Serving conservation failed')
    require(len(candidates) == len(itemized) + len(contracts), 'Contract partition failed')
    source_net = net(itemized, original_eligible)
    contract_net = net(contracts, original_eligible)
    serving_net = net(serving, lambda row: bool(row['is_net_sales_eligible']) and row.get('net_sales') is not None)
    def controls(rows, eligibility):
        result = []
        for year in sorted({row['data_source_year'] for row in rows}):
            part = [row for row in rows if row['data_source_year'] == year]
            result.append(dict(source_year=year, records=len(part), technically_eligible_net_sales_php=str(net(part, eligibility))))
        return result
    return dict(
        original_physical_lines=len(assessed), original_candidates=len(candidates),
        original_itemized_candidates=len(itemized), original_contract_candidates=len(contracts),
        serving_records=len(serving), exact_original_candidate_matches=len(matched),
        serving_matches_original_non_candidate=len(noncandidate), unmatched_serving_records=len(serving_only),
        original_itemized_candidates_not_in_serving=len(original_only),
        matched_technical_vs_serving_eligibility_differences=eligibility_differences,
        matched_noncandidate_dispositions=dict(Counter(row['disposition'] for row in noncandidate)),
        original_only_dispositions=dict(Counter(row['disposition'] for row in original_only)),
        original_dispositions=dict(Counter(row['disposition'] for row in assessed)),
        original_itemized_technical_net_php=str(source_net), original_contract_technical_net_php=str(contract_net),
        original_total_technical_net_php=str(source_net + contract_net), serving_eligible_net_php=str(serving_net),
        itemized_technical_minus_serving_net_php=str(source_net - serving_net),
        original_itemized_controls=controls(itemized, original_eligible),
        contract_controls=controls(contracts, original_eligible),
        original_only_controls=controls(original_only, original_eligible),
        unmatched_serving_controls=controls(serving_only, lambda row: bool(row['is_net_sales_eligible'])),
        checks=dict(original_candidates_conserved=True, serving_records_conserved=True,
                    contracts_separate=True, repeated_observations_preserved=True),
        matching_policy='exact_same_workbook_typed_fields_multiset_v1; displayed margin ratio omitted',
        financial_scope='technical parser versus existing serving eligibility; differences are not approved incremental revenue',
        contract_quantity=None, contract_product_breakdown='unavailable', warehouse_writes=0,
        source_files_modified=False, serving_changed=False, approvals_added=0,
        status='RECONCILIATION_REPORT_ONLY_NOT_PUBLICATION_APPROVAL')


def assess_uploaded_originals(source_directory):
    """Use embedded current parser declarations; no external helper dependency."""
    source_directory = Path(source_directory)
    paths = sorted(source_directory.glob('medshield_data_*.csv'))
    require({f'medshield_data_{year}.csv' for year in range(2017, 2027)} <= {path.name for path in paths},
            'Expected already-uploaded original files 2017–2026')
    require(all(re.fullmatch(r'medshield_data_20\d{2}\.csv', path.name) for path in paths), 'Unexpected CSV filename')
    bronze, silver = bronze_namespace(), silver_namespace()
    manifest, raw = [], []
    for path in paths:
        payload = path.read_bytes()
        require(len(payload) <= 100 * 1024 * 1024, 'CSV exceeds reviewed source byte limit')
        digest = hashlib.sha256(payload).hexdigest()
        provenance, policy = bronze['source_provenance'](path.name, digest, payload=payload)
        lines = bronze['decode_csv_source'](payload, path.name)
        manifest.append(dict(source_workbook=path.name, source_file_sha256=digest, raw_lines=len(lines),
                             source_data_status=provenance, source_adjustment_policy=policy))
        for number, line in enumerate(lines, 1):
            raw.append(dict(dataset_id='', source_record_id=bronze['source_record_key'](path.name, digest, number),
                            source_workbook=path.name, source_row_number=number, data_source_year=int(path.stem[-4:]),
                            source_file_sha256=digest, raw_csv_line=line, source_path=str(path)))
    require(len(raw) <= 250000, 'Combined physical-line limit exceeded')
    dataset = bronze['build_dataset_id'](manifest)
    for row in raw:
        row['dataset_id'] = dataset
    assessed = silver['assess_sales_records'](raw)
    require(len(assessed) == len(raw), 'Physical lines not preserved')
    require(all(hashlib.sha256(path.read_bytes()).hexdigest() == entry['source_file_sha256']
                for path, entry in zip(paths, manifest)), 'Source changed during assessment')
    return assessed, manifest, dataset, silver['is_contract_parent_label']


def run_reconciliation(spark_session, source_directory=Path('/Workspace/medshield/medshield_project_csv')):
    from pyspark.sql import functions as F
    assessed, manifest, dataset, is_contract = assess_uploaded_originals(source_directory)
    fact = spark_session.read.option('versionAsOf', 0).table(SOURCE_TABLE)
    candidate = spark_session.read.option('versionAsOf', 0).table(CATEGORY_TABLE)
    require(fact.count() == candidate.count() == 40160, 'Pinned warehouse record counts differ')
    require(fact.select('source_record_id').distinct().count() == 40160, 'Pinned warehouse source keys not unique')
    key_hash = fact.agg(F.sha2(F.concat_ws('|', F.sort_array(F.collect_list('source_record_id'))), 256).alias('keys')).first()['keys']
    require(key_hash == SOURCE_KEYS_SHA256, 'Pinned warehouse key checksum differs')
    require(fact.filter(~F.col('dataset_id').eqNullSafe(F.lit(SOURCE_DATASET))).limit(1).count() == 0, 'Warehouse dataset identity differs')
    selected = list(SIGNATURE_FIELDS) + ['source_record_id', 'is_net_sales_eligible', 'is_contract_label']
    require(candidate.select(*selected).exceptAll(fact.select(*selected)).limit(1).count() == 0 and
            fact.select(*selected).exceptAll(candidate.select(*selected)).limit(1).count() == 0,
            'Accepted category candidate changed compared source fields')
    gold = [row.asDict() for row in fact.select(*selected).collect()]
    require(net(gold, lambda row: bool(row['is_net_sales_eligible']) and row['net_sales'] is not None) ==
            Decimal('637922399.530000'), 'Pinned warehouse financial control differs')
    report = reconcile_rows(assessed, gold, is_contract)
    report.update(original_dataset_id=dataset, source_manifest=manifest, compared_fact=SOURCE_TABLE,
                  accepted_category_candidate=CATEGORY_TABLE, warehouse_version=0)
    print(json.dumps(report, indent=2, default=str))
    print('PASS_RECONCILIATION_REPORT. No files or tables changed; differences remain review-only.')
    return report


if 'spark' in globals():
    run_reconciliation(spark)
