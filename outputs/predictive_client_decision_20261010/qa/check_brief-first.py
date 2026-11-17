"""Bounded independent document/data review of the prepared client decision.

No production model import, preparation rerun, fitting, app build, or cloud call.
"""
import ast
from collections import Counter
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import platform
import re
import sys
import unicodedata
from urllib.parse import unquote

from expected_metrics import expected, RUN, MODELS

HERE = Path(__file__).resolve().parent
PACKET = HERE.parent
ROOT = HERE.parents[2]
D = Decimal
CHECKS = []


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def check(label, passed, expected=None, observed=None):
    CHECKS.append(dict(check=label, passed=bool(passed), expected=expected, observed=observed))


def close(label, observed, target, rate=False):
    tolerance = D('1e-10') if rate else D('1e-6')
    check(label, abs(D(str(observed)) - D(str(target))) <= tolerance, str(target), str(observed))


def slug(heading):
    heading = re.sub(r'[*`]', '', heading).strip().lower()
    heading = ''.join(c for c in heading if c.isspace() or c in '_-' or unicodedata.category(c)[0] in 'LN')
    return heading.replace(' ', '-')


def local_links(path, text):
    for index, target in enumerate(re.findall(r'\[[^\]]*\]\(([^)]+)\)', text)):
        if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', target):
            continue
        target = target.strip('<>')
        file_name, _, anchor = target.partition('#')
        destination = (path.parent / unquote(file_name)).resolve() if file_name else path
        # QA's own report is authored immediately after this bounded check.
        if destination == HERE / 'REPORT.md':
            check(f'local_link:{path.name}:{index}', destination.parent.exists(), 'owned QA report destination', str(destination))
            continue
        exists = destination.is_file()
        check(f'local_link:{path.name}:{index}', exists, 'existing local file', str(destination))
        if anchor and exists and destination.suffix.lower() == '.md':
            headings = re.findall(r'^#+\s+(.+?)\s*$', destination.read_text(encoding='utf-8-sig'), re.M)
            anchors, seen = set(), Counter()
            for heading in headings:
                value = slug(heading)
                anchors.add(value if seen[value] == 0 else f'{value}-{seen[value]}')
                seen[value] += 1
            check(f'local_anchor:{path.name}:{index}', unquote(anchor) in anchors, anchor, sorted(anchors))


