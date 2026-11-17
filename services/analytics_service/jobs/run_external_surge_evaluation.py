"""Run an explicit reviewed-cohort WP5 input; no default data or runtime source."""
import argparse
import csv
from datetime import datetime
import hashlib
import json
from pathlib import Path
from zoneinfo import ZoneInfo

from services.analytics_service.surge_evaluation import evaluate


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--validation-start',required=True)
    parser.add_argument('--audit-start',required=True)
    parser.add_argument('--audit-end',required=True)
    args=parser.parse_args()
    raw=args.input.read_bytes()
    data=json.loads(raw)
    result=evaluate(data,validation_start=args.validation_start,audit_start=args.audit_start,audit_end=args.audit_end)
    provenance={key:result[key] for key in ('dataset_id','policy_version','evidence_label','assumption_ids','fixture_only','method_version')}
    for key in ('ablation','classification_metrics'):
        if key in result:
            result[key]=[dict(row,**provenance) for row in result[key]]
    result['input_sha256']=hashlib.sha256(raw).hexdigest()
    result['evaluated_at']=datetime.now(ZoneInfo('Asia/Manila')).isoformat()
    base=Path(__file__).resolve().parents[1]
    result['code_sha256']={str(p.relative_to(base)):hashlib.sha256(p.read_bytes()).hexdigest() for p in
        [Path(__file__),base/'surge_evaluation.py',base/'external_indices.py',base/'predictive/metrics.py']}
    args.output.mkdir(parents=True,exist_ok=False)
    (args.output/'input.json').write_bytes(raw)
    (args.output/'results.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    for key,name in [('ablation','T5.2_dii_rsi_ablation_comparison.csv'),('classification_metrics','T5.3_surge_urgency_evaluation.csv')]:
        rows=result.get(key,[])
        if rows:
            fields=list(dict.fromkeys(k for row in rows for k in row))
            with (args.output/name).open('x',encoding='utf-8',newline='') as handle:
                writer=csv.DictWriter(handle,fieldnames=fields)
                writer.writeheader()
                writer.writerows({k:json.dumps(v,sort_keys=True) if isinstance(v,(dict,list)) else v for k,v in row.items()} for row in rows)
    print(json.dumps(dict(status=result['status'],output=str(args.output))))


if __name__=='__main__':
    main()
