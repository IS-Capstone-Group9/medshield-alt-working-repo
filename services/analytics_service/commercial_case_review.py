"""Read-only, source-linked investigation of flagged commercial labels."""
from collections import Counter
from decimal import Decimal
import hashlib
import json
from pathlib import Path


def require(condition, message):
    if not condition:
        raise ValueError(message)


def eligible(row, field):
    require(row[field] in ('true', 'false'), 'Unexpected eligibility representation')
    return row[field] == 'true'


def value(row, field):
    if row.get(field) is None:
        return None
    result = Decimal(str(row[field]))
    require(result.is_finite(), 'Nonfinite monetary source')
    return result


def total(rows, field):
    values = [value(r, field) for r in rows if value(r, field) is not None]
    return sum(values, Decimal(0)) if values else None


def aggregate(rows):
    net = [r for r in rows if eligible(r, 'is_net_sales_technically_eligible')]
    paired = [r for r in rows if eligible(r, 'is_gross_margin_technically_eligible')]
    require(all(value(r, 'net_sales') is not None for r in net), 'Eligible net missing')
    require(all(all(value(r, f) is not None for f in ('net_sales', 'acquisition_cost', 'gross_margin_amount')) for r in paired), 'Eligible margin pair missing')
    return dict(records=len(rows), net_records=len(net), net_sales=total(net, 'net_sales'),
                margin_records=len(paired), gross_profit=total(paired, 'gross_margin_amount'),
                margin_basis=total(paired, 'net_sales'), supported_cost=total(paired, 'acquisition_cost'))


def record_value_bridge(prior, current):
    if prior['net_records'] == 0 or current['net_records'] == 0:
        return dict(available=False, reason='No eligible observations on both sides; absence is not zero')
    p, c = prior['net_sales'], current['net_sales']
    ap, ac = p/prior['net_records'], c/current['net_records']
    count_effect = Decimal(current['net_records']-prior['net_records'])*ap
    mean_effect = Decimal(current['net_records'])*(ac-ap)
    require(abs(count_effect+mean_effect-(c-p)) < Decimal('.000001'), 'Bridge does not conserve change')
    return dict(available=True, recorded_net_change=c-p, prior_eligible_lines=prior['net_records'],
                current_eligible_lines=current['net_records'], prior_mean_net_per_eligible_line=ap,
                current_mean_net_per_eligible_line=ac, count_effect=count_effect, mean_recorded_value_effect=mean_effect,
                interpretation='Fixed-order accounting identity, not product quantity, order/customer counts or a causal attribution')


def locator(row):
    return {key: row[key] for key in ('source_record_id', 'source_workbook', 'source_file_sha256', 'source_row_number', 'date')}


