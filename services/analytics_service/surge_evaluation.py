"""Offline, origin-safe external-driver research. No runtime activation or fallback."""
import math

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import auc, precision_recall_curve
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .external_indices import external_index
from .predictive.contracts import month, period
from .predictive.metrics import compare, diebold_mariano, mase_scale

VERSION = 'external_surge_research_v1_candidate_only'
VARIANTS = {'sales_only': [], 'plus_dii': [12], 'plus_rsi': [13], 'plus_dii_rsi': [12, 13]}
CLASSIFIERS = ('seasonal_month_frequency', 'logistic', 'histogram_gbdt')


def binary_metrics(labels, probabilities, threshold):
    """Null recall/F1/PR-AUC when no actual positive exists; no invented support."""
    if len(labels) != len(probabilities) or not 0 <= threshold <= 1:
        raise ValueError('Paired labels/probabilities and a probability threshold required')
    if not labels:
        return dict(n=0, positives=0, precision=None, recall=None, f1=None, pr_auc=None,
                    brier=None, reason='No common scored cases')
    if any(y not in (0, 1) for y in labels) or any(not math.isfinite(p) or not 0 <= p <= 1 for p in probabilities):
        raise ValueError('Binary labels and finite probabilities required')
    predictions = [p >= threshold for p in probabilities]
    tp = sum(y == 1 and p for y, p in zip(labels, predictions))
    positive = sum(labels)
    called = sum(predictions)
    precision = tp / called if called else None
    recall = tp / positive if positive else None
    f1 = 2 * tp / (called + positive) if called + positive and positive else None
    if positive:
        ps, rs, _ = precision_recall_curve(labels, probabilities)
        pr_auc = float(auc(rs, ps))
    else:
        pr_auc = None
    return dict(n=len(labels), positives=positive, predicted_positives=called,
                precision=precision, recall=recall, f1=f1, pr_auc=pr_auc,
                pr_auc_method='trapezoidal_precision_recall_curve',
                brier=sum((p-y)**2 for p, y in zip(probabilities, labels))/len(labels),
                reason=None if positive else 'No observed positive surge events')


def select_threshold(validation):
    """Frozen validation-only F1 rule; ties choose the higher review threshold."""
    if any(p['stage'] != 'validation' for p in validation):
        raise ValueError('Threshold selection may access validation cases only')
    if not validation or not any(p['label'] == 1 for p in validation):
        return dict(value=None, reason='Validation has no scored positive surge event', selected_on='validation_only')
    labels, probabilities = [p['label'] for p in validation], [p['probability'] for p in validation]
    candidates = sorted(set([0., 1., *probabilities]))
    threshold = max(candidates, key=lambda value: (binary_metrics(labels, probabilities, value)['f1'] or 0, value))
    return dict(value=threshold, selected_on='validation_only', reason=None,
                validation_n=len(validation), selection_rule='maximum_validation_f1_tie_higher_threshold')


def build_examples(data):
    """Every example's features, p90 and naive scale are rebuilt at its own origin."""
    sales = {}
    for row in data['sales']:
        p, value = month(row['period']), row['quantity']
        if p in sales:
            raise ValueError('Duplicate sales month')
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
            raise ValueError('Reviewed quantity must be finite and nonnegative; missing is not zero')
        sales[p] = value
    keys = sorted(sales)
    if not keys or keys != list(range(keys[0], keys[-1]+1)):
        raise ValueError('Sales months must be continuous and explicit')
    external = data['external_sources']
    weather = data['weather_provider']
    rows = []
    missing = []
    for target in keys[24:]:
        origin = target-1
        train = {p: value for p, value in sales.items() if p <= origin}
        features = [sales[origin-lag] for lag in (0,1,2,3,5,11)]
        features += [float(np.mean([sales[p] for p in range(origin-length+1,origin+1)])) for length in (3,6,12)]
        features += [math.sin(2*math.pi*(target%12)/12),math.cos(2*math.pi*(target%12)/12),float(len(train))]
        indices = [external_index(data['external_rows'], provider=provider, signal=signal,
                    territory=data['territory'], feature_period=period(feature), origin_period=period(origin),
                    dataset_id=external[provider]['dataset_id'], policy_version=external[provider]['policy_version'],
                    training_start=period(keys[0]))
                   for provider,signal,feature in [('DOH',data['disease'],origin-1),(weather,'Rainfall',origin)]]
        if any(index['value'] is None for index in indices):
            missing.append(dict(target_period=period(target), reason='Required origin-known external feature unavailable',
                                external_features=indices))
            continue
        features += [index['value'] for index in indices]
        threshold = float(np.quantile(list(train.values()),.9,method='linear'))
        rows.append(dict(series_id=data['series_id'],target_name='reviewed_quantity',
            target_period=period(target),origin_period=period(origin),lead_months=1,
            actual=sales[target],label=int(sales[target] > threshold),origin_training_p90=threshold,
            mase_scale=mase_scale(train)['value'],mase_scale_lag_months=12,
            features=features,external_features=indices))
    return rows, missing


