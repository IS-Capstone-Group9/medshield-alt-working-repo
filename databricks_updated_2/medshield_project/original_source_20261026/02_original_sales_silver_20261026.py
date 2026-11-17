# Databricks notebook source
# MAGIC %md
# MAGIC # Original-source Silver
# MAGIC Run the refreshed notebooks in order: Bronze → Silver → Gold. Use Run all within each notebook.
# MAGIC Setup/helper cells define the checked logic; only the last cell runs this layer.

# COMMAND ----------

"""Original-source candidate chain. Run Bronze, then Silver, then Gold.

Self-contained: no external Python helper imports. Uses already-uploaded original
CSVs and the accepted category package. Writes only new isolated candidate tables,
checks exact readback, refuses differing existing data and never switches serving.
"""


import csv
import hashlib
import io
import json
import re
from decimal import Decimal
from pathlib import Path
RELEASE_ID = 'category_b160d6aad4376d64'
MANIFEST_SHA256 = '49f87290a0919701a6e657ee0938e5fa1efee9bbd595ce1f5c03d097106f179d'
PACKAGE_DIRECTORY = '/Workspace/medshield/category_releases/' + RELEASE_ID
MUTABLE_FIELDS = {'product_category', 'category_status', 'display_category', 'product_scope_status', 'catalog_evidence_source', 'product_master_sha256', 'gold_published_at'}
KNOWN_CATEGORIES = {'medicine', 'medical_supply', 'medical_equipment', 'non_medical'}
SOURCE_TABLE = 'workspace.medshield_gold_source_20261022.truth_48a447f8fe9556d3_fact'
EXCLUDED_TABLE = 'workspace.medshield_gold_source_20261022.truth_48a447f8fe9556d3_excluded'

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Accepted-category package checks

# COMMAND ----------

def require(condition, message):
    if not condition:
        raise ValueError(message)

def validate_inputs(master, receipt, contract):
    """Validate category scope and exact alias coverage before any Spark action."""
    require(contract['release_id'] == RELEASE_ID, 'Wrong release')
    require(contract['mode'] == 'category_acceptance_candidate_only', 'Wrong publication mode')
    require(contract['source_table'] == SOURCE_TABLE and contract['source_version'] == 0, 'Wrong corrected source')
    require(contract['excluded_table'] == EXCLUDED_TABLE, 'Wrong exclusions')
    target = 'workspace.medshield_gold_source_20261022.' + RELEASE_ID + '_candidate'
    require(contract['target_table'] == target, 'Wrong candidate destination')
    require(set(contract['mutable_fields']) == MUTABLE_FIELDS, 'Immutable-field policy changed')
    require(contract['source_rows'] == 40160 and contract['source_product_labels'] == 5692, 'Wrong source counts')
    require(contract['accepted_aliases'] == 5694, 'Wrong accepted alias count')
    require(Decimal(contract['eligible_net_sales_php']) == Decimal('637922399.530000'), 'Wrong eligible finance')
    require(contract['live_serving_changed'] is False and contract['full_original_or_contract_finance'] is False, 'Candidate cannot activate serving or contract finance')
    require(contract['independent_approvals_added'] == 0, 'Independent approval scope changed')
    require(receipt['scope'] == 'reporting_category_only' and receipt['schema_version'] == 1, 'Wrong acceptance scope')
    require(receipt['requested_by'] == 'Adrian' and receipt['recorded_by'] == 'Codex acting on Adrian instruction', 'Wrong decision provenance')
    require(receipt['baseline_fact_version'] == 0 and receipt['dataset_id'] == contract['source_identity']['dataset_id'], 'Acceptance source mismatch')
    require(receipt['recorded_at'] == contract['recorded_at'], 'Acceptance time mismatch')
    require(receipt['product_master_sha256'] == contract['product_master_sha256'], 'Acceptance master mismatch')
    require(all((receipt[name] is False for name in ['business_release_approval', 'sku_or_unit_approval', 'forecast_approval'])), 'Independent approval added')
    require(not any((receipt.get(name) for name in ['business_approved', 'ceo_signed_off', 'forecast_approved'])), 'Independent signoff claimed')
    decisions = receipt['decisions']
    require(len(master) == len(decisions) == 5694, 'Missing category decisions')
    by_label = {row['raw_product']: row for row in master}
    require(len(by_label) == 5694, 'Duplicate master labels')
    keys, labels = (set(), set())
    for decision in decisions:
        label, key = (decision['raw_product'], decision['product_key'])
        require(label in by_label and label not in labels, 'Duplicate or missing receipt label')
        require(re.fullmatch('[a-f0-9]{64}', key) and key not in keys, 'Invalid or duplicate exact key')
        row = by_label[label]
        category = decision['product_category']
        require(category in KNOWN_CATEGORIES | {'unclassified'}, 'Invalid category')
        require(decision['category_status'] == 'approved', 'Category not accepted')
        require(decision['decision'] == ('accepted_unclassified' if category == 'unclassified' else 'accepted_category'), 'Unresolved bucket must stay explicit')
        for field in ['product_category', 'category_status', 'evidence_source', 'reviewed_by', 'reviewed_at']:
            require(row[field] == decision[field], 'Master/decision mismatch: ' + field)
        require(decision['reviewed_by'] == receipt['recorded_by'] and decision['reviewed_at'] == receipt['recorded_at'] and bool(decision['evidence_source']), 'Missing decision evidence')
        require(not row['canonical_sku'] and row['forecast_eligible'] == 'false', 'SKU or forecast approved')
        require(all((row[field] != 'approved' for field in ['identity_status', 'unit_status', 'item_kind_status', 'mapping_status', 'forecast_status'])), 'Independent dimension approved')
        labels.add(label)
        keys.add(key)
    require(sum((row['product_category'] == 'unclassified' for row in master)) == 875, 'Unclassified count changed')

