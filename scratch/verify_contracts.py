import gzip
import json
import os

def verify():
    # Path setup
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    allocated_path = os.path.join(root_dir, 'data', 'medshield', 'processed', 'sales_transactions_area_allocated.json.gz')
    
    # Load dataset
    with gzip.open(allocated_path, 'rb') as f:
        data = json.load(f)
    rows = data.get('rows', [])

    legit_count = 0
    contract_count = 0
    allocated_child_count = 0
    
    recognized_labels = [
        'ABOITIZ', 'GULANG GULANG', 'MARINDUQUE', 'PADRE BURGOS', 
        'PAGBILAO', 'PESO', 'PESO PROVINCIAL', 'PHO', 'PPDC', 
        'PPOC', 'PROVINCIAL TOURISM OFFICE', 'QMC', 'TOURISM'
    ]

    for r in rows:
        prod_text = str(r.get('product') or '')
        is_est_allocation = r.get('allocation_status') == 'estimated_backward_allocation'
        
        if is_est_allocation:
            allocated_child_count += 1
            
        if '#' in prod_text:
            prefix = prod_text.split('#')[0].strip().upper()
            if prefix in recognized_labels:
                contract_count += 1
            else:
                legit_count += 1

    print('Verification Results:')
    print(f'  - Total Rows: {len(rows)}')
    print(f'  - Legitimate Products with "#" (e.g. Suture, Catheter): {legit_count}')
    print(f'  - Unsplit Parent Service Contract Rows remaining: {contract_count}')
    print(f'  - Split Child Estimated Rows (allocated from contracts): {allocated_child_count}')

if __name__ == "__main__":
    verify()
