"""Package already evaluated ABC evidence for controlled Gold research readback; no fits."""
import argparse
import hashlib
import json
from pathlib import Path

PINS={'protocol.json':'8a31987c3be5578c4570f65b80697a329332254e4e46ec71d5e3c4c91d1b972a',
      'predictions.json':'492ebc33956d1ed8abaf4db2f3b1e50f1df97b8ca7eaf990caf16cf900d5c222',
      'results.json':'5a15e28827fbabe7c825fe48ff59cb85e88f9d1bee2f6197c562b26f621ae39b',
      'registration.json':'ed34ae8a34aec2f17c069727e678d27aa72c4dbf761087d4e669a9149d66977f',
      'selection.json':'a296f8af9fbb00968eefef17f9bd2c3dbb552ea9dc5003da4706c0dc538fba08'}
SOURCE_SHA='9c48b9da2353d184420f1c5dea0713b7360d09130520e44d87384ef88f531673'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
compact=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':'),allow_nan=False)

def package(directory,source_path):
    artifacts={}
    for name,digest in PINS.items():
        raw=(directory/name).read_bytes()
        assert sha(raw)==digest,name
        artifacts[name]=json.loads(raw)
    raw=source_path.read_bytes();assert sha(raw)==SOURCE_SHA
    source=json.loads(raw);protocol=artifacts['protocol.json'];result=artifacts['results.json']
    cases=artifacts['predictions.json'];keys={(c['product_key'],c['target_year']) for c in cases}
    members=[r for r in protocol['records'] if (r['product_key'],r['target_year']) in keys]
    assert len(members)==433
    controls={}
    for name in ['product_years','comparison_months']:
        q=source['queries'][name];assert sha(q['sql'].encode())==q['sql_sha256']
        columns=list(q['rows'][0]);values=[[r[k] for k in columns] for r in q['rows']]
        controls[name]=dict(sql=q['sql'],sql_sha256=q['sql_sha256'],columns=columns,
                            rows=len(values),values_sha256=sha(compact(values).encode()))
    return dict(schema_version='abc_research_package_v1',evidence_label='Derived',
        source_identity=source['release'],source_capture_sha256=SOURCE_SHA,input_artifact_sha256=PINS,
        label_policy=protocol['version'],target=protocol['target'],features=protocol['input_features'],
        selection=artifacts['selection.json'],source_checks=controls,members=members,cases=cases,
        scores=result['scores'],exclusions=result['exclusions'],limitations=result['limitations'],
        publication_approved=False,model_publication_approved=False,activation_allowed=False,
        calibration_status='unavailable_selected_baseline_has_no_heldout_probabilities',
        model_fits_this_packaging=0,unit_approval=False,product_identity_approved=False)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inherited',type=Path,required=True);parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    result=package(args.inherited,args.source);raw=(compact(result)+'\n').encode()
    args.output.parent.mkdir(parents=True,exist_ok=True)
    with args.output.open('xb') as stream:stream.write(raw)
    print(json.dumps(dict(status='PACKAGED_RETAINED_ABC_RESEARCH',artifact_sha256=sha(raw),bytes=len(raw),cases=len(result['cases']),members=len(result['members']),model_fits=0)))

if __name__=='__main__':main()
