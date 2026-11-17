"""Register or execute one immutable offline ABC evidence comparison."""
import argparse
import csv
import json
from pathlib import Path
from .. import abc_accuracy_evidence as evidence
from .. import abc_evaluation as original


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode', choices=['register', 'execute'], required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    if args.mode == 'register':
        protocol = original.load_protocol(evidence.PROTOCOL, evidence.SOURCE)
        evidence.write_new(args.output/'registration.json', evidence.declaration(protocol))
        with (args.output/'registration.sha256').open('x', encoding='ascii') as stream:
            stream.write(evidence.sha(args.output/'registration.json')+'\n')
        print(json.dumps(dict(status='REGISTERED_BEFORE_FIT', sha256=evidence.sha(args.output/'registration.json'), models_trained=0)))
    else:
        result = evidence.execute(args.output)
        fields = ['stage', 'model_id', 'samples', 'accuracy', 'macro_f1', 'balanced_accuracy', 'a_support', 'a_recall', 'a_precision']
        with (args.output/'model-comparison.csv').open('x', newline='', encoding='utf-8') as stream:
            writer = csv.DictWriter(stream, fieldnames=fields)
            writer.writeheader()
            for score in result['scores']:
                if score['cohort'] == 'all':
                    writer.writerow({**{k: score[k] for k in fields[:6]}, 'a_support': score['per_class']['A']['support'],
                        'a_recall': score['per_class']['A']['recall'], 'a_precision': score['per_class']['A']['precision']})
        print(json.dumps(dict(status=result['status'], gate=result['new_comparison_gate'], models_trained=2,
            overall=[dict(stage=s['stage'], model=s['model_id'], samples=s['samples'], accuracy=s['accuracy'],
                macro_f1=s['macro_f1'], a_recall=s['per_class']['A']['recall']) for s in result['scores'] if s['cohort'] == 'all'])))


if __name__ == '__main__':
    main()
