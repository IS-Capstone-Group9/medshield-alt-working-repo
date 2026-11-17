"""Step1 offline current-Gold routing; explicit expected-release binding required."""
import argparse
import hashlib
import json
from pathlib import Path
from services.analytics_service.current_gold_product_routes import adapt_current_gold


def build(input_path: Path, expected_release_path: Path, output_path: Path):
    payload=json.loads(input_path.read_text(encoding='utf-8'))
    expected=json.loads(expected_release_path.read_text(encoding='utf-8'))
    result=adapt_current_gold(payload,expected)
    result['input_sha256']=hashlib.sha256(input_path.read_bytes()).hexdigest()
    output_path.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',type=Path,required=True)
    parser.add_argument('--expected-release',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();result=build(args.input,args.expected_release,args.output)
    print(json.dumps({k:result[k] for k in ['review_products','financial_products','review_only_products','records','eligible_net_sales_php','quantity_routes']}))