def evaluate(data, *, validation_start, audit_start, audit_end, minimum_training_examples=24, seed=20261030):
    """Rolling lead-one evaluation; audit never selects models or thresholds.

    Earlier audit actuals may train a later issue, once those months are closed.
    This is time-ordered audit evaluation, not fixed-origin blocked forecasting.
    """
    metadata = dict(evidence_label='Derived',dataset_id=data.get('dataset_id'),
        policy_version=data.get('policy_version'),unit=data.get('unit'),territory=data.get('territory'),
        assumption_ids=['D1','D3','D4'],method_version=VERSION,fixture_only=data.get('fixture_only',False),
        historical_vintages_verified=False,availability_evidence_label='Assumed',
        review_status='caller_supplied_evidence_not_independent_approval',
        operational_approval=False,publication_approved=False,selection_changed=False)
    required = ('dataset_id','policy_version','unit','territory','series_id','unit_review_evidence',
                'clinical_mapping_evidence','geography_review_evidence','external_sources','weather_provider','disease')
    missing = [key for key in required if not data.get(key)]
    if missing:
        return dict(status='unavailable',reason='Missing reviewed cohort/provenance: '+', '.join(missing),**metadata)
    if data['weather_provider'] not in ('PAGASA','NASA POWER'):
        raise ValueError('Choose one explicit observed station or gridded proxy provider')
    for provider in ('DOH',data['weather_provider']):
        if not all(data['external_sources'].get(provider,{}).get(k) for k in ('dataset_id','policy_version')):
            return dict(status='unavailable',reason='External source dataset/policy identity unavailable',**metadata)
    first,cutoff,end = map(month,(validation_start,audit_start,audit_end))
    if cutoff-first < 6 or end-cutoff < 5 or minimum_training_examples < 24:
        raise ValueError('Require at least six validation/audit months and 24 historical examples')
    examples, missing_features = build_examples(data)
    if not examples or max(month(p['target_period']) for p in examples) < end:
        return dict(status='unavailable',reason='Required audit history/external endpoints unavailable',
                    missing_features=missing_features,**metadata)
    regression, classification, unsupported = [], [], []
    for row in examples:
        target = month(row['target_period'])
        if not first <= target <= end:
            continue
        prior = [p for p in examples if month(p['target_period']) < target]
        stage = 'validation' if target < cutoff else 'audit'
        if len(prior) < minimum_training_examples:
            unsupported.append(dict(target_period=row['target_period'],reason='Insufficient matched prior training examples'))
            continue
        for variant,extra in VARIANTS.items():
            columns = list(range(12))+extra
            x = np.array([[p['features'][j] for j in columns] for p in prior])
            current = np.array([[row['features'][j] for j in columns]])
            model = make_pipeline(StandardScaler(),Ridge(alpha=1.))
            model.fit(x,[p['actual'] for p in prior])
            regression.append({k:v for k,v in row.items() if k not in ('features','external_features','label')}
                | dict(stage=stage,model_id=variant,prediction=max(0.,float(model.predict(current)[0]))))
        labels = [p['label'] for p in prior]
        same_month = [p['label'] for p in prior if month(p['target_period'])%12 == target%12]
        probabilities = {'seasonal_month_frequency':sum(same_month)/len(same_month) if same_month else None}
        if len(set(labels)) < 2:
            probabilities.update(logistic=None,histogram_gbdt=None)
        else:
            x = [p['features'] for p in prior]
            candidates = {'logistic':make_pipeline(StandardScaler(),LogisticRegression(C=1.,max_iter=1000,random_state=seed)),
                'histogram_gbdt':HistGradientBoostingClassifier(max_iter=40,max_leaf_nodes=7,min_samples_leaf=5,
                    l2_regularization=1.,random_state=seed)}
            for name,model in candidates.items():
                model.fit(x,labels)
                probabilities[name]=float(model.predict_proba([row['features']])[0,1])
        for name,probability in probabilities.items():
            classification.append(dict(stage=stage,model_id=name,target_period=row['target_period'],
                origin_period=row['origin_period'],label=row['label'],probability=probability,
                origin_training_p90=row['origin_training_p90']))
    classification_keys = {stage:sorted(set.intersection(*[
        {p['target_period'] for p in classification if p['stage']==stage and p['model_id']==model and p['probability'] is not None}
        for model in CLASSIFIERS])) for stage in ('validation','audit')}
    thresholds,classification_metrics,ablation = {},[],[]
    for model in CLASSIFIERS:
        validation = [p for p in classification if p['model_id']==model and p['stage']=='validation'
                      and p['target_period'] in classification_keys['validation']]
        thresholds[model]=select_threshold(validation)
        for stage in ('validation','audit'):
            points=[p for p in classification if p['model_id']==model and p['stage']==stage and p['target_period'] in classification_keys[stage]]
            threshold=thresholds[model]['value']
            metric=binary_metrics([p['label'] for p in points],[p['probability'] for p in points],threshold) if threshold is not None else binary_metrics([],[],.5)
            classification_metrics.append(dict(stage=stage,model_id=model,threshold=threshold,**metric))
    for stage in ('validation','audit'):
        points=[p for p in regression if p['stage']==stage]
        comparisons=compare(points,list(VARIANTS))
        baseline=comparisons['sales_only']['common']
        for model,values in comparisons.items():
            ablation.append(dict(stage=stage,model_id=model,**values['common'],
                mase=values['common_scaled_error']['mase'],
                delta_mae=values['common']['mae']-baseline['mae'] if baseline['mae'] is not None else None,
                dm_vs_sales_only=diebold_mariano(points,model,reference_id='sales_only') if model!='sales_only' else None))
    return dict(status='fixture_method_evaluation' if metadata['fixture_only'] else 'research_candidate_evaluation',
        protocol=dict(validation_start=validation_start,audit_start=audit_start,audit_end=audit_end,
            minimum_training_examples=minimum_training_examples,seed=seed,lead_months=1,
            threshold_selection='validation_only_frozen_before_audit',origin_clock='month_close',
            disease_feature_lag_from_origin_months=1,weather_feature_lag_from_origin_months=0,
            p90_method='origin_history_linear_quantile',audit_policy='rolling_origin_refit_no_audit_tuning'),
        forecast_points=regression,classifier_points=classification,thresholds=thresholds,
        ablation=ablation,classification_metrics=classification_metrics,common_classifier_keys=classification_keys,
        missing_features=missing_features,unsupported=unsupported,
        limitations=['Observed quantities remain scoped to supplied reviewed presentation and geography.',
            'Modeled publication lag does not establish actual historical source vintages.',
            'Missing external cases are dropped identically from all variants; selection on complete cases is disclosed.',
            'No automatic model promotion or operational alert; exploratory unadjusted DM tests.',
            'All features, p90 labels, scalers and model fits use origin-known history only.'],**metadata)
