"""Render the reviewed self-contained source as a real, multi-cell notebook."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'maintenance/20261027_original_itemized_stl_review.py'
TARGET = SOURCE.with_suffix('.ipynb')


def notebook_bytes():
    text = SOURCE.read_text(encoding='utf-8')
    cells = []
    for part in text.split('# COMMAND ----------'):
        lines = [line for line in part.strip().splitlines() if line != '# Databricks notebook source']
        if not lines:
            continue
        markdown = lines[0] == '# MAGIC %md'
        if markdown:
            lines = [line.removeprefix('# MAGIC ') for line in lines[1:]]
        cell = {'cell_type': 'markdown' if markdown else 'code',
                'id': hashlib.sha256('\n'.join(lines).encode('utf-8')).hexdigest()[:12],
                'metadata': {}, 'source': [line + '\n' for line in lines]}
        if not markdown:
            cell.update(execution_count=None, outputs=[])
        cells.append(cell)
    document = {'cells': cells, 'nbformat': 4, 'nbformat_minor': 5,
                'metadata': {'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'},
                             'language_info': {'name': 'python', 'version': '3'}}}
    return (json.dumps(document, indent=2, ensure_ascii=False) + '\n').encode('utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    expected = notebook_bytes()
    if args.check:
        if not TARGET.is_file() or TARGET.read_bytes() != expected:
            raise SystemExit('Original STL notebook export is stale')
    else:
        TARGET.write_bytes(expected)
    print('PASS_ORIGINAL_STL_NOTEBOOK_CELLS: source and ipynb match.')
