"""Ownership is independent of customer channel and geography."""
import csv
import math
from collections import Counter, defaultdict
from datetime import date
from services.analytics_service.sales_heatmap import ROOT, load_observed_source


def build_sectors(rows, mappings, metadata, source_name, geography_mappings=()):
    geographies = {r['raw_area'].strip().casefold(): r['territory'] for r in geography_mappings
                   if r.get('mapping_status') == 'approved' and r.get('area_type') == 'territory'}
    approved = {}
    for item in mappings:
        if item.get('mapping_status') != 'approved':
            continue
        area = item['raw_area'].strip().casefold()
        if area in approved or item.get('buyer_sector') not in {'Government', 'Private'}:
            raise ValueError('Ambiguous or invalid approved buyer-sector mapping')
        approved[area] = item
    grouped = defaultdict(lambda: {'revenue': 0., 'quantity': 0., 'row_count': 0})
    excluded = Counter()
    for row in rows:
        if row.get('quality_status') not in {'valid', 'warning'} or row.get('duplicate') or any(row.get(k) for k in ('estimated', 'is_estimated_date', 'is_estimated_contract_allocation', 'allocation_method')):
            excluded['quality_duplicate_or_estimated'] += 1
            continue
        try:
            delivered = date.fromisoformat(str(row.get('date_delivered'))[:10])
            if not 2017 <= delivered.year <= 2025:
                raise ValueError('Outside historical sales window')
            period = delivered.strftime('%Y-%m')
            revenue, quantity = float(row['net_cost']), float(row['quantity'])
            product = str(row.get('product') or '').strip()
            if not product or product.startswith('#') or row.get('in_analysis_range') is False or not all(map(math.isfinite, (revenue, quantity))) or quantity < 0:
                raise ValueError()
        except (KeyError, TypeError, ValueError):
            excluded['invalid_metric_date_or_product'] += 1
            continue
        area = str(row.get('area') or 'Unspecified').strip()
        mapping = approved.get(area.casefold(), {})
        sector = mapping.get('buyer_sector') or ('Government' if area.casefold() == 'government' else 'Unknown')
        basis = 'Approved area mapping' if mapping else ('Source-labeled Government; unreviewed' if sector == 'Government' else 'Ownership unavailable')
        channel = mapping.get('customer_channel') or (area if area.casefold() in {'hospital', 'pharma'} else 'Unclassified channel')
        territory = mapping.get('territory') or geographies.get(area.casefold()) or 'Unassigned geography'
        key = (period, product, sector, channel, territory, basis)
        grouped[key]['revenue'] += revenue
        grouped[key]['quantity'] += quantity
        grouped[key]['row_count'] += 1
    return {'rows': [dict(zip(('period', 'product', 'sector', 'channel', 'territory', 'basis'), key), **value) for key, value in sorted(grouped.items())],
            'source': {'file': source_name, 'checksum': metadata.get('checksum'), 'input_rows': len(rows), 'included_rows': sum(v['row_count'] for v in grouped.values()), 'excluded': dict(excluded)}}


def load_sectors():
    payload, name = load_observed_source()
    with (ROOT / 'datasources/templates/buyer_sector_mapping.csv').open(encoding='utf-8-sig', newline='') as handle:
        mappings = list(csv.DictReader(handle))
    with (ROOT / 'datasources/templates/area_classification_mapping.csv').open(encoding='utf-8-sig', newline='') as handle:
        geographies = list(csv.DictReader(handle))
    return build_sectors(payload['rows'], mappings, payload['metadata'], name, geographies)
