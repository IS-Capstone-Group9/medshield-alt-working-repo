"""Read-only financial checks. Candidate document groups never establish overlap clearance."""
from collections import Counter, defaultdict
from datetime import date
from decimal import Decimal
import json


def require(condition, message):
    if not condition:
        raise ValueError(message)


def keyed(rows):
    result = {row['source_record_id']: row for row in rows}
    require(len(result) == len(rows) and all(result), 'Missing or duplicate source record ID')
    return result


def money(rows):
    eligible = [row for row in rows if row['is_net_sales_technically_eligible']]
    require(all(row['net_sales'] is not None for row in eligible), 'Eligible net is missing')
    positive = sum((row['net_sales'] for row in eligible if row['net_sales'] > 0), Decimal(0))
    negative = sum((row['net_sales'] for row in eligible if row['net_sales'] < 0), Decimal(0))
    return dict(records=len(rows), eligible_records=len(eligible), ineligible_records=len(rows)-len(eligible),
                signed_net_php=str(positive+negative), positive_net_php=str(positive),
                signed_negative_net_php=str(negative),
                eligible_zero_net_records=sum(row['net_sales'] == 0 for row in eligible),
                missing_net_records=sum(row['net_sales'] is None for row in rows))


def candidate_document_key(row):
    """Screen only; DR/area are not verified customer or parent-child identities."""
    values = tuple(row.get(name) for name in ['source_workbook', 'date_delivered', 'area', 'dr_number'])
    return values if all(value is not None and str(value).strip() for value in values) else None


