"""Exploratory, lagged, one-month regression evaluation. No causal inference."""
import calendar
import csv
import json
import math
from collections import defaultdict
from datetime import date, datetime
from zoneinfo import ZoneInfo

import numpy as np

from services.analytics_service.forecast_validation import month_number, period_name, score
from services.analytics_service.jobs.prepare_external_sources import (
    PAGASA_MAPPING_REVIEW,
    PAGASA_MONTHLY_CLEAN,
    REPORT as EXTERNAL_REPORT,
)
from services.analytics_service.jobs.prepare_regression_sources import ROOT, DOH, AREA_MAP, OUTPUT, DISEASES, sha
from services.analytics_service.sales_sectors import load_sectors

LAGS = (1, 2, 3, 6, 8, 12)


def monthly_rainfall(daily, provider='NASA POWER'):
    groups = defaultdict(dict)
    bad = set()
    for row in daily:
        try:
            day = date.fromisoformat(str(row['date'])[:10])
            value = float(row['rainfall_mm'])
            key = (row['area'], day.strftime('%Y-%m'))
            if day.day in groups[key] or not math.isfinite(value) or value < 0:
                bad.add(key)
            groups[key][day.day] = value
        except (KeyError, ValueError, TypeError):
            continue
    result = []
    for (area, period), days in groups.items():
        year, month = map(int, period.split('-'))
        if (area, period) not in bad and len(days) == calendar.monthrange(year, month)[1]:
            result.append({'provider': provider, 'signal': 'Rainfall', 'territory': area, 'period': period, 'value': sum(days.values()), 'unit': 'mm'})
    return result


def load_external():
    rows, sources = [], []
    if OUTPUT.exists():
        payload = json.loads(OUTPUT.read_text(encoding='utf-8'))
        if payload['source']['checksum'] != sha(DOH) or payload['source']['area_mapping_checksum'] != sha(AREA_MAP):
            raise ValueError('Prepared DOH data is stale. Run prepare_regression_sources after source/mapping changes.')
        rows.extend(payload['rows'])
        sources.append({'provider': 'DOH', 'status': payload['source'].get('status', 'Prepared onset counts; retrospective only'), **payload['source']})
    else:
        sources.append({'provider': 'DOH', 'status': 'Cleaned candidate detected; run prepare_regression_sources', 'file': str(DOH.relative_to(ROOT))})
    weather = ROOT / 'data/medshield/processed/weather_signals.json'
    if weather.exists():
        payload = json.loads(weather.read_text(encoding='utf-8'))
        if payload.get('metadata', {}).get('provider') == 'nasa_power':
            rows.extend(monthly_rainfall([r for r in payload.get('daily_rows', []) if r.get('provider') == 'nasa_power']))
            sources.append({'provider': 'NASA POWER', 'status': 'Weather proxy; complete daily months only', 'file': str(weather.relative_to(ROOT)), 'checksum': sha(weather)})
    approved_station_territories = {}
    if PAGASA_MAPPING_REVIEW.exists() and PAGASA_MONTHLY_CLEAN.exists() and EXTERNAL_REPORT.exists():
        report = json.loads(EXTERNAL_REPORT.read_text(encoding='utf-8'))
        expected = report['pagasa']['output_sha256']
        for path in (PAGASA_MAPPING_REVIEW, PAGASA_MONTHLY_CLEAN):
            if expected.get(path.relative_to(ROOT).as_posix()) != sha(path):
                raise ValueError('Prepared PAGASA data is stale. Rebuild external sources.')
        with PAGASA_MAPPING_REVIEW.open(encoding='utf-8-sig', newline='') as handle:
            for mapping in csv.DictReader(handle):
                if mapping['external_join_ready'].lower() != 'true':
                    continue
                station = mapping['proposed_station_name']
                if not station or station in approved_station_territories:
                    raise ValueError('Invalid or ambiguous approved PAGASA station mapping')
                approved_station_territories[station] = mapping['territory']
        seen_pagasa = set()
        with PAGASA_MONTHLY_CLEAN.open(encoding='utf-8-sig', newline='') as handle:
            for monthly in csv.DictReader(handle):
                territory = approved_station_territories.get(monthly['station_name'])
                if not territory or monthly['monthly_analysis_status'] != 'ANALYSIS_READY_RAINFALL':
                    continue
                identity = (territory, monthly['period'])
                if identity in seen_pagasa:
                    raise ValueError('Duplicate approved PAGASA territory-month; select one station per territory')
                seen_pagasa.add(identity)
                rows.append({'provider': 'PAGASA', 'signal': 'Rainfall', 'territory': territory,
                             'period': monthly['period'], 'value': float(monthly['rainfall_total_mm']), 'unit': 'mm'})
        sources.append({'provider': 'PAGASA',
                        'status': 'Approved mapped station rainfall' if approved_station_territories else 'Cleaned station months; territory mapping pending',
                        'file': str(PAGASA_MONTHLY_CLEAN.relative_to(ROOT)), 'checksum': sha(PAGASA_MONTHLY_CLEAN),
                        'mapping_file': str(PAGASA_MAPPING_REVIEW.relative_to(ROOT)), 'mapping_checksum': sha(PAGASA_MAPPING_REVIEW),
                        'coverage': report['pagasa']['observed_coverage'], 'requested_coverage': report['pagasa']['requested_coverage']})
    else:
        sources.append({'provider': 'PAGASA', 'status': 'Run prepare_external_sources before weather regression',
                        'file': str(PAGASA_MONTHLY_CLEAN.relative_to(ROOT))})
    return rows, sources


