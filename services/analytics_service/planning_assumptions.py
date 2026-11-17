"""Validate the offline scenario register. No defaults are applied to dashboard inputs."""
import json
import math
from pathlib import Path

LABELS = {'Observed', 'Derived', 'Proxy', 'Assumed', 'Forecast', 'Simulated'}


def load_register(path=None):
    path = Path(path) if path else Path(__file__).resolve().parents[2] / 'config/planning_assumptions.json'
    result = json.loads(path.read_text(encoding='utf-8'))
    if result.get('schema_version') != 'planning_assumptions_v1' or result.get('operational_use_approved') is not False:
        raise ValueError('Invalid scenario register or operational approval')
    if result.get('runtime_defaults_enabled') is not False:
        raise ValueError('Scenario register must not enable runtime defaults')
    params = result.get('parameters', [])
    if {p.get('id') for p in params} != {f'A{i}' for i in range(1,10)} or len(params) != 9:
        raise ValueError('Expected unique A1–A9 parameter records')
    for parameter in params:
        if parameter.get('evidence_label') != 'Assumed' or not parameter.get('unit'):
            raise ValueError('Assumption provenance and unit required')
        for key in ('base_values', 'sensitivity_values'):
            values = parameter.get(key)
            if not isinstance(values, list) or not values:
                raise ValueError('Empty scenario values')
            if any(isinstance(v, bool) or not isinstance(v, (float,int)) or not math.isfinite(v) or v < 0 for v in values):
                raise ValueError('Invalid scenario numeric value')
        if parameter.get('basis_status') != 'proposed_scenario_not_company_verified':
            raise ValueError('Do not present scenario ranges as verified company records')
    derivations = result.get('derivations', [])
    if len(derivations) != 4 or {d.get('id') for d in derivations} != {f'D{i}' for i in range(1,5)}:
        raise ValueError('Expected D1–D4 derivations')
    if any(d.get('evidence_label') != 'Derived' for d in derivations):
        raise ValueError('Derivation provenance is required')
    return result