def financial_scope_report(itemized, contracts, financial, assessed):
    items, parents, combined = keyed(itemized), keyed(contracts), keyed(financial)
    ledger = keyed(assessed)
    require(not set(items) & set(parents), 'Itemized and contract keys overlap')
    require(set(items) | set(parents) == set(combined), 'Financial population does not equal itemized plus contracts')
    require(set(combined) == {row['source_record_id'] for row in assessed if row['is_analysis_candidate']},
            'Gold differs from Silver analysis candidates')
    require(all(combined[key] == row for key, row in {**items, **parents}.items()), 'Financial row values differ from source partitions')
    for row in financial:
        require(row['forecast_eligible'] is False and row['source_unit_approved'] is False and
                row['financial_release_approved'] is False, 'Unexpected independent or financial approval')
        require(row['date_delivered'] is not None, 'Gold candidate delivery date is missing')
        rules = json.loads(row['quality_rule_codes_json'])
        if row['is_net_sales_technically_eligible']:
            require(row['net_sales'] is not None and 'NET_VALUE_FORMULA_MISMATCH' not in rules, 'Invalid net eligibility flag')
        if row['is_gross_margin_technically_eligible']:
            require(row['is_net_sales_technically_eligible'] and row['is_acquisition_cost_technically_eligible'] and
                    row['acquisition_cost'] is not None and row['gross_margin_amount'] is not None,
                    'Margin numerator/denominator population mismatch')
            require(abs(row['net_sales']-row['acquisition_cost']-row['gross_margin_amount']) <= Decimal('0.02'),
                    'Eligible margin formula differs beyond source tolerance')
    require(all(row['record_kind'] == 'itemized_sale' for row in itemized), 'Unexpected itemized row kind')
    require(all(row['record_kind'] == 'contract_summary' and row['physical_quantity'] is None and
                row['recorded_quantity'] is None and row['normalized_product'] is None and
                row['area'] is None and row['dr_number'] is None for row in contracts), 'Contract detail or quantity invented')
    controls = dict(itemized=money(itemized), contracts=money(contracts), financial=money(financial))
    require(Decimal(controls['itemized']['signed_net_php'])+Decimal(controls['contracts']['signed_net_php']) ==
            Decimal(controls['financial']['signed_net_php']), 'Signed net partition differs')
    margin_rows = [row for row in financial if row['is_gross_margin_technically_eligible']]
    margin_sales = sum((row['net_sales'] for row in margin_rows), Decimal(0))
    margin_cost = sum((row['acquisition_cost'] for row in margin_rows), Decimal(0))
    margin_reported = sum((row['gross_margin_amount'] for row in margin_rows), Decimal(0))
    item_docs = defaultdict(list)
    for key in items:
        document = candidate_document_key(ledger[key])
        if document is not None:
            item_docs[document].append(key)
    screening = Counter()
    case_refs = []
    for key, parent in parents.items():
        document = candidate_document_key(ledger[key])
        if document is None:
            screening['missing_candidate_document_fields'] += 1
        elif document not in item_docs:
            screening['no_itemized_rows_with_same_candidate_document_key'] += 1
        else:
            child_rows = [items[identity] for identity in item_docs[document]]
            if parent['is_net_sales_technically_eligible'] and all(row['is_net_sales_technically_eligible'] for row in child_rows):
                child_net = sum((row['net_sales'] for row in child_rows), Decimal(0))
                label = ('shared_candidate_document_and_net_amount_match' if abs(parent['net_sales']-child_net) <= Decimal('0.02')
                         else 'shared_candidate_document_but_amounts_differ')
            else:
                label = 'shared_candidate_document_with_ineligible_amounts'
            screening[label] += 1
            case_refs.append(dict(source_record_id=key, source_workbook=ledger[key]['source_workbook'],
                                  physical_csv_line=ledger[key].get('source_row_number'),
                                  screen_result=label, candidate_itemized_records=len(child_rows),
                                  interpretation='possible link only; requires source-owner disposition'))
    require(sum(screening.values()) == len(contracts), 'Contract screen does not cover all parents')
    repeated_fields = ['source_workbook', 'date_delivered', 'area', 'dr_number', 'normalized_product',
                       'recorded_quantity', 'gross_sales', 'discount_amount', 'net_sales', 'acquisition_cost', 'gross_margin_amount']
    repeats = Counter(tuple(row.get(field) for field in repeated_fields) for row in itemized)
    positive_total = Decimal(controls['financial']['positive_net_php'])
    positive_itemized = Decimal(controls['itemized']['positive_net_php'])
    years = []
    for year in sorted({row['date_delivered'].year for row in financial}):
        part = [row for row in financial if row['date_delivered'].year == year]
        years.append(dict(delivery_year=year, **money(part)))
    return dict(status='FINANCIAL_TECHNICAL_REVIEW_NOT_RELEASE_APPROVAL',
                controls=controls, by_delivery_year=years,
                margin_same_population=dict(records=len(margin_rows), net_sales_php=str(margin_sales),
                    acquisition_cost_php=str(margin_cost), reported_gross_margin_php=str(margin_reported),
                    derived_sales_minus_cost_php=str(margin_sales-margin_cost),
                    reported_margin_pct=None if margin_sales == 0 else str((margin_reported/margin_sales*100).quantize(Decimal('0.01')))),
                candidate_itemized_positive_value_share_pct=None if positive_total == 0 else
                    str((positive_itemized/positive_total*100).quantize(Decimal('0.01'))),
                share_scope='eligible positive candidate net only; returns separate; not complete-company coverage or demand coverage',
                possible_repeated_itemized_groups=sum(count > 1 for count in repeats.values()),
                possible_repeated_itemized_occurrences_beyond_first=sum(count-1 for count in repeats.values() if count > 1),
                repeat_action='preserved; equality does not prove erroneous duplication',
                contract_document_screen=dict(screening),
                contract_review_case_refs=case_refs,
                document_screen_scope='same source file, delivery date, recorded area label and DR; screening only, not verified parent/child or customer linkage',
                contract_overlap_clearance='NOT_ESTABLISHED_BY_AUTOMATED_SCREEN',
                contracts_requiring_supported_financial_scope_disposition=len(contracts),
                publication_ready=False, business_financial_release_approved=False,
                warehouse_writes=0, live_serving_changed=False, approvals_added=0)