def analyze(source):
    rows = source['detail']['rows']
    require(len({r['source_record_id'] for r in rows}) == len(rows), 'Repeated extraction key')
    controls = {(r['normalized_product'], r['year']): r for r in source['controls']['rows']}
    require(len(controls) == len(source['controls']['rows']), 'Duplicate control key')
    require(source['warehouse_writes'] == 0 and source['source_files_modified'] is False and source['approvals_created'] == 0, 'Invalid assessment boundary')
    require(source['release']['dataset_id'] == 'e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10', 'Wrong original dataset')
    result = []
    for case in source['cases']:
        groups = {year: [r for r in rows if r['normalized_product'] == case['label'] and r['date'].startswith(year)] for year in ('2025', '2026')}
        summaries = {year: aggregate(group) for year, group in groups.items()}
        for year, summary in summaries.items():
            control = controls.get((case['label'], year))
            if control is None:
                require(summary['records'] == 0, 'Missing independent control')
                continue
            for field in ('records', 'net_records', 'margin_records'):
                require(summary[field] == int(control[field]), 'Independent control count differs')
            for field in ('net_sales', 'gross_profit', 'margin_basis'):
                require(summary[field] == value(control, field), 'Independent control money differs')
        expected = case['expected']
        for actual, key in [(summaries['2026']['net_sales'], 'revenue'), (summaries['2026']['gross_profit'], 'grossProfit'),
                            (summaries['2026']['net_sales'], 'matchedCurrent'), (summaries['2025']['net_sales'], 'matchedPrior')]:
            wanted = expected[key]
            require(actual is None and wanted is None or actual is not None and wanted is not None and abs(actual-Decimal(str(wanted))) <= Decimal('.000001'), 'Review-view reconciliation differs')
        require(summaries['2026']['records'] == expected['records'], 'Retained count differs from review')
        require(summaries['2026']['margin_records'] == expected['marginRecords'], 'Margin support differs from review')
        current = groups['2026']
        supported = [r for r in current if eligible(r, 'is_gross_margin_technically_eligible')]
        unsupported = [r for r in current if not eligible(r, 'is_gross_margin_technically_eligible')]
        negative = [r for r in supported if value(r, 'gross_margin_amount') < 0]
        residuals = [dict(**locator(r), residual_php=value(r, 'gross_margin_amount')-(value(r, 'net_sales')-value(r, 'acquisition_cost')))
                     for r in supported]
        quality = Counter(code for r in unsupported for code in json.loads(r['quality_rule_codes_json']))
        result.append(dict(label=case['label'], reporting_id=case['id'], focuses=case['focuses'], summaries=summaries,
            record_value_bridge=record_value_bridge(summaries['2025'], summaries['2026']),
            negative_supported_records=[dict(**locator(r), net_sales=value(r,'net_sales'), acquisition_cost=value(r,'acquisition_cost'), gross_profit=value(r,'gross_margin_amount')) for r in negative],
            negative_gross_profit_subtotal=total(negative,'gross_margin_amount'),
            positive_profit_offset=total([r for r in supported if value(r,'gross_margin_amount') >= 0],'gross_margin_amount'),
            supported_formula_residuals=residuals,
            unsupported_margin_records=[dict(**locator(r), net_sales=value(r,'net_sales'), quality_codes=json.loads(r['quality_rule_codes_json'])) for r in unsupported],
            unsupported_net_eligible_amount=total([r for r in unsupported if eligible(r,'is_net_sales_technically_eligible')],'net_sales'),
            unsupported_quality_counts=dict(quality), source_status_counts=dict(Counter(r['source_data_status'] for r in current)),
            next_action='Source owner verifies source references, label/pack identity, cost/discount basis and reporting availability; no correction or procurement decision inferred'))
    require(sum(sum(v['records'] for v in case['summaries'].values()) for case in result) == len(rows), 'Case cohort does not conserve extracted records')
    return result


def main():
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, required=True)
    args = parser.parse_args()
    raw = (args.directory/'source.json').read_bytes()
    source_hash = hashlib.sha256(raw).hexdigest()
    require(source_hash == (args.directory/'source.sha256').read_text().strip(), 'Source capture changed')
    source = json.loads(raw)
    cases = analyze(source)
    result = dict(status='COMMERCIAL_SOURCE_CASE_REVIEW_NOT_APPROVAL', source_sha256=source_hash,
                  source_release=source['release'], cases=cases, warehouse_writes=0, source_files_modified=False,
                  approvals_created=0, models_trained=0, unresolved_owner_decisions=True)
    content=(json.dumps(result,indent=2,default=str)+'\n').encode()
    (args.directory/'results.json').write_bytes(content)
    report=dict(status='PASS_CASE_SOURCE_CONTROL_AND_REVIEW_RECONCILIATION',cases=len(cases),
                source_records=len(source['detail']['rows']),control_groups=len(source['controls']['rows']),
                source_sha256=source_hash,results_sha256=hashlib.sha256(content).hexdigest(),
                analyzer_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),warehouse_writes=0)
    (args.directory/'calculation-verification.json').write_bytes((json.dumps(report,indent=2)+'\n').encode())
    print(json.dumps(report))


if __name__ == '__main__':
    main()
