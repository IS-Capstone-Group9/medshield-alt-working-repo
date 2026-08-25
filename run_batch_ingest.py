import sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

from services.data_pipeline import ingest_sales_bytes

csv_dir = Path('data/medshield/dataset_csv')
files = sorted(csv_dir.glob('medshield_data_*.csv'))

print('Starting batch ingestion of {} CSV files into data pipeline...'.format(len(files)))
results = []

for f in files:
    content = f.read_bytes()
    res = ingest_sales_bytes(content, f.name, persist_raw=True)
    q = res['quality']
    years_str = ', '.join([f'{y}: {c}' for y, c in q.get('years', {}).items()])
    print('Ingested {:<25}: Extracted={:>5}, Accepted={:>5}, Rejected={:>4}, Years=[{}]'.format(
        f.name, q['rows_extracted'], q['rows_accepted'], q['rows_rejected'], years_str
    ))
    results.append(res)

print('\nBatch ingestion complete!')
