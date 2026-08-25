import csv
import os

LGU_LEDGER_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "medshield", "reference_loc", "master_lgu_ledger.csv")
RHU_LEDGER_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "medshield", "reference_loc", "master_rhu_ledger.csv")

def generate_rhu_ledger():
    if not os.path.exists(LGU_LEDGER_PATH):
        print(f"Error: {LGU_LEDGER_PATH} not found.")
        return

    rhu_entries = []
    
    # Read the master LGU ledger
    with open(LGU_LEDGER_PATH, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        # We only want to generate RHUs for actual municipalities (MHO/LGU)
        for row in reader:
            if row["Client Type"] == "MHO/LGU" and "City" not in row["lgu_city_muni"]:
                rhu_entries.append({
                    "Region": row["Region"],
                    "Province": row["Province"],
                    "Municipality": row["lgu_city_muni"],
                    "RHU_Name": f"{row['lgu_city_muni']} Rural Health Unit",
                    "Is_Active": "Yes"
                })

    # Write the new RHU ledger
    os.makedirs(os.path.dirname(RHU_LEDGER_PATH), exist_ok=True)
    with open(RHU_LEDGER_PATH, mode='w', encoding='utf-8', newline='') as f:
        fieldnames = ["Region", "Province", "Municipality", "RHU_Name", "Is_Active"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        
        writer.writeheader()
        for entry in rhu_entries:
            writer.writerow(entry)
            
    print(f"Successfully generated {len(rhu_entries)} Rural Health Units across CALABARZON, MIMAROPA, and BICOL.")
    print(f"Saved to: {RHU_LEDGER_PATH}")

if __name__ == "__main__":
    generate_rhu_ledger()
