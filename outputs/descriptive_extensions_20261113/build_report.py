"""Build the descriptive extensions report (self-contained HTML). Run from repo root after run.py."""
from pathlib import Path
import json

OUT = Path.cwd() / 'outputs/descriptive_extensions_20261113'
R = json.loads((OUT / 'results.json').read_text(encoding='utf-8'))
Y = [str(y) for y in R['years']]
pct = lambda v: '–' if v is None else f'{v * 100:.1f}%'
peso = lambda v: '₱' + f'{v:,.0f}'
ylab = lambda y: y + (' (Jan–Sep)' if y == '2026' else '')

bands = list(R['D1_order_size'][Y[0]]['band_share'])
size_data = [{'y': y, 'v': [R['D1_order_size'][y]['band_share'][b] for b in bands]} for y in Y]
labels = R['D2_channel_mix']['labels']
mix_data = [{'y': y, 'v': [R['D2_channel_mix']['share'][y].get(l, 0) for l in labels]} for y in Y]

def table(head, body):
    return '<div class="scroll"><table><thead><tr>' + ''.join(f'<th>{h}</th>' for h in head) + '</tr></thead><tbody>' + ''.join(
        '<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in body) + '</tbody></table></div>'

d1_rows = [[ylab(y), f"{R['D1_order_size'][y]['documents']:,}", peso(R['D1_order_size'][y]['median']), peso(R['D1_order_size'][y]['mean'])] +
           [pct(R['D1_order_size'][y]['band_share'][b]) for b in bands] for y in Y]
d2_rows = [[ylab(y)] + [pct(R['D2_channel_mix']['share'][y].get(l, 0)) for l in labels] for y in Y]
cats = ['medicine', 'medical_supply', 'medical_equipment', 'non_medical', 'unclassified']
cname = {'medicine': 'Medicine', 'medical_supply': 'Medical supply', 'medical_equipment': 'Equipment', 'non_medical': 'Non-medical', 'unclassified': 'Unclassified'}
d3_rows = [[ylab(y)] + [f"{pct(R['D3_category'][y].get(c, {}).get('share'))} · {pct(R['D3_category'][y].get(c, {}).get('margin_pct'))}" for c in cats] for y in Y]
d45_rows = [[ylab(y), str(R['D5_concentration'][y]['families']), pct(R['D5_concentration'][y]['top10_share']), f"{R['D5_concentration'][y]['hhi']:.0f}"] +
            ([str(R['D4_portfolio'][y]['continuing']), f"{R['D4_portfolio'][y]['new']} ({pct(R['D4_portfolio'][y]['new_net_share'])} of net)",
              f"{R['D4_portfolio'][y]['lost']} ({pct(R['D4_portfolio'][y]['lost_prior_net_share'])} of prior)"] if y in R['D4_portfolio'] else ['–', '–', '–']) for y in Y]
d678_rows = [[ylab(y), f"{R['D6_returns'][y]['negative_lines']:,}", pct(R['D6_returns'][y]['share_of_positive']), pct(R['D7_discounts'][y]['discount_rate']),
              pct(R['D8_timing'][y]['median_by_day10']), pct(R['D8_timing'][y]['median_by_day20'])] for y in Y]

tpl = (OUT / 'report_template.html').read_text(encoding='utf-8')
html = tpl.replace('/*DATA*/', 'const SIZE=' + json.dumps(size_data) + ';const BANDS=' + json.dumps(bands, ensure_ascii=False) + ';const MIX=' + json.dumps(mix_data)
                   + ';const LABELS=' + json.dumps(labels) + ';')
html = html.replace('<!--T1-->', table(['Year', 'Documents', 'Median value', 'Mean value'] + bands, d1_rows))
html = html.replace('<!--T2-->', table(['Year'] + [l.title() for l in labels], d2_rows))
html = html.replace('<!--T3-->', table(['Year'] + [cname[c] for c in cats], d3_rows))
html = html.replace('<!--T4-->', table(['Year', 'Families sold', 'Top-10 share', 'HHI', 'Continuing', 'New', 'Lost'], d45_rows))
html = html.replace('<!--T5-->', table(['Year', 'Negative lines', 'Returns as share of sales', 'Discount rate', 'Delivered by day 10 (median)', 'By day 20 (median)'], d678_rows))
html = html.replace('<!--TOTAL-->', peso(R['total_net']) + '.' + f"{round(R['total_net'] * 100) % 100:02d}").replace('<!--MONTHS-->', str(R['months_recorded']))
(OUT / 'report.html').write_text(html, encoding='utf-8'); print('wrote', len(html))