def read_package(folder=PACKAGE_DIRECTORY):
    require(str(folder) == PACKAGE_DIRECTORY, 'Use the pinned Workspace package directory')
    folder = Path(folder)
    payload = (folder / 'manifest.json').read_bytes()
    require(hashlib.sha256(payload).hexdigest() == MANIFEST_SHA256, 'Wrong or changed acceptance manifest')
    manifest = json.loads(payload)
    require(manifest['release_id'] == RELEASE_ID, 'Package identity mismatch')
    required = {'accepted_product_master.csv', 'category_acceptance.json', 'publication_contract.json'}
    require(set(manifest['files']) == required, 'Unexpected package files')
    checked = {}
    for name, metadata in manifest['files'].items():
        raw = (folder / name).read_bytes()
        require(len(raw) == metadata['bytes'] and hashlib.sha256(raw).hexdigest() == metadata['sha256'], 'Package file changed: ' + name)
        checked[name] = raw
    master = list(csv.DictReader(io.StringIO(checked['accepted_product_master.csv'].decode('utf-8-sig'))))
    receipt = json.loads(checked['category_acceptance.json'])
    contract = json.loads(checked['publication_contract.json'])
    require(hashlib.sha256(checked['accepted_product_master.csv']).hexdigest() == contract['product_master_sha256'], 'Contract/master checksum mismatch')
    require(hashlib.sha256(checked['category_acceptance.json']).hexdigest() == contract['acceptance_sha256'], 'Contract/acceptance checksum mismatch')
    validate_inputs(master, receipt, contract)
    return (master, receipt, contract)

PIPELINE_CODE_SHA256 = '17c7c0c474aeab41271936874d5560b2ecc07fbd702a6d3b330b6706a6a07372'

RECONCILED_SOURCE_HASHES = {'medshield_data_2017.csv': ['15edfe33e5365e047d57556eb8a2dc9581b89b1f59f98449b983f0483f2b9c77', '9756376c5559a2b4539c3311a0416ec17eab7d3e36a9043920d0a70e1e16db67'], 'medshield_data_2018.csv': ['d7a1b8ad107e176e642aab540e464eab05b19dc116131b712c33e29fb355b200'], 'medshield_data_2019.csv': ['3afc789aa0ad798da14cbe87153049eb7f7d7ca15df944a8e27b25f97d419fc8'], 'medshield_data_2020.csv': ['98c83e6a440298e145b8bbfc2463791f393f0946f26a11c6b0472752d30ce733'], 'medshield_data_2021.csv': ['c1cc109b73a0b073a051cd2fbdd7df2e0c2c8ea52a98be8b8c443b0388d12477', 'd40850359d18a9251425a843f2507ad289da9393e4b6bc1c0ecfee35c30366d3'], 'medshield_data_2022.csv': ['1f28cacdcdc537065828cf809f8d0ae4bb55891a1317fe6c306d2b4b5b2caf74'], 'medshield_data_2023.csv': ['83e4509c84e0c2b6c379071593e589b5207842fd469430fe317e5e9a70368cea'], 'medshield_data_2024.csv': ['c38245983b918c0e44eecfccb3b63be00e8de9c848048dd007d1c086c714831f'], 'medshield_data_2025.csv': ['2738afaf114d9480928e37b6c2b53dc0cac9ba2f10dc74a98b2549e3345d235c'], 'medshield_data_2026.csv': ['2e5f1b6b10f2e9e439e3ed2599bdad4409cf46dd5a6a9d7ae68d640d70e10693', 'aa60c619e24db03449d026c4dbc9e6c2ee40176267a6f697d4548cc66599706c']}

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Reviewed CSV decoding and source identities
# MAGIC Helper definitions; no table writes in this cell.