def main():
    output = HERE / 'verification.json'
    if output.exists():
        raise FileExistsError('Preserve first verification; do not overwrite it')
    decision_path = PACKET / 'decision.json'
    identities_path = PACKET / 'source-identities.json'
    brief_path = ROOT / 'docs/PREDICTIVE_CLIENT_DECISION_BRIEF.md'
    register_path = ROOT / 'docs/OBJECTIVE_EVIDENCE_REGISTER.md'
    readme_path = PACKET / 'README.md'
    builder_path = PACKET / 'prepare.py'
    expected_path = HERE / 'expected-metrics.json'
    decision, identities, frozen_expected = read(decision_path), read(identities_path), read(expected_path)
    bindings = {str(p): sha(p) for p in (decision_path, identities_path, brief_path, register_path, readme_path,
                                        builder_path, expected_path, HERE / 'expected_metrics.py', Path(__file__))}
    check('20_inherited_sources', len(identities['files']) == 20, 20, len(identities['files']))
    for name, declared in identities['files'].items():
        path = ROOT / name
        check('inherited_source:' + name, sha(path) == declared, declared, sha(path))
        bindings[str(path)] = sha(path)
    for path, declared in frozen_expected['source_sha256'].items():
        check('independent_expectation_source:' + path, sha(path) == declared, declared, sha(path))
        bindings[path] = sha(path)
    run = read(RUN)
    policy_path = ROOT / 'outputs/predictive_error_policy_20261010/policy.json'
    policy = read(policy_path)
    check('source_fact20_dataset', identities['fact_delta_version'] == run['manifest']['fact_delta_version'] == 20
          and identities['dataset_id'] == run['manifest']['dataset_id'] == policy['source']['manifest']['dataset_id'])
    check('source_optimization_run', identities['optimization_run_id'] == run['run_id'] == frozen_expected['run_id'])
    check('accountable_business_analyst', decision['accountable_role'] == 'Business Analyst')
    check('research_target', decision['target'] == 'company_monthly_eligible_recorded_net_sales_PHP')
    check('two_error_metrics', decision['primary_metrics'] == policy['primary_metrics'] == ['mae_php', 'wape_percent'])
    check('same_scored_pairs', decision['metric_populations'] == 'Both metrics use identical scored prediction/actual pairs within each cohort')
    for field in ('accepted_operational_use', 'max_mae_php', 'max_wape_percent', 'accepted_evaluation_period',
                  'accepted_leads_months', 'numerical_acceptance_reviewer', 'numerical_acceptance_date',
                  'next_source_release_date', 'actuals_2026', 'assessment_2026'):
        check('unknown_field:' + field, decision[field] is None, None, decision[field])
    check('both_limits_match_old_policy', policy['max_mae_php'] is None and policy['max_wape_percent'] is None)
    check('no_acceptance_with_missing_limits', decision['business_acceptance_status'] == policy['tolerance_status'] == 'not_assessed_thresholds_missing')
    check('direction_policy_unchanged', decision['provisional_directional_weights'] == policy['provisional_directional_weights'])
    check('provisional_costs', decision['provisional_directional_weights']['status'] == 'user_endorsed_research_assumption_not_measured_business_cost'
          and decision['provisional_directional_weights']['deliberate_directional_shift'] is False)
    check('reported_preference_attributed', decision['attribution']['reported_client_preference'] == 'CLIENT WANTS TO DO BOTH')
    check('requesting_user_endorsement', decision['attribution']['requesting_user_endorsement'] == 'SURE DO')
    check('no_external_signature_attribution', decision['attribution']['evidence'] == 'Statements in this implementation chat; no named external signature or acceptance timestamp supplied')
    check('decision_preparation_status', decision['status'] == 'user_endorsed_research_approach_prepared_for_client_review')
    utc = datetime.fromisoformat(decision['recorded_at_utc'])
    manila = datetime.fromisoformat(decision['recorded_at_manila'])
    check('recorded_timezone_and_instant', utc.utcoffset() == timedelta(0) and manila.utcoffset() == timedelta(hours=8) and utc == manila)
    check('capture_time_is_record_time', identities['captured_at_utc'] == decision['recorded_at_utc'])
    check('real_record_date', manila.date().isoformat() == '2026-10-10')
    check('original_reference_preserved', decision['original_selection'] == run['original_selection']['model_id'] == 'last_value')
    check('new_winner_preserved', decision['new_development_winner'] == run['development_freeze']['best_new_complete_recipe'] == 'median_12')
    check('calibration_unselected', decision['unselected_trial'] == 'last_value_l1_calibrated_10pct')
    for field in ('selection_changed', 'publication_approved', 'new_forecasts_issued', 'clinical_or_inventory_benefit_established',
                  'external_message_sent', 'fitting_executed'):
        check('no_new_authority:' + field, decision[field] is False)
    check('original_O3_open', decision['original_o3_status'] == 'open')
    check('annual_release_user_reported', decision['source_release_frequency'] == 'annual_user_reported')
    check('confirmation_future_registration', decision['confirmation_protocol_status'] == 'to_be_registered_before_later_actuals_are_inspected')
    audit = decision['compared_historical_audit']
    check('audit_dates_count_status', (audit['origin_period'], audit['target_start'], audit['target_end'], audit['cases_per_recipe'], audit['status']) ==
          ('2024-12', '2025-01', '2025-12', 12, 'already_inspected_retrospective_audit'))
    allpoints = run['baseline_predictions'] + run['predictions']
    model_points = {model: {stage: [p for p in allpoints if p['model_id'] == model and p['stage'] == stage]
                            for stage in ('development', 'retrospective_audit')} for model in MODELS}
    numerical = {model: {stage: expected(points) for stage, points in cohorts.items()} for model, cohorts in model_points.items()}
    keysets = [{(p['origin_period'], p['target_period'], p['lead_months'], p['actual']) for p in model_points[model]['retrospective_audit']} for model in MODELS]
    check('same_exact_audit_pairs', all(k == keysets[0] for k in keysets) and len(keysets[0]) == 12)
    for model in MODELS:
        point = audit['summaries'][model]
        target = numerical[model]['retrospective_audit']
        check('metric_count:' + model, point['n'] == target['n'] == 12)
        for field, desired in (('mae', 'mae_php'), ('rmse', 'rmse_php'), ('wape', 'wape_percent'), ('normalized_bias', 'normalized_signed_bias_percent')):
            close('audit_metric:' + model + ':' + field, point[field], target[desired], field in ('wape', 'normalized_bias'))
        errors = [D(str(p['prediction'])) - D(str(p['actual'])) for p in model_points[model]['retrospective_audit']]
        for field, value in (('over_count', sum(e > 0 for e in errors)), ('under_count', sum(e < 0 for e in errors)), ('zero_count', sum(e == 0 for e in errors))):
            check('direction_count:' + model + ':' + field, point[field] == value, value, point[field])
        close('direction_amount:' + model + ':over', point['over_amount'], sum(e for e in errors if e > 0))
        close('direction_amount:' + model + ':under', point['under_amount'], -sum(e for e in errors if e < 0))
    reductions = {}
    for field, model in (('unselected_calibration_changes', 'last_value_l1_calibrated_10pct'), ('median_winner_changes', 'median_12')):
        reductions[model] = {}
        for stage in ('development', 'retrospective_audit'):
            baseline, trial = numerical['last_value'][stage], numerical[model][stage]
            desired = dict(mae_absolute_reduction=baseline['mae_php'] - trial['mae_php'],
                           mae_relative_reduction_percent=100 * (1 - trial['mae_php'] / baseline['mae_php']),
                           wape_percentage_point_reduction=baseline['wape_percent'] - trial['wape_percent'],
                           rmse_relative_reduction_percent=100 * (1 - trial['rmse_php'] / baseline['rmse_php']))
            reductions[model][stage] = desired
            for name in decision[field][stage]:
                close('change:' + model + ':' + stage + ':' + name, decision[field][stage][name], desired[name], name != 'mae_absolute_reduction')
    brief = brief_path.read_text(encoding='utf-8')
    register = register_path.read_text(encoding='utf-8')
    section = register.split('## Predictive client decision brief — 10 October 2026', 1)[1].split('\n## ', 1)[0]
    flat = ' '.join(brief.split())
    for model in MODELS:
        m = numerical[model]['retrospective_audit']
        check('displayed_MAE:' + model, f'₱{m["mae_php"]:,.2f}' in brief, f'₱{m["mae_php"]:,.2f}')
        check('displayed_WAPE:' + model, f'{m["wape_percent"]:.6f}%' in brief, f'{m["wape_percent"]:.6f}%')
    cal = reductions['last_value_l1_calibrated_10pct']['retrospective_audit']
    for name, value in (('calibration_peso_reduction', f'₱{cal["mae_absolute_reduction"]:,.2f} per scored month'),
                        ('calibration_relative_percent', f'{cal["mae_relative_reduction_percent"]:.6f}%'),
                        ('calibration_WAPEpp', f'{cal["wape_percentage_point_reduction"]:.6f} percentage points'),
                        ('winner_dev_reduction', f'{reductions["median_12"]["development"]["mae_relative_reduction_percent"]:.6f}%'),
                        ('winner_audit_increase', f'{-reductions["median_12"]["retrospective_audit"]["mae_relative_reduction_percent"]:.6f}%')):
        check('displayed_change:' + name, value in brief, value)
    required_claims = ['requesting user reported', 'CLIENT WANTS TO DO BOTH', 'SURE DO',
                       'does not supply numerical limits', 'Monthly revenue budgeting is a proposed discussion use',
                       'operational decision remains unconfirmed', 'same pairs and absolute-error numerator',
                       'Neither caps the error in every month', 'zero absolute-actual denominator', 'no scored pairs',
                       'small net bias can conceal large opposing errors', 'not measured lost sales, cash loss',
                       'cannot determine medicine purchase quantities', 'Both valid limits must be met on the same cohort',
                       'business error acceptance remains', 'not assessed', 'has not been sent to the client',
                       'Agreeing limits alone does not activate a forecast', 'Source-owner explanations', 'remain unconfirmed',
                       'next release date is unknown', 'before later actuals', 'Historical issue-time source availability remains unverified',
                       'model\'s data cutoff', 'not evidence that predictions were actually issued then',
                       '10 October 2026 using a December 2025 data cutoff', 'January–September had already elapsed',
                       'October was current and November–December were future', 'Do not label all twelve as forecasts issued in December 2025',
                       'forecasts issued before their target periods', 'later accepted untouched actuals',
                       'New trial recipes have no new 2026 projections', 'Original O3', 'operational inventory acceptance remain open']
    for phrase in required_claims:
        check('claim:' + phrase, phrase.lower() in flat.lower(), phrase)
    check('register_preserves_unknowns_and_attribution', all(phrase in section for phrase in
          ('not supplied external signature', 'Missing limits stay `null`', 'not_assessed_thresholds_missing', 'Original O3 remains open')))
    check('register_preserves_original_objective', 'O3: December2026 onward territory pharmaceutical demand, DII/RSI and urgency' in register
          and '**Not fulfilled; supporting experiments exist**' in register)
    annual_path = ROOT / next(name for name in identities['files'] if 'predictive_annual_release' in name and name.endswith('run.json'))
    annual = read(annual_path)
    generated = datetime.fromisoformat(annual['generated_at']).astimezone(timezone(timedelta(hours=8)))
    check('annual_true_generation_and_cutoff', generated.date().isoformat() == '2026-10-10'
          and all(p['data_cutoff_period'] == '2025-12' and p['actual'] is None for p in annual['projection_points']))
    selected = [p for p in annual['projection_points'] if p['model_id'] == 'last_value']
    check('annual_actual_timing_flags', Counter(p['period_status'] for p in selected) ==
          Counter(dict(elapsed_no_actual=9, current_month_no_actual=1, future_no_actual=2)))
    check('annual_original_selection_preserved', annual['inherited_selection']['model_id'] == 'last_value' and annual['publication_approved'] is False)
    tree = ast.parse(builder_path.read_text(encoding='utf-8'))
    functions = [n.func.attr if isinstance(n.func, ast.Attribute) else n.func.id if isinstance(n.func, ast.Name) else ''
                 for n in ast.walk(tree) if isinstance(n, ast.Call)]
    imports = [n.module or '' for n in ast.walk(tree) if isinstance(n, ast.ImportFrom)] + [a.name for n in ast.walk(tree) if isinstance(n, ast.Import) for a in n.names]
    check('preparation_no_fitting_or_forecasting', not any(n in ('fit', 'predict', 'forecast', 'evaluate', 'robust_forecast') for n in functions))
    check('preparation_no_analytical_service_import', not any('analytics_service' in n or 'requests' in n or 'databricks' in n for n in imports))
    check('preparation_refuses_overwrite', 'Never overwrite a prepared decision record' in builder_path.read_text(encoding='utf-8'))
    check('preparation_command_recorded', decision['preparation_command'][-1] == 'outputs/predictive_client_decision_20261010/prepare.py')
    check('next_owners_present', len(decision['next_owner_actions']) == 3
          and all(o in ' '.join(a['owner'] for a in decision['next_owner_actions']) for o in ('CEO/client', 'Source owner', 'Model owner')))
    for path, text in ((brief_path, brief), (register_path, section), (readme_path, readme_path.read_text(encoding='utf-8'))):
        local_links(path, text)
    failed = [c for c in CHECKS if not c['passed']]
    result = dict(status='PASS' if not failed else 'FAIL', checked_at_utc=datetime.now(timezone.utc).isoformat(),
                  check_count=len(CHECKS), failure_count=len(failed), source_sha256=bindings, checks=CHECKS,
                  numerical_basis='Fresh independent Decimal sums of unchanged sealed historical points; expectations retained before the stable draft handoff',
                  numerical_tolerances=dict(currency_php='0.000001', percentage_points='0.0000000001', displayed_php='0.005'),
                  review_mode='Separate QA Engineer document/data review', environment=dict(python=platform.python_version(), executable=sys.executable),
                  command=sys.argv, fitting_executed=False, app_build_executed=False, external_messages_sent=False,
                  skills=['.agents/qa-engineer.md', '.skills/testing-standards.md', '.skills/analytics-frameworks.md', '.skills/database-standards.md'],
                  reused_guidance=['.agents/worker-operating-model.md', '.agents/execution-contract.md', '.skills/coding-standards.md', '.skills/technology-stack.md'],
                  limitations=['This document/source check does not establish client acceptance or model publication.',
                               'Known numerical client limits, operational decision and named external signature remain absent.',
                               'Future accepted untouched actuals and legitimate issue dates remain required.'])
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(dict(status=result['status'], check_count=len(CHECKS), failure_count=len(failed), source_bindings=len(bindings), failures=[c['check'] for c in failed])))
    return bool(failed)


if __name__ == '__main__':
    raise SystemExit(main())
