"""Source-preserving label and billed-price investigation, never a SKU mapping."""
import argparse
from collections import Counter, defaultdict
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import json
from pathlib import Path

from .medicine_pilot_screen import presentation_leads

DATASET = 'e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10'


def yes(value):
    assert value in (True, False, 'true', 'false'), 'Invalid Boolean'
    return value is True or value == 'true'


def rounded_price(amount, quantity):
    if amount is None or quantity is None or Decimal(quantity) <= 0:
        return None
    return str((Decimal(amount) / Decimal(quantity)).quantize(Decimal('.01'), rounding=ROUND_HALF_UP))


def history(rows, cutoff='2026-09'):
    months = sorted({r['date'][:7] for r in rows if r['recorded_quantity'] is not None and Decimal(r['recorded_quantity']) > 0})
    ids = {int(m[:4])*12+int(m[5:])-1 for m in months}
    end = int(cutoff[:4])*12+int(cutoff[5:])-1
    tail = 0
    while end-tail in ids:
        tail += 1
    return dict(positive_observed_months=months, positive_tail_at_cutoff=tail,
                first_date=min(r['date'] for r in rows), last_date=max(r['date'] for r in rows))


def summarize(rows):
    prices = Counter()
    for r in rows:
        if r['recorded_quantity'] is None or Decimal(r['recorded_quantity']) <= 0:
            continue
        gross = rounded_price(r['gross_sales'], r['recorded_quantity']) if yes(r['is_gross_sales_technically_eligible']) else None
        cost = rounded_price(r['acquisition_cost'], r['recorded_quantity']) if yes(r['is_acquisition_cost_technically_eligible']) else None
        prices[(gross, cost)] += 1
    return dict(records=len(rows), eligible_net_sales_php=str(sum((Decimal(r['net_sales']) for r in rows if yes(r['is_net_sales_technically_eligible'])), Decimal(0))),
                positive_quantity_records=sum(r['recorded_quantity'] is not None and Decimal(r['recorded_quantity']) > 0 for r in rows),
                negative_quantity_records=sum(r['recorded_quantity'] is not None and Decimal(r['recorded_quantity']) < 0 for r in rows),
                missing_quantity_records=sum(r['recorded_quantity'] is None for r in rows),
                source_status_counts=dict(sorted(Counter(r['source_data_status'] for r in rows).items())),
                positive_record_price_pairs=[dict(gross_per_recorded_count=g, acquisition_per_recorded_count=c, records=n)
                    for (g,c),n in sorted(prices.items(),key=lambda item:(-item[1],str(item[0])))], **history(rows))