# COMMAND ----------

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

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Reviewed parsing and disposition rules
# MAGIC Helper definitions; all physical lines are retained.

# COMMAND ----------

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

"""Original-source Bronze/Silver/Gold candidate logic; never changes live serving.

Embedded into three generated notebooks with the reviewed parsers and accepted
category package validator. No remote execution occurs on importing this module.
"""
import base64
from collections import Counter
from datetime import date, datetime
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import re
import zlib

LAYER_POLICY = 'original_source_layers_v1_candidate_only'
LAYER_SCHEMAS = {
    'bronze': 'workspace.medshield_original_bronze_20261026',
    'silver': 'workspace.medshield_original_silver_20261026',
    'gold': 'workspace.medshield_original_gold_20261026',
}
SOURCE_DIRECTORY = Path('/Workspace/medshield/medshield_project_csv')
DECIMAL_COLUMNS = ('quantity', 'unit_selling_price', 'gross_sales', 'discount_amount',
                   'net_sales', 'unit_acquisition_cost', 'total_acquisition_cost',
                   'gross_margin_amount', 'margin_pct', 'discount_rate',
                   'quantity_primary_candidate', 'quantity_secondary_candidate')


# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Evidence encoding and batch identity

# COMMAND ----------

def stable_json(value):
    def encode(item):
        if isinstance(item, Decimal):
            return format(item, 'f')
        if isinstance(item, (date, datetime)):
            return item.isoformat()
        raise TypeError(type(item).__name__)
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, default=encode)


def row_digest(value):
    return hashlib.sha256(stable_json(value).encode('utf-8')).hexdigest()


def evidence_envelope(dataset_id, record_id, value):
    payload = stable_json(value).encode('utf-8')
    return (dataset_id, record_id, hashlib.sha256(payload).hexdigest(),
            base64.b64encode(zlib.compress(payload)).decode('ascii'))


def decode_evidence(row):
    decoder = zlib.decompressobj()
    payload = decoder.decompress(base64.b64decode(row['payload_b64'], validate=True), 150 * 1024 * 1024 + 1)
    require(decoder.eof and not decoder.unused_data and len(payload) <= 150 * 1024 * 1024,
            'Evidence record exceeds reviewed size or has invalid framing')
    require(hashlib.sha256(payload).hexdigest() == row['payload_sha256'], 'Evidence payload checksum mismatch')
    return json.loads(payload)


def content_digest(rows):
    return hashlib.sha256('|'.join(sorted(row_digest(row) for row in rows)).encode()).hexdigest()


def pipeline_tables(dataset_id):
    require(re.fullmatch('[a-f0-9]{64}', dataset_id), 'Invalid original dataset identity')
    batch = hashlib.sha256((dataset_id + PIPELINE_CODE_SHA256 + MANIFEST_SHA256).encode()).hexdigest()[:20]
    prefix = 'original_' + batch
    return dict(batch_id=prefix,
                source_files=LAYER_SCHEMAS['bronze'] + '.' + prefix + '_source_files',
                raw_lines=LAYER_SCHEMAS['bronze'] + '.' + prefix + '_raw_lines',
                bronze_receipt=LAYER_SCHEMAS['bronze'] + '.' + prefix + '_receipt',
                assessed=LAYER_SCHEMAS['silver'] + '.' + prefix + '_assessed_rows',
                silver_receipt=LAYER_SCHEMAS['silver'] + '.' + prefix + '_receipt',
                itemized=LAYER_SCHEMAS['gold'] + '.' + prefix + '_itemized_candidates',
                contracts=LAYER_SCHEMAS['gold'] + '.' + prefix + '_contract_candidates',
                financial=LAYER_SCHEMAS['gold'] + '.' + prefix + '_financial_candidates',
                gold_receipt=LAYER_SCHEMAS['gold'] + '.' + prefix + '_receipt')


# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Read exact original source files

# COMMAND ----------

def original_bundle(source_directory=SOURCE_DIRECTORY):
    """Preserve exact source bytes as well as normalized physical-line evidence."""
    folder = Path(source_directory)
    paths = sorted(folder.glob('medshield_data_*.csv'))
    require({f'medshield_data_{year}.csv' for year in range(2017, 2027)} <= {p.name for p in paths},
            'Expected the already-supplied 2017–2026 originals')
    require(all(re.fullmatch(r'medshield_data_20\d{2}\.csv', p.name) for p in paths), 'Unexpected source filename')
    bronze = bronze_namespace()
    files, raw = [], []
    for path in paths:
        payload = path.read_bytes()
        require(len(payload) <= 100 * 1024 * 1024, 'Source exceeds reviewed byte limit')
        digest = hashlib.sha256(payload).hexdigest()
        status, policy = bronze['source_provenance'](path.name, digest, payload=payload)
        require(status != 'ADJUSTED_ESTIMATED_PRODUCT_ALLOCATION_SOURCE', 'Upload original CSVs, not adjusted allocations')
        expected = RECONCILED_SOURCE_HASHES.get(path.name)
        if expected is not None and digest not in expected:
            equivalent = path.name == 'medshield_data_2026.csv' and bronze['reviewed_2026_csv_representation'](payload)
            require(equivalent, 'Source differs from reconciled originals; reconcile the changed file before rebuilding')
        lines = bronze['decode_csv_source'](payload, path.name)
        files.append(dict(source_workbook=path.name, source_file_sha256=digest, bytes=len(payload),
                          raw_lines=len(lines), source_data_status=status, source_adjustment_policy=policy,
                          exact_source_bytes_b64=base64.b64encode(payload).decode('ascii')))
        for number, line in enumerate(lines, 1):
            raw.append(dict(dataset_id='', source_record_id=bronze['source_record_key'](path.name, digest, number),
                            source_workbook=path.name, data_source_year=int(path.stem[-4:]), source_row_number=number,
                            source_file_sha256=digest, raw_csv_line=line, source_path=str(path)))
    require(len(raw) <= 250000, 'Combined source exceeds reviewed physical-line limit')
    dataset = bronze['build_dataset_id'](files)
    for row in raw:
        row['dataset_id'] = dataset
    require(len({row['source_record_id'] for row in raw}) == len(raw), 'Duplicate physical-line identities')
    require(all(hashlib.sha256(path.read_bytes()).hexdigest() == row['source_file_sha256']
                for path, row in zip(paths, files)), 'Source changed during read')
    return dict(dataset_id=dataset, files=files, raw=raw)


# COMMAND ----------

# MAGIC %md
# MAGIC ## 6. Assess and restore Silver evidence

# COMMAND ----------

def assess_bundle(raw):
    """Assess all years together, retaining a disposition for every physical line."""
    rows = silver_namespace()['assess_sales_records'](raw)
    require(len(rows) == len(raw), 'Silver lost physical lines')
    require(Counter(row['source_record_id'] for row in rows) == Counter(row['source_record_id'] for row in raw),
            'Silver changed physical-line identities')
    require(all(row['disposition'] != 'PENDING_RECONCILIATION' for row in rows), 'Silver has unresolved parser dispositions')
    return rows


def restore_assessed(row):
    result = dict(row)
    for field in DECIMAL_COLUMNS:
        if result.get(field) is not None:
            result[field] = Decimal(str(result[field]))
    if result.get('date_delivered') is not None:
        result['date_delivered'] = date.fromisoformat(result['date_delivered'])
    return result


# COMMAND ----------

# MAGIC %md
# MAGIC ## 7. Build separate Gold candidate populations

# COMMAND ----------

