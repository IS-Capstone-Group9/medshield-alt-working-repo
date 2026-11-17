"""Report immutable retained ABC predictions without fitting or publishing models."""
from __future__ import annotations

import argparse
from collections import defaultdict
import csv
from datetime import datetime
import hashlib
import json
from pathlib import Path
import shutil
from zoneinfo import ZoneInfo

from ..abc_evaluation import summarize, PROTOCOL_SHA

DATASET = 'e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10'
PROVENANCE = dict(evidence_label='Derived', dataset_id=DATASET,
                  policy_version='original_abc_label_v1', assumption_ids='[]',
                  evidence_origin='inherited_retrospective_predictions')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_csv(path, rows):
    with path.open('x', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def reliability_bins(cases):
    grouped = defaultdict(list)
    for row in cases:
        probabilities = row.get('raw_uncalibrated_probabilities')
        if probabilities is None:
            continue
        if (len(probabilities) != 3 or any(not 0 <= p <= 1 for p in probabilities)
                or abs(sum(probabilities) - 1) > 1e-5):
            raise ValueError('Invalid inherited class probabilities')
        confidence = max(probabilities)
        if 'ABC'[probabilities.index(confidence)] != row['predicted']:
            raise ValueError('Inherited probability argmax differs from prediction')
        grouped[row['stage'], row['model_id'], min(9, int(confidence * 10))].append(
            (confidence, int(row['actual'] == row['predicted'])))
    rows = []
    for (stage, model, index), values in sorted(grouped.items()):
        rows.append(dict(stage=stage, model_id=model, bin_lower=index / 10,
            bin_upper=(index + 1) / 10, samples=len(values),
            mean_uncalibrated_confidence=sum(v[0] for v in values) / len(values),
            observed_accuracy=sum(v[1] for v in values) / len(values),
            interpretation='validation_top_label_reliability_diagnostic_not_probability_calibration', **PROVENANCE))
    return rows


def build(evaluation: Path, protocol_path: Path, output: Path):
    receipt = json.loads((evaluation / 'packet-verification.json').read_text(encoding='utf-8'))
    required = ('predictions.json', 'results.json', 'selection.json', 'registration.json')
    for name in required:
        if sha(evaluation / name) != receipt['files'][name]:
            raise ValueError('Retained artifact differs from historical receipt: ' + name)
    if sha(protocol_path) != PROTOCOL_SHA:
        raise ValueError('Frozen ABC protocol hash differs')
    protocol = json.loads(protocol_path.read_text(encoding='utf-8'))
    original = json.loads((evaluation / 'results.json').read_text(encoding='utf-8'))
    registration = json.loads((evaluation / 'registration.json').read_text(encoding='utf-8'))
    project_root = Path(__file__).resolve().parents[3]
    if sha(project_root / 'services/analytics_service/abc_evaluation.py') != registration['runner_sha256']:
        raise ValueError('Frozen evaluation implementation differs')
    if sha(project_root / 'services/analytics_service/abc_protocol.py') != protocol['implementation_sha256']:
        raise ValueError('Frozen protocol implementation differs')
    cases = json.loads((evaluation / 'predictions.json').read_text(encoding='utf-8'))
    summaries = summarize(cases)
    if summaries != original['scores']:
        raise ValueError('Inherited scores differ from inherited predictions')
    inherited = output / 'inherited'
    inherited.mkdir(parents=True, exist_ok=True)
    for name in (*required, 'packet-verification.json'):
        destination = inherited / name
        if destination.exists():
            raise FileExistsError(destination)
        shutil.copyfile(evaluation / name, destination)
    shutil.copyfile(protocol_path, inherited / 'protocol.json')
    per_class, cohorts = [], []
    for summary in summaries:
        base = {key: summary[key] for key in ('stage', 'model_id', 'cohort', 'samples')}
        for label, values in summary['per_class'].items():
            per_class.append(dict(**base, actual_class=label, **values, **PROVENANCE))
        cohorts.append(dict(**base, coverage_of_stage=summary['coverage_of_stage'],
            macro_f1=summary['macro_f1'], balanced_accuracy=summary['balanced_accuracy'],
            accuracy=summary['accuracy'],
            defined_f1_classes=';'.join(summary['macro_f1_defined_classes']),
            actual_class_count=sum(v['support'] > 0 for v in summary['per_class'].values()), **PROVENANCE))
    write_csv(output / 'T6.1_abc_classifier_per_class_metrics.csv', per_class)
    write_csv(output / 'T6.2_cohort_breakdown_metrics.csv', cohorts)
    reliability = reliability_bins(cases)
    write_csv(output / 'T6.3_validation_uncalibrated_reliability.csv', reliability)
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import numpy as np
    stages = ('development_validation', 'retrospective_test_2025', 'partial_2026_extension')
    models = ('majority', 'prior_abc', 'xgb_depth_2', 'xgb_depth_3')
    fig, axes = plt.subplots(3, 4, figsize=(13, 10), layout='constrained')
    for i, stage in enumerate(stages):
        for j, model in enumerate(models):
            axis = axes[i, j]
            entries = [s for s in summaries if s['stage'] == stage and s['model_id'] == model and s['cohort'] == 'all']
            axis.set_title(f'{stage}\n{model}', fontsize=9)
            if not entries:
                axis.text(.5, .5, 'Not evaluated by frozen protocol', ha='center', va='center', wrap=True, fontsize=8)
                axis.set_axis_off()
                continue
            matrix = np.array(entries[0]['confusion_matrix'])
            axis.imshow(matrix, cmap='Blues', vmin=0)
            for y in range(3):
                for x in range(3):
                    axis.text(x, y, str(matrix[y, x]), ha='center', va='center',
                              color='white' if matrix[y, x] > matrix.max() / 2 else 'black')
            axis.set_xticks(range(3), list('ABC'))
            axis.set_yticks(range(3), list('ABC'))
            axis.set_xlabel('Predicted'); axis.set_ylabel('Actual')
    fig.suptitle('Derived from inherited ABC predictions; research only\n'
                 f'Dataset {DATASET}\nPolicy original_abc_label_v1; assumption_ids []', fontsize=10)
    fig.savefig(output / 'F6.1_confusion_matrices.png', dpi=160)
    plt.close(fig)
    fig, axis = plt.subplots(figsize=(8, 5), layout='constrained')
    axis.plot([0, 1], [0, 1], '--', color='gray', label='Reference identity')
    for model in models[2:]:
        rows = [r for r in reliability if r['model_id'] == model]
        axis.plot([r['mean_uncalibrated_confidence'] for r in rows],
                  [r['observed_accuracy'] for r in rows], 'o-', label=f'{model} (validation only)')
    axis.set(xlabel='Mean raw top-label confidence', ylabel='Observed accuracy', xlim=(0, 1), ylim=(0, 1),
             title='Uncalibrated validation reliability diagnostic\nNo selected-baseline held-out probabilities available')
    axis.legend(fontsize=8)
    fig.suptitle(f'Derived | Dataset {DATASET}\nPolicy original_abc_label_v1; assumption_ids []', fontsize=8)
    fig.savefig(output / 'F6.2_validation_uncalibrated_reliability.png', dpi=160)
    plt.close(fig)
    selected = original['selection']['model_id']
    main = next(s for s in summaries if s['stage'] == 'retrospective_test_2025' and s['model_id'] == selected and s['cohort'] == 'all')
    result = dict(status='INHERITED_PREDICTIONS_REPORTED_SEE_VERIFICATION_JSON',
        **PROVENANCE, checked_at=datetime.now(ZoneInfo('Asia/Manila')).isoformat(),
        prediction_cases=len(cases), score_groups=len(summaries), per_class_rows=len(per_class),
        cohort_rows=len(cohorts), reliability_rows=len(reliability), selected_research_baseline=selected,
        selection=original['selection'], protocol_sha256=PROTOCOL_SHA, model_fits_this_run=0,
        warehouse_queries_this_run=0, warehouse_writes_this_run=0, publication_approved=False,
        scores=summaries, calibration_status='UNAVAILABLE_FOR_SELECTED_HELD_OUT_BASELINE',
        probability_diagnostic_scope='Raw uncalibrated XGBoost development-validation predictions only',
        source_evaluation_path=str(evaluation), source_protocol_path=str(protocol_path),
        limitations=receipt['limitations'])
    result['assumption_ids'] = []
    (output / 'results.json').write_text(json.dumps(result, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    paragraph = (f'# Chapter 4 insert — retained ABC classifier evaluation\n\n'
        f'Tables T6.1 and T6.2 freshly reconcile 1,032 inherited prediction cases across 40 stage/model/cohort groups. '
        f'The frozen development-validation rule retained `{selected}`; neither XGBoost challenger passed its promotion rule. '
        f'In the retained 2025 retrospective test, this baseline has {main["samples"]} cases, '
        f'macro-F1 {main["macro_f1"]:.6f} and balanced accuracy {main["balanced_accuracy"]:.6f}. '
        'Figure F6.1 reports confusion counts. The January–September 2026 extension remains a separate partial-year assessment. '
        'Figure F6.2 and Table T6.3 describe raw XGBoost validation confidence only; they do not establish calibrated probabilities '
        'or held-out calibration for the selected baseline. Exact recorded-label partitions do not establish verified SKU-family '
        'disjointness, and inspected retrospective outcomes are not an untouched prospective test. No model was fitted, '
        'warehouse source refreshed, or publication approval granted in this reporting run.\n')
    (output / 'PAPER_INSERT.md').write_text(paragraph, encoding='utf-8')
    (output / 'README.md').write_text(
        '# WP6 retained ABC evaluation report — 30 October 2026\n\n'
        'This packet freshly reports and independently reconciles inherited 27 October predictions. It does not refit models.\n\n'
        'Run `python -X utf8 outputs/wp6_abc_classifier_evaluation_20261030/verify.py` from the repository root. '
        'The verifier uses separate Fraction arithmetic, checks frozen protocol/case membership and retained score consistency, '
        'checks CSV tables and reliability bins, and verifies input/code/output SHA-256 bindings.\n\n'
        'T6.1 contains per-class metrics; T6.2 contains all four history cohorts plus all-population rows. Empty support '
        'stays unavailable. F6.1 has explicit unevaluated XGBoost held-out panels: the frozen protocol only assessed '
        'the selected baseline and majority comparator there. T6.3/F6.2 are development-validation uncalibrated reliability '
        'diagnostics; selected-baseline held-out calibration is unavailable. `inherited/` contains exact required source artifacts.\n\n'
        'Review mode: report author self-review plus separate verification implementation. No current model reload, fitting, '
        'live warehouse query, API/UI integration, class mapping approval, or original-objective closure is claimed. '
        'Inherited limitations and baseline selection remain in results.json. Full WP6 acceptance still needs '
        'the applicable source/identity review and downstream integration; this packet alone does not satisfy every strict plan gate.\n', encoding='utf-8')
    code = {str(p.relative_to(project_root)).replace('\\', '/'): sha(p) for p in (
        Path(__file__).resolve(), project_root / 'services/analytics_service/abc_protocol.py',
        project_root / 'services/analytics_service/abc_evaluation.py')}
    files = {str(p.relative_to(output)).replace('\\', '/'): sha(p) for p in output.rglob('*')
             if p.is_file() and p.name not in ('manifest.json', 'verification.json')}
    (output / 'manifest.json').write_text(json.dumps(dict(files=files, code=code), indent=2) + '\n', encoding='utf-8')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evaluation', type=Path, required=True)
    parser.add_argument('--protocol', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    result = build(args.evaluation, args.protocol, args.output)
    print(json.dumps({k: result[k] for k in ('prediction_cases', 'score_groups', 'selected_research_baseline', 'model_fits_this_run')}))


if __name__ == '__main__':
    main()