def analyze(source, prior, tables):
    assert source['release']['dataset_id'] == DATASET
    assert source['release'] == prior['release'], 'Prior screen/source mismatch'
    assert source['contracts_excluded'] is True
    rows = source['queries']['detail']['rows']
    assert rows and len({r['source_record_id'] for r in rows}) == len(rows)
    grouped = defaultdict(list)
    monthly = defaultdict(list)
    for r in rows:
        label = r['normalized_product']
        assert any(root in label for root in ('BUPIR','BUPIL','BUPIV'))
        assert r['product_key'] == hashlib.sha256(label.encode()).hexdigest()
        assert not yes(r['source_unit_approved']) and not yes(r['forecast_eligible'])
        assert r['physical_quantity'] is None and r['quantity_unit'] is None
        grouped[(label,r['product_category'],r['raw_area'],r['date'][:4])].append(r)
        monthly[(label,r['raw_area'],r['date'][:7])].append(r)
    controls = source['queries']['controls']['rows']
    assert len(grouped) == len(controls)
    for c in controls:
        group = grouped[(c['normalized_product'],c['product_category'],c['raw_area'],str(c['year']))]
        assert len(group) == int(c['records'])
        values = [Decimal(r['net_sales']) for r in group if yes(r['is_net_sales_technically_eligible'])]
        assert (sum(values,Decimal(0)) if values else None) == (Decimal(c['eligible_net_sales']) if c['eligible_net_sales'] is not None else None)
    old_months = {(r['normalized_product'],r['raw_area'],r['month']):r for r in prior['queries']['medicine_months']['rows']}
    for key, group in monthly.items():
        if group[0]['product_category'] == 'medicine':
            assert int(old_months[key]['records']) == len(group)
            assert Decimal(old_months[key]['net_sales'] or 0) == Decimal(summarize(group)['eligible_net_sales_php'])
    labels = []
    for label in sorted({r['normalized_product'] for r in rows}):
        group = [r for r in rows if r['normalized_product'] == label]
        leads = presentation_leads(label,tables)
        labels.append(dict(label=label, categories=sorted({r['product_category'] for r in group}),
            summary=summarize(group), presentation_leads=leads,
            area_summaries=[dict(raw_area=area,**summarize([r for r in group if r['raw_area']==area])) for area in sorted({r['raw_area'] for r in group})]))
    # Deliberately hypothetical union: presence only, no quantity aggregation or alias acceptance.
    root_rows = [r for r in rows if r['normalized_product'].startswith('BUPIRIGHT')]
    sensitivity = [dict(raw_area=area,**history([r for r in root_rows if r['raw_area']==area])) for area in sorted({r['raw_area'] for r in root_rows})]
    reference = tables[1][1][6]
    assert reference[1] == 'BUPIRIGHT/BUPILON' and reference[4] == '1'
    reference_price = Decimal(reference[6].replace(',',''))
    exact = [r for r in rows if r['normalized_product']=='BUPIRIGHT']
    positive = [r for r in exact if r['recorded_quantity'] is not None and Decimal(r['recorded_quantity'])>0 and yes(r['is_gross_sales_technically_eligible'])]
    compatible = [r for r in positive if abs(Decimal(r['gross_sales'])-Decimal(r['recorded_quantity'])*reference_price)<=Decimal('.01')]
    pair_labels = ['BUPIRIGHT','BUPIRIGHT 5MG/ML 0.5% IN 8% 4ML']
    pair = [r for r in rows if r['normalized_product'] in pair_labels and r['raw_area']=='HOSPITAL']
    shared_prices = set()
    price_sets = []
    for label in pair_labels:
        price_sets.append({(p['gross_per_recorded_count'],p['acquisition_per_recorded_count'])
            for p in summarize([r for r in pair if r['normalized_product']==label])['positive_record_price_pairs']
            if p['gross_per_recorded_count'] is not None and p['acquisition_per_recorded_count'] is not None})
    shared_prices = price_sets[0] & price_sets[1]
    return dict(status='LABEL_LINEAGE_REVIEW_NOT_IDENTITY_OR_UNIT_APPROVAL', dataset_id=DATASET,
        source_records=len(rows), controls_checked=len(controls), monthly_groups_checked=len(monthly),
        labels=labels, reference_evidence=dict(evidence_id='PL2026-P2-T2-R7',stored_row=reference,
            printed_per_unit_price=str(reference_price),label_exact_positive_gross_eligible_records=len(positive),
            reference_price_compatible_records=len(compatible),comparison_tolerance_php='.01',
            limitation='Catalogue presentation and cross-year price comparison only; price agreement cannot distinguish one-unit box from ampoule or prove historical SKU identity'),
        hypothetical_bupiright_root_presence=dict(status='NOT_A_MAPPING_OR_MODEL_TARGET',company=history(root_rows),areas=sensitivity),
        proposed_recent_pair=dict(labels=pair_labels,raw_area='HOSPITAL',status='PENDING_SOURCE_IDENTITY_AND_BILLED_UNIT_EVIDENCE',
            records=len(pair),presence_only=history(pair),
            shared_rounded_gross_acquisition_per_count_pairs=[list(p) for p in sorted(shared_prices)],
            exact_label_histories=[dict(label=label,**history([r for r in pair if r['normalized_product']==label])) for label in pair_labels],
            review_question='Same 4mL presentation and one ampoule/box-of-one billing basis? Verify against source records before combining.',
            delivery_territory=None,approved=False,unit_multiplier=None),
        proposals=[dict(label=r['label'],relationship='exact_printed_brand_token' if r['presentation_leads'] else 'name_root_discovery_only',
            approved=False,unit_multiplier=None,canonical_sku=None) for r in labels],
        warehouse_writes=0,aliases_merged=0,units_approved=0,models_trained=0,
        limitations=['No absent month is zero-filled.', 'Recorded channels are not delivery territories.',
                    'Current unreviewed exports remain unreviewed.', 'Price similarity and shared brand roots are insufficient identity evidence.'])


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--directory',default='outputs/bupiright_lineage_20261027');args=parser.parse_args()
    directory=Path(args.directory);root=Path(__file__).resolve().parents[2]
    raw=(directory/'source.json').read_bytes()
    assert hashlib.sha256(raw).hexdigest() == (directory/'source.sha256').read_text().strip()
    source=json.loads(raw)
    for path,digest in source['evidence_sha256'].items():
        assert hashlib.sha256((root/path).read_bytes()).hexdigest()==digest,path
    prior=json.loads((root/'outputs/original_medicine_screen_20261027/source.json').read_text(encoding='utf-8'))
    tables=json.loads((root/'outputs/catalog_preparation/product_evidence/price_list_tables.json').read_text(encoding='utf-8'))
    result=analyze(source,prior,tables)
    result['source_sha256']=hashlib.sha256(raw).hexdigest()
    result['analyzer_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    (directory/'review.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:result[k] for k in ['status','source_records','controls_checked','monthly_groups_checked','warehouse_writes','models_trained']}))


if __name__=='__main__':
    main()