def gold_candidates(assessed, receipt, source_files):
    decisions = {row['normalized_product']: row for row in receipt['decisions']}
    require(len(decisions) == len(receipt['decisions']), 'Duplicate accepted labels')
    provenance = {row['source_workbook']: row['source_data_status'] for row in source_files}
    is_contract = silver_namespace()['is_contract_parent_label']
    itemized, contracts, financial = [], [], []
    for source in assessed:
        if not source['is_analysis_candidate']:
            continue
        contract = is_contract(source.get('product'))
        label = ' '.join((source['product'] or '').split()).upper()
        decision = None if contract else decisions.get(label)
        require(contract or decision is not None, 'Original itemized label lacks accepted category evidence')
        if decision is not None:
            require(decision['category_status'] == 'approved', 'Category decision is not accepted')
            require(decision['product_key'] == hashlib.sha256(label.encode()).hexdigest(), 'Accepted product key mismatch')
        rules = source['quality_rule_codes']
        eligible = source['net_sales'] is not None and 'NET_VALUE_FORMULA_MISMATCH' not in rules
        cost_eligible = source['total_acquisition_cost'] is not None and 'TRANSFER_VALUE_FORMULA_MISMATCH' not in rules
        row = dict(source_record_id=source['source_record_id'], dataset_id=source['dataset_id'],
                   policy_version=LAYER_POLICY, source_workbook=source['source_workbook'],
                   source_file_sha256=source['source_file_sha256'], source_row_number=source['source_row_number'],
                   data_source_year=source['data_source_year'], date_delivered=source['date_delivered'],
                   source_data_status=provenance[source['source_workbook']],
                   record_kind='contract_summary' if contract else 'itemized_sale',
                   product_key=None if contract else decision['product_key'],
                   normalized_product=None if contract else label,
                   area=None if contract else source['area'], dr_number=None if contract else source['dr_number'],
                   product_category=None if contract else decision['product_category'],
                   category_status='not_applicable_contract' if contract else 'approved',
                   category_evidence=None if contract else decision['evidence_source'],
                   recorded_quantity=None if contract else source['quantity'], physical_quantity=None,
                   quantity_unit=None, contract_product_breakdown='unavailable' if contract else 'itemized_source_label',
                   gross_sales=source['gross_sales'], discount_amount=source['discount_amount'],
                   net_sales=source['net_sales'], acquisition_cost=source['total_acquisition_cost'],
                   gross_margin_amount=source['gross_margin_amount'],
                   is_net_sales_technically_eligible=eligible,
                   is_gross_sales_technically_eligible=source['gross_sales'] is not None and 'GROSS_VALUE_FORMULA_MISMATCH' not in rules,
                   is_acquisition_cost_technically_eligible=cost_eligible,
                   is_gross_margin_technically_eligible=eligible and cost_eligible and source['gross_margin_amount'] is not None and 'GROSS_MARGIN_FORMULA_MISMATCH' not in rules,
                   quality_rule_codes_json=json.dumps(rules, separators=(',', ':')),
                   forecast_eligible=False,
                   source_unit_approved=False, financial_release_approved=False,
                   publication_status='CANDIDATE_PENDING_FINANCIAL_RECONCILIATION_AND_RELEASE')
        (contracts if contract else itemized).append(row)
        financial.append(dict(row))
    require(len(itemized) + len(contracts) == len(financial), 'Gold candidate partition failed')
    require(len({row['source_record_id'] for row in financial}) == len(financial), 'Gold duplicated source observations')
    expected = sum((row['net_sales'] for row in assessed if row['is_analysis_candidate'] and
                    row['net_sales'] is not None and 'NET_VALUE_FORMULA_MISMATCH' not in row['quality_rule_codes']), Decimal(0))
    actual = sum((row['net_sales'] for row in financial if row['is_net_sales_technically_eligible']), Decimal(0))
    require(expected == actual, 'Gold technical financial conservation failed')
    require(all(row['physical_quantity'] is None and row['recorded_quantity'] is None for row in contracts),
            'Contract quantity was invented')
    return dict(itemized=itemized, contracts=contracts, financial=financial)


# COMMAND ----------

# MAGIC %md
# MAGIC ## 8. Financial controls and immutable table guards

# COMMAND ----------

def aggregate_controls(rows):
    eligible = [row for row in rows if row['is_net_sales_technically_eligible']]
    return dict(records=len(rows), technically_eligible_records=len(eligible),
                technically_eligible_net_php=str(sum((row['net_sales'] for row in eligible), Decimal(0))))


def checked_table_name(table):
    require(re.fullmatch(r'workspace\.medshield_original_(?:bronze|silver|gold)_20261026\.original_[a-f0-9]{20}_[a-z_]+', table),
            'Refusing table outside isolated original-source namespaces')
    return table


