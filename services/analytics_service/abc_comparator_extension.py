"""Declared retrospective frozen-recipe ABC comparator extension; no reselection."""
import argparse
import importlib.metadata
import json
from pathlib import Path
from . import abc_protocol as contract
from . import abc_evaluation as original

ROOT=Path(__file__).resolve().parents[2]
PROTOCOL=ROOT/'outputs/original_abc_protocol_20261027/protocol.json'
SOURCE=ROOT/'outputs/original_so2_20261027/source.json'
INHERITED=ROOT/'outputs/wp6_abc_classifier_evaluation_20261030/inherited'


def declaration(protocol):
    versions={name:importlib.metadata.version(name) for name in original.PACKAGES}
    contract.require(versions==original.PACKAGES,'Frozen environment differs')
    return dict(schema_version='so2_frozen_recipe_comparator_v1',status='DECLARED_BEFORE_EXTENSION_FITS',
        protocol_sha256=original.PROTOCOL_SHA,source_sha256=protocol['source_sha256'],
        runner_sha256=contract.digest(Path(__file__).read_bytes()),package_versions=versions,
        inherited_selection_sha256=contract.digest((INHERITED/'selection.json').read_bytes()),
        inherited_predictions_sha256=contract.digest((INHERITED/'predictions.json').read_bytes()),
        training_stages=['development_train','frozen_refit_train'],training_years=[2021,2022,2023,2024],
        evaluation_stages=['retrospective_test_2025','partial_2026_extension'],
        model_order=list(original.MODELS),configs=[{k:v for k,v in c.items() if k!='model'} for c in protocol['challengers']],
        preprocessing='Training-label partition only: medians plus all missing indicators; six original prior-year features',
        selection_policy='No selection, retuning, early stopping, threshold change or activation; original prior_abc selection retained',
        comparison='Same eligible exact-label/year cases for all four methods; report all cohorts, null empty support, confusion and A recall',
        partial_year='2026 January-September separately; do not annualize or pool with 2025',
        interpretation='Inspected retrospective outcomes, not a blind or untouched final test',
        warehouse_writes=0,activation_allowed=False,model_publication_approved=False)


def execute(output):
    protocol=original.load_protocol(PROTOCOL,SOURCE)
    declared=json.loads((output/'declaration.json').read_bytes())
    contract.require(declared==declaration(protocol),'Declaration/source/code/environment changed')
    contract.require(not (output/'results.json').exists(),'Refuse overwrite/refit of completed extension')
    train=original.stage_rows(protocol,'development_train')+original.stage_rows(protocol,'frozen_refit_train')
    audits=[original.stage_rows(protocol,s) for s in declared['evaluation_stages']]
    contract.require(not ({r['product_key'] for r in train}&{r['product_key'] for rows in audits for r in rows}),'Training/test labels overlap')
    preprocessor=original.fit_preprocessor(train);fallback=original.majority(train)
    (output/'preprocessing.json').write_bytes(original.encoded(dict(training=preprocessor,majority=fallback)))
    cases=[];artifacts={}
    for rows in audits:
        for model_id in original.MODELS[:2]:cases.extend(original.predict_cases(rows,model_id,fallback))
    from xgboost import XGBClassifier
    for model_id,config in zip(original.MODELS[2:],declared['configs']):
        model=XGBClassifier(**config)
        model.fit(original.transform(train,preprocessor),[contract.CLASSES.index(r['target_abc']) for r in train])
        model_path=output/(model_id+'_refit.json');model.save_model(model_path);artifacts[model_path.name]=contract.digest(model_path.read_bytes())
        for rows in audits:cases.extend(original.predict_cases(rows,model_id,fallback,model,preprocessor))
    inherited=json.loads((INHERITED/'predictions.json').read_bytes())
    for case in cases:
        if case['model_id'] in original.MODELS[:2]:
            wanted=next(r for r in inherited if all(r[k]==case[k] for k in ['stage','model_id','product_key','target_year']))
            contract.require(case==wanted,'Baseline no longer reproduces retained case')
    for stage in declared['evaluation_stages']:
        identities=[{(r['product_key'],r['target_year']) for r in cases if r['stage']==stage and r['model_id']==model} for model in original.MODELS]
        contract.require(all(s==identities[0] for s in identities),'Comparator cohorts differ')
    (output/'predictions.json').write_bytes(original.encoded(cases))
    result=dict(schema_version='so2_comparator_results_v1',status='RETROSPECTIVE_EXTENSION_EVALUATED_NOT_ACTIVATED',
        declaration_sha256=contract.digest((output/'declaration.json').read_bytes()),
        source_sha256=protocol['source_sha256'],protocol_sha256=original.PROTOCOL_SHA,
        predictions_sha256=contract.digest((output/'predictions.json').read_bytes()),
        preprocessing_sha256=contract.digest((output/'preprocessing.json').read_bytes()),
        inherited_selection=json.loads((INHERITED/'selection.json').read_bytes()),
        scores=original.summarize(cases),models_trained=2,training_samples=len(train),model_artifacts=artifacts,
        limitations=protocol['limitations']+['This separately declared extension evaluates both unselected challengers; it does not amend the original selected-only execution or constitute a blind test.'],
        warehouse_writes=0,runtime_changed=False,activation_allowed=False,model_publication_approved=False)
    (output/'results.json').write_bytes(original.encoded(result));return result


def main():
    p=argparse.ArgumentParser();p.add_argument('--mode',choices=['declare','execute'],required=True);p.add_argument('--output',type=Path,required=True);args=p.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    if args.mode=='declare':
        protocol=original.load_protocol(PROTOCOL,SOURCE);content=original.encoded(declaration(protocol));path=args.output/'declaration.json'
        contract.require(not path.exists(),'Declaration already exists; do not overwrite');path.write_bytes(content)
        print(json.dumps(dict(status='DECLARED_BEFORE_EXTENSION_FITS',models_trained=0,sha256=contract.digest(content))))
    else:
        r=execute(args.output);print(json.dumps(dict(status=r['status'],models_trained=2,training_samples=r['training_samples'],scores=[s for s in r['scores'] if s['cohort']=='all'])))
if __name__=='__main__':main()