def ols(train_x, train_y, predict_x):
    """Scale from training data only, check rank, return coefficients in input units."""
    x, y, future = np.asarray(train_x, dtype=float), np.asarray(train_y, dtype=float), np.asarray(predict_x, dtype=float)
    means, scales = x.mean(axis=0), x.std(axis=0)
    if np.any(scales < 1e-10):
        raise ValueError('Constant predictor in training data')
    design = np.column_stack([np.ones(len(x)), (x - means) / scales])
    if np.linalg.matrix_rank(design) != design.shape[1]:
        raise ValueError('Collinear predictors; coefficients are not identifiable')
    fitted = np.linalg.lstsq(design, y, rcond=None)[0]
    coefficients = fitted[1:] / scales
    intercept = fitted[0] - float(np.dot(coefficients, means))
    predictions = intercept + future @ coefficients
    return predictions.tolist(), [float(intercept), *coefficients.tolist()]


def build_regression(sales, signals, sources, sector='Unknown', territory='Quezon', product='', metric='quantity', mode='disease', provider='NASA POWER', disease='Dengue', lag=1, rainfall_lag=1, today=None):
    if sector not in {'Government', 'Private', 'Unknown'} or metric not in {'quantity', 'revenue'} or mode not in {'disease', 'rainfall', 'combined'} or provider not in {'NASA POWER', 'PAGASA'} or disease not in DISEASES or lag not in LAGS or rainfall_lag not in LAGS:
        raise ValueError('Invalid regression scope')
    population = [r for r in sales['rows'] if r['sector'] == sector and r['territory'] == territory]
    products = sorted({r['product'] for r in population})
    if metric == 'quantity' and not product and products:
        product = max(products, key=lambda p: len({r['period'] for r in population if r['product'] == p}))
    if product and product not in products:
        raise ValueError('Product unavailable in this sector and territory')
    unit = 'delivered source units' if metric == 'quantity' else '₱ net sales'
    response = {'status': 'blocked', 'reason': '', 'scope': dict(sector=sector, territory=territory, product=product, metric=metric, mode=mode, provider=provider, disease=disease, lag=lag, rainfall_lag=rainfall_lag, unit=unit),
                'products': products, 'territories': sorted({r['territory'] for r in sales['rows'] if r['territory'] != 'Unassigned geography'}), 'sources': sources, 'sales_source': sales['source'], 'coefficients': [], 'evaluation': [], 'metrics': {}, 'coverage': {}}
    today = today or datetime.now(ZoneInfo('Asia/Manila')).date()
    end_closed = today.year * 12 + today.month - 2
    target = defaultdict(float)
    for r in population:
        p = month_number(r['period'])
        if month_number('2017-01') <= p <= min(end_closed, month_number('2025-12')) and (not product or r['product'] == product):
            target[p] += r[metric]
    external = [('DOH', disease, 'Cases per 100', lag)] if mode != 'rainfall' else []
    if mode != 'disease':
        external.append((provider, 'Rainfall', 'Rainfall per 100 mm', rainfall_lag))
    lookup = {}
    for r in signals:
        if r['territory'] != territory:
            continue
        key = (r['provider'], r['signal'], month_number(r['period']))
        if key in lookup:
            raise ValueError('Duplicate external monthly key; resolve source overlap before regression')
        lookup[key] = r['value']
    response['coverage'] = {'sales_months': len(target), 'signals': [{'provider': p, 'signal': s, 'months': sum(k[0] == p and k[1] == s for k in lookup)} for p, s, _, _ in external]}
    if not target:
        response['reason'] = 'No observed sales for this ownership/territory scope. Government and private geography are not inferred.'
        return response
    start, end = min(target), max(target)
    aligned = []
    for p in sorted(target):
        values = [lookup.get((provider_name, signal, p - lead)) for provider_name, signal, _, lead in external]
        if p - 1 not in target or any(v is None or not math.isfinite(v) for v in values):
            continue
        x = [(p - start) / 12, math.sin(2 * math.pi * (p % 12) / 12), math.cos(2 * math.pi * (p % 12) / 12), target[p - 1], *[v / 100 for v in values]]
        aligned.append({'period': p, 'actual': target[p], 'x': x, 'signal_period': '; '.join(prov+' '+period_name(p-lead) for prov, _, _, lead in external)})
    cutoff = end - 12
    training = [r for r in aligned if r['period'] <= cutoff]
    holdout = [r for r in aligned if r['period'] > cutoff]
    response['coverage'].update(matched_months=len(aligned), training_months=len(training), holdout_months=len(holdout),
                                 evaluation_start=period_name(cutoff + 1), evaluation_end=period_name(end), training_end=period_name(cutoff))
    if len(training) < 36 or len(holdout) < 6:
        response['reason'] = f'Need 36 matched training months and 6 observed months in the final 12-calendar-month holdout; found {len(training)} and {len(holdout)}. No missing periods are filled with zero.'
        return response
    try:
        # Coefficient explanation is fixed at the pre-holdout fit.
        _, coefficients = ols([r['x'] for r in training], [r['actual'] for r in training], [holdout[0]['x']])
        for point in holdout:
            prior = [r for r in aligned if r['period'] < point['period']]
            x, y = [r['x'] for r in prior], [r['actual'] for r in prior]
            base, _ = ols([row[:4] for row in x], y, [point['x'][:4]])
            augmented, _ = ols(x, y, [point['x']])
            response['evaluation'].append({'period': period_name(point['period']), 'signal_period': point['signal_period'], 'training_end': period_name(max(r['period'] for r in prior)),
                                           'actual': point['actual'], 'baseline': base[0], 'augmented': augmented[0], 'residual': point['actual'] - augmented[0]})
    except ValueError as error:
        response['evaluation'] = []
        response['reason'] = str(error)
        return response
    for i, (_, _, label, lead) in enumerate(external):
        response['coefficients'].append({'predictor': label + f' ({lead}-month lag)', 'coefficient': coefficients[5 + i], 'unit': unit})
    for model in ('baseline', 'augmented'):
        response['metrics'][model] = score([(r['actual'], r[model]) for r in response['evaluation']])
    baseline = response['metrics']['baseline']['mae']
    response['mae_improvement_pct'] = 100 * (baseline - response['metrics']['augmented']['mae']) / baseline if baseline else None
    response['status'] = 'exploratory'
    response['reason'] = 'Retrospective one-month rolling evaluation using final revised signals. Publication dates are unavailable: this is not proof of operational forecast improvement or causality.'
    return response


def load_regression(**kwargs):
    rows, sources = load_external()
    return build_regression(load_sectors(), rows, sources, **kwargs)
