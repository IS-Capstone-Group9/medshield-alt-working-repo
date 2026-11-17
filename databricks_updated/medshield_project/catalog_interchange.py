"""Import JSON into a separate proposal CSV. Never modifies the approval master."""
import argparse
import csv
import json
from pathlib import Path
from product_catalog import FIELDS, import_proposals


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input",type=Path)
    parser.add_argument("output",type=Path)
    args=parser.parse_args()
    if args.input.stat().st_size > 20_000_000:
        raise ValueError("Interchange exceeds 20 MB limit")
    items=json.loads(args.input.read_text(encoding="utf-8"))
    if not isinstance(items,list) or len(items)>10000:
        raise ValueError("Expected at most 10,000 proposal objects")
    # Original raw variants can share the same normalized label. Keep one proposal
    # per lookup key without altering or deleting any transaction records.
    from product_catalog import clean_label
    unique={}
    for item in items:
        if not isinstance(item,dict) or not isinstance(item.get("raw_title"),str):
            raise ValueError("raw_title is required")
        key=clean_label(item["raw_title"])
        if key not in unique or item["raw_title"] < unique[key]["raw_title"]:
            unique[key]=item
    proposals=import_proposals([unique[k] for k in sorted(unique)])
    # Exclusive creation avoids overwriting any existing approved/master file.
    with args.output.open("x",encoding="utf-8",newline="") as stream:
        writer=csv.DictWriter(stream,fieldnames=FIELDS);writer.writeheader();writer.writerows(proposals)
    print(f"Created {len(proposals)} unapproved proposals; master unchanged")


if __name__ == "__main__":
    main()