def read_frame(spark_session, table):
    from pyspark.sql import functions as F
    checked_table_name(table)
    require(spark_session.catalog.tableExists(table), 'Run the preceding layer first; missing table: ' + table)
    version = spark_session.sql('DESCRIBE HISTORY ' + table).agg(F.max('version').alias('version')).first()['version']
    require(version == 0, 'Existing original-source candidate was changed; refusing: ' + table)
    return spark_session.read.option('versionAsOf', 0).table(table)


def create_or_verify(spark_session, table, frame):
    checked_table_name(table)
    existed = spark_session.catalog.tableExists(table)
    if not existed:
        frame.writeTo(table).using('delta').create()
    actual = read_frame(spark_session, table)
    require([(field.name, field.dataType.simpleString()) for field in actual.schema.fields] ==
            [(field.name, field.dataType.simpleString()) for field in frame.schema.fields], 'Readback schema mismatch')
    require(actual.exceptAll(frame).limit(1).count() == 0 and frame.exceptAll(actual).limit(1).count() == 0,
            'Existing/readback original-source data differs; no overwrite permitted')
    return not existed


# COMMAND ----------

# MAGIC %md
# MAGIC ## 9. Evidence and typed Gold schemas

# COMMAND ----------

def evidence_frame(spark_session, dataset, rows, key):
    require(len({str(row[key]) for row in rows}) == len(rows), 'Duplicate evidence record IDs')
    data = [evidence_envelope(dataset, str(row[key]), row) for row in rows]
    return spark_session.createDataFrame(data, 'dataset_id string, record_id string, payload_sha256 string, payload_b64 string')


def load_evidence(spark_session, table, dataset):
    frame = read_frame(spark_session, table)
    rows = frame.collect()
    require(all(row['dataset_id'] == dataset for row in rows), 'Stored evidence belongs to another dataset')
    require(len({row['record_id'] for row in rows}) == len(rows), 'Stored evidence IDs duplicated')
    return [decode_evidence(row.asDict()) for row in rows]


def gold_frame(spark_session, rows):
    from pyspark.sql import types as T
    # Fixed schema handles all-null contract quantities and Decimal values exactly.
    decimals = {'recorded_quantity', 'physical_quantity', 'gross_sales', 'discount_amount',
                'net_sales', 'acquisition_cost', 'gross_margin_amount'}
    booleans = {'is_net_sales_technically_eligible', 'is_gross_sales_technically_eligible',
                'is_acquisition_cost_technically_eligible', 'is_gross_margin_technically_eligible',
                'forecast_eligible', 'source_unit_approved', 'financial_release_approved'}
    integers = {'source_row_number', 'data_source_year'}
    fields = ['source_record_id', 'dataset_id', 'policy_version', 'source_workbook', 'source_file_sha256',
              'source_row_number', 'data_source_year', 'date_delivered', 'source_data_status', 'record_kind',
              'product_key', 'normalized_product', 'area', 'dr_number', 'product_category', 'category_status',
              'category_evidence', 'recorded_quantity', 'physical_quantity', 'quantity_unit', 'contract_product_breakdown',
              'gross_sales', 'discount_amount', 'net_sales', 'acquisition_cost', 'gross_margin_amount',
              'is_net_sales_technically_eligible', 'is_gross_sales_technically_eligible',
              'is_acquisition_cost_technically_eligible', 'is_gross_margin_technically_eligible',
              'quality_rule_codes_json', 'forecast_eligible', 'source_unit_approved',
              'financial_release_approved', 'publication_status']
    def datatype(name):
        return (T.DecimalType(24, 6) if name in decimals else T.BooleanType() if name in booleans else
                T.LongType() if name in integers else T.DateType() if name == 'date_delivered' else T.StringType())
    schema = T.StructType([T.StructField(name, datatype(name), True) for name in fields])
    return spark_session.createDataFrame([tuple(row[name] for name in fields) for row in rows], schema)


# COMMAND ----------

# MAGIC %md
# MAGIC ## 10. Layer orchestration and exact readback

# COMMAND ----------

