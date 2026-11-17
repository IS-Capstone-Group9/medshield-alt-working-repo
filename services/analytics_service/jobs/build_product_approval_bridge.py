"""Create a hash-bound independent approval bridge offline, without approvals."""
import argparse
import csv
import hashlib
import json
import io
from pathlib import Path
from services.analytics_service.product_approval_bridge import build_approval_bridge


def build(input_path: Path, route_path: Path, master_path: Path, expected_path: Path, output_path: Path):
    result=build_approval_bridge(
        json.loads(input_path.read_text(encoding='utf-8')),
        json.loads(route_path.read_text(encoding='utf-8')),
        list(csv.DictReader(io.StringIO(master_path.read_text(encoding='utf-8-sig')))),
        master_sha256=hashlib.sha256(master_path.read_bytes()).hexdigest(),
        input_sha256=hashlib.sha256(input_path.read_bytes()).hexdigest(),
        expected_release=json.loads(expected_path.read_text(encoding='utf-8')),
    )
    output_path.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for arg in ['input','routes','master','expected-release','output']:parser.add_argument('--'+arg,type=Path,required=True)
    args=parser.parse_args();result=build(args.input,args.routes,args.master,args.expected_release,args.output)
    print(json.dumps({k:result[k] for k in ['schema_version','review_products','financial_products','review_only_products','publication_approved']}))
