import csv
import os
import re

def convert_md_to_csv():
    base_dir = os.path.dirname(os.path.dirname(__file__))
    md_path = os.path.join(base_dir, "docs", "MAPPED_CLIENT_REFERENCE.md")
    csv_path = os.path.join(base_dir, "data", "medshield", "reference_loc", "mapped_client_reference.csv")

    if not os.path.exists(md_path):
        print(f"Error: {md_path} not found.")
        return

    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    csv_rows = []
    for line in lines:
        line = line.strip()
        # Only process actual table rows, skip markdown dividers and bold section headers
        if line.startswith('|') and not line.startswith('| :---') and not line.startswith('| **'):
            # Split by | and ignore the empty first/last elements
            cols = [col.strip() for col in line.split('|')[1:-1]]
            
            if len(cols) == 6:
                # Strip markdown syntax for cleaner CSV data (e.g. bold, italics, backticks)
                clean_cols = []
                for c in cols:
                    c = c.replace('**', '').replace('`', '')
                    # Optional: remove asterisks used for italics like *(System Generated Default)*
                    c = re.sub(r'^\*\((.*?)\)\*$', r'(\1)', c)
                    c = re.sub(r'\*\((.*?)\)\*', r'(\1)', c)
                    clean_cols.append(c)
                
                csv_rows.append(clean_cols)

    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(csv_rows)

    print(f"Successfully converted MD to CSV with {len(csv_rows)-1} data rows.")
    print(f"Saved to: {csv_path}")

if __name__ == "__main__":
    convert_md_to_csv()