def run_original_layer(spark_session, layer, source_directory=SOURCE_DIRECTORY):
    require(layer in LAYER_SCHEMAS, 'Unknown original-source layer')
    bundle = original_bundle(source_directory)
    dataset, files, raw = bundle['dataset_id'], bundle['files'], bundle['raw']
    tables = pipeline_tables(dataset)
    # Schema names are fixed constants. No grants, credential changes or old schema writes.
    spark_session.sql('CREATE SCHEMA IF NOT EXISTS ' + LAYER_SCHEMAS[layer])
    writes = 0
    basic = dict(record_id=layer + '_receipt', dataset_id=dataset, pipeline_policy=LAYER_POLICY,
                 pipeline_code_sha256=PIPELINE_CODE_SHA256, acceptance_manifest_sha256=MANIFEST_SHA256,
                 physical_lines=len(raw), source_files=len(files), batch_id=tables['batch_id'])
    if layer == 'bronze':
        writes += create_or_verify(spark_session, tables['source_files'], evidence_frame(spark_session, dataset, files, 'source_workbook'))
        writes += create_or_verify(spark_session, tables['raw_lines'], evidence_frame(spark_session, dataset, raw, 'source_record_id'))
        basic.update(source_files_digest=content_digest(files), raw_lines_digest=content_digest(raw))
        writes += create_or_verify(spark_session, tables['bronze_receipt'], evidence_frame(spark_session, dataset, [basic], 'record_id'))
    elif layer == 'silver':
        saved_files = load_evidence(spark_session, tables['source_files'], dataset)
        saved_raw = load_evidence(spark_session, tables['raw_lines'], dataset)
        require(content_digest(saved_files) == content_digest(files) and content_digest(saved_raw) == content_digest(raw),
                'Bronze does not match current original bytes/lines')
        for entry in saved_files:
            require(hashlib.sha256(base64.b64decode(entry['exact_source_bytes_b64'], validate=True)).hexdigest() ==
                    entry['source_file_sha256'], 'Bronze exact source bytes differ')
        assessed = assess_bundle(saved_raw)
        basic.update(assessed_digest=content_digest(assessed), raw_lines_digest=content_digest(saved_raw),
                     dispositions=dict(Counter(row['disposition'] for row in assessed)),
                     analysis_candidates=sum(row['is_analysis_candidate'] for row in assessed))
        writes += create_or_verify(spark_session, tables['assessed'], evidence_frame(spark_session, dataset, assessed, 'source_record_id'))
        writes += create_or_verify(spark_session, tables['silver_receipt'], evidence_frame(spark_session, dataset, [basic], 'record_id'))
    else:
        master, acceptance, accepted_contract = read_package()
        saved = load_evidence(spark_session, tables['assessed'], dataset)
        silver_receipts = load_evidence(spark_session, tables['silver_receipt'], dataset)
        require(len(silver_receipts) == 1 and silver_receipts[0]['pipeline_code_sha256'] == PIPELINE_CODE_SHA256,
                'Silver receipt policy differs')
        require(silver_receipts[0]['raw_lines_digest'] == content_digest(raw) and
                silver_receipts[0]['assessed_digest'] == content_digest(saved), 'Silver evidence checksum mismatch')
        assessed = [restore_assessed(row) for row in saved]
        require(len(assessed) == len(raw), 'Silver original physical lines lost')
        result = gold_candidates(assessed, acceptance, files)
        basic.update(accepted_master_sha256=accepted_contract['product_master_sha256'],
                     itemized=aggregate_controls(result['itemized']), contracts=aggregate_controls(result['contracts']),
                     financial=aggregate_controls(result['financial']),
                     contract_product_breakdown='unavailable', contract_physical_quantity=None,
                     business_financial_release_approved=False)
        for name in ['itemized', 'contracts', 'financial']:
            writes += create_or_verify(spark_session, tables[name], gold_frame(spark_session, result[name]))
        writes += create_or_verify(spark_session, tables['gold_receipt'], evidence_frame(spark_session, dataset, [basic], 'record_id'))
    output = dict(basic)
    output.update(layer=layer, created_tables=writes, tables=tables, live_serving_changed=False,
                  source_files_modified=False, sku_unit_forecast_approvals_added=0,
                  financial_publication_approved=False)
    print(json.dumps(output, indent=2, default=str))
    print('PASS_ORIGINAL_' + layer.upper() + '_CANDIDATE. Exact readback verified; live serving unchanged.')
    return output


# COMMAND ----------

# MAGIC %md
# MAGIC ## 11. Run Silver
# MAGIC Execute after the preceding layer has passed. Live serving stays unchanged.

# COMMAND ----------

if 'spark' in globals():
    run_original_layer(spark, 'silver')
