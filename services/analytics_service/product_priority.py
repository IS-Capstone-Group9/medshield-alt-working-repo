"""
MedShield Product Prioritization & Scenario-Driven Decision Support Module
Implements WHO ABC-VEN Matrix Classification, Disease/Weather Surge Elasticity,
and Multi-Criteria Decision Analysis (MCDA) Scoring for Pharmaceutical Inventory Planning.
"""

from __future__ import annotations
import csv
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

CATALOG_PATH = Path(__file__).resolve().parent.parent.parent / "datasources" / "templates" / "product_master_catalog.csv"

DEFAULT_CATALOG = {
    "PARACETAMOL 500MG": {
        "generic_name": "Paracetamol",
        "ven_class": "V",
        "therapeutic_cluster": "Vector-Borne (Dengue)",
        "dengue_surge_coeff": 1.85,
        "weather_surge_coeff": 1.20,
        "unit_cost_php": 2.50,
        "lead_time_days": 3,
        "clinical_indication": "First-line antipyretic for Dengue and acute febrile illnesses (Non-NSAID)"
    },
    "PARACETAMOL MYREX 125MG/5ML": {
        "generic_name": "Paracetamol",
        "ven_class": "V",
        "therapeutic_cluster": "Vector-Borne (Dengue)",
        "dengue_surge_coeff": 1.75,
        "weather_surge_coeff": 1.15,
        "unit_cost_php": 24.00,
        "lead_time_days": 4,
        "clinical_indication": "Pediatric antipyretic for fever and Dengue viral infection"
    },
    "PARACETAMOL MYREX 250MG/5ML": {
        "generic_name": "Paracetamol",
        "ven_class": "V",
        "therapeutic_cluster": "Vector-Borne (Dengue)",
        "dengue_surge_coeff": 1.80,
        "weather_surge_coeff": 1.20,
        "unit_cost_php": 30.00,
        "lead_time_days": 4,
        "clinical_indication": "Pediatric antipyretic for high fever and Dengue"
    },
    "PARACETAMOL MYREX 100MG/ML": {
        "generic_name": "Paracetamol",
        "ven_class": "V",
        "therapeutic_cluster": "Vector-Borne (Dengue)",
        "dengue_surge_coeff": 1.70,
        "weather_surge_coeff": 1.10,
        "unit_cost_php": 24.00,
        "lead_time_days": 4,
        "clinical_indication": "Infant antipyretic drops for fever management"
    },
    "DOXYCYCLINE 100MG": {
        "generic_name": "Doxycycline Hyclate",
        "ven_class": "V",
        "therapeutic_cluster": "Waterborne (Flood/Lepto)",
        "dengue_surge_coeff": 2.50,
        "weather_surge_coeff": 2.80,
        "unit_cost_php": 8.50,
        "lead_time_days": 5,
        "clinical_indication": "Mandatory post-exposure prophylaxis and treatment for Leptospirosis during floods"
    },
    "ORAL REHYDRATION SALTS": {
        "generic_name": "Oral Rehydration Salts (ORS)",
        "ven_class": "V",
        "therapeutic_cluster": "Vector-Borne (Dengue)",
        "dengue_surge_coeff": 2.20,
        "weather_surge_coeff": 1.90,
        "unit_cost_php": 12.00,
        "lead_time_days": 2,
        "clinical_indication": "Critical electrolyte and fluid replacement for Dengue and Acute Gastroenteritis"
    },
    "0.9% SODIUM CHLORIDE 500ML": {
        "generic_name": "0.9% Sodium Chloride (Normal Saline)",
        "ven_class": "V",
        "therapeutic_cluster": "Vector-Borne (Dengue)",
        "dengue_surge_coeff": 2.40,
        "weather_surge_coeff": 1.50,
        "unit_cost_php": 45.00,
        "lead_time_days": 6,
        "clinical_indication": "Emergency fluid resuscitation and maintenance in Dengue hemorrhagic fever"
    },
    "LACTATED RINGERS 500ML": {
        "generic_name": "Lactated Ringer's Solution",
        "ven_class": "V",
        "therapeutic_cluster": "Vector-Borne (Dengue)",
        "dengue_surge_coeff": 2.30,
        "weather_surge_coeff": 1.40,
        "unit_cost_php": 48.00,
        "lead_time_days": 6,
        "clinical_indication": "Intravenous fluid replacement in Dengue shock syndrome and trauma"
    },
    "SALBUTAMOL 2.5MG/2.5ML NEBULE": {
        "generic_name": "Salbutamol",
        "ven_class": "V",
        "therapeutic_cluster": "Monsoon (ARI)",
        "dengue_surge_coeff": 1.30,
        "weather_surge_coeff": 2.20,
        "unit_cost_php": 18.00,
        "lead_time_days": 3,
        "clinical_indication": "Emergency bronchodilator for acute asthma exacerbations during monsoon weather"
    },
    "SALBUTAMOL 2MG/5ML SYRUP": {
        "generic_name": "Salbutamol",
        "ven_class": "E",
        "therapeutic_cluster": "Monsoon (ARI)",
        "dengue_surge_coeff": 1.20,
        "weather_surge_coeff": 1.80,
        "unit_cost_php": 35.00,
        "lead_time_days": 4,
        "clinical_indication": "Pediatric bronchodilator for acute bronchitis and asthma"
    },
    "AMOXICILLIN 500MG": {
        "generic_name": "Amoxicillin",
        "ven_class": "E",
        "therapeutic_cluster": "Monsoon (ARI)",
        "dengue_surge_coeff": 1.25,
        "weather_surge_coeff": 1.75,
        "unit_cost_php": 4.50,
        "lead_time_days": 5,
        "clinical_indication": "Broad-spectrum antibiotic for bacterial pneumonia and respiratory infections"
    },
    "CO-AMOXICLAV 625MG": {
        "generic_name": "Amoxicillin + Clavulanic Acid",
        "ven_class": "E",
        "therapeutic_cluster": "Monsoon (ARI)",
        "dengue_surge_coeff": 1.20,
        "weather_surge_coeff": 1.60,
        "unit_cost_php": 22.00,
        "lead_time_days": 7,
        "clinical_indication": "Second-line antibiotic for severe respiratory tract infections"
    },
    "AZITHROMYCIN 500MG": {
        "generic_name": "Azithromycin",
        "ven_class": "E",
        "therapeutic_cluster": "Monsoon (ARI)",
        "dengue_surge_coeff": 1.15,
        "weather_surge_coeff": 1.50,
        "unit_cost_php": 38.00,
        "lead_time_days": 7,
        "clinical_indication": "Macrolide antibiotic for atypical pneumonia and storm-related infections"
    },
    "CIPROFLOXACIN 500MG": {
        "generic_name": "Ciprofloxacin",
        "ven_class": "E",
        "therapeutic_cluster": "Waterborne (Flood/Lepto)",
        "dengue_surge_coeff": 1.40,
        "weather_surge_coeff": 1.80,
        "unit_cost_php": 6.50,
        "lead_time_days": 5,
        "clinical_indication": "Fluoroquinolone for severe enteric fever, typhoid, and waterborne infections"
    },
    "HYCLENS WOUND SPRAY 60ML": {
        "generic_name": "Chlorhexidine Digluconate 2%",
        "ven_class": "E",
        "therapeutic_cluster": "Waterborne (Flood/Lepto)",
        "dengue_surge_coeff": 1.10,
        "weather_surge_coeff": 2.10,
        "unit_cost_php": 85.00,
        "lead_time_days": 5,
        "clinical_indication": "Antiseptic wound cleansing and flood-debris trauma disinfection"
    },
    "DOLO JAGA 500MG/50MG/100MG/100MCG": {
        "generic_name": "Paracetamol + Vit B Complex",
        "ven_class": "E",
        "therapeutic_cluster": "Routine Chronic",
        "dengue_surge_coeff": 1.10,
        "weather_surge_coeff": 1.05,
        "unit_cost_php": 9.50,
        "lead_time_days": 4,
        "clinical_indication": "Analgesic and neurotropic vitamin complex for musculoskeletal pain"
    },
    "AMLODIPINE 5MG": {
        "generic_name": "Amlodipine Besylate",
        "ven_class": "E",
        "therapeutic_cluster": "Routine Chronic",
        "dengue_surge_coeff": 1.00,
        "weather_surge_coeff": 1.00,
        "unit_cost_php": 1.80,
        "lead_time_days": 4,
        "clinical_indication": "Standard essential antihypertensive for maintenance therapy"
    },
    "LOSARTAN 50MG": {
        "generic_name": "Losartan Potassium",
        "ven_class": "E",
        "therapeutic_cluster": "Routine Chronic",
        "dengue_surge_coeff": 1.00,
        "weather_surge_coeff": 1.00,
        "unit_cost_php": 2.50,
        "lead_time_days": 4,
        "clinical_indication": "Angiotensin II receptor blocker for chronic hypertension"
    },
    "METFORMIN 500MG": {
        "generic_name": "Metformin HCl",
        "ven_class": "E",
        "therapeutic_cluster": "Routine Chronic",
        "dengue_surge_coeff": 1.00,
        "weather_surge_coeff": 1.00,
        "unit_cost_php": 1.50,
        "lead_time_days": 4,
        "clinical_indication": "Essential biguanide for type 2 diabetes glycemic control"
    },
    "CETIRIZINE 10MG": {
        "generic_name": "Cetirizine HCl",
        "ven_class": "E",
        "therapeutic_cluster": "Routine Chronic",
        "dengue_surge_coeff": 1.10,
        "weather_surge_coeff": 1.30,
        "unit_cost_php": 3.00,
        "lead_time_days": 3,
        "clinical_indication": "Antihistamine for allergic rhinitis and skin rashes"
    },
    "MULTIVITAMINS + ZINC": {
        "generic_name": "Multivitamins + Zinc",
        "ven_class": "N",
        "therapeutic_cluster": "Routine Chronic",
        "dengue_surge_coeff": 1.15,
        "weather_surge_coeff": 1.10,
        "unit_cost_php": 5.00,
        "lead_time_days": 3,
        "clinical_indication": "Elective immune supplement and dietary nutritional support"
    },
    "SANOMAX-FA": {
        "generic_name": "Nutritional Supplement FA",
        "ven_class": "N",
        "therapeutic_cluster": "Routine Chronic",
        "dengue_surge_coeff": 1.00,
        "weather_surge_coeff": 1.00,
        "unit_cost_php": 12.00,
        "lead_time_days": 5,
        "clinical_indication": "Discretionary dietary supplement and health tonic"
    },
    "VITAMIN C 500MG": {
        "generic_name": "Ascorbic Acid",
        "ven_class": "N",
        "therapeutic_cluster": "Routine Chronic",
        "dengue_surge_coeff": 1.20,
        "weather_surge_coeff": 1.25,
        "unit_cost_php": 2.50,
        "lead_time_days": 3,
        "clinical_indication": "Over-the-counter vitamin supplement"
    }
}

def load_catalog() -> Dict[str, Dict[str, Any]]:
    catalog = dict(DEFAULT_CATALOG)
    if CATALOG_PATH.exists():
        try:
            with CATALOG_PATH.open("r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    name = row.get("product_name", "").strip().upper()
                    if not name:
                        continue
                    catalog[name] = {
                        "generic_name": row.get("generic_name", name),
                        "ven_class": row.get("ven_class", "E").upper(),
                        "therapeutic_cluster": row.get("therapeutic_cluster", "Routine Chronic"),
                        "dengue_surge_coeff": float(row.get("dengue_surge_coeff", 1.0) or 1.0),
                        "weather_surge_coeff": float(row.get("weather_surge_coeff", 1.0) or 1.0),
                        "unit_cost_php": float(row.get("unit_cost_php", 10.0) or 10.0),
                        "lead_time_days": int(row.get("lead_time_days", 5) or 5),
                        "clinical_indication": row.get("clinical_indication", "")
                    }
        except Exception:
            pass
    return catalog

def match_catalog_item(product_name: str, catalog: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    norm = product_name.strip().upper()
    if norm in catalog:
        return catalog[norm]
    for key, meta in catalog.items():
        if key in norm or norm in key:
            return meta
    if "PARACETAMOL" in norm:
        return catalog.get("PARACETAMOL 500MG", DEFAULT_CATALOG["PARACETAMOL 500MG"])
    if "DOXYCYCLINE" in norm:
        return catalog.get("DOXYCYCLINE 100MG", DEFAULT_CATALOG["DOXYCYCLINE 100MG"])
    if "SALTS" in norm or "ORS" in norm or "HYDRITE" in norm:
        return catalog.get("ORAL REHYDRATION SALTS", DEFAULT_CATALOG["ORAL REHYDRATION SALTS"])
    if "CHLORIDE" in norm or "NACL" in norm or "SALINE" in norm or "FLUID" in norm:
        return catalog.get("0.9% SODIUM CHLORIDE 500ML", DEFAULT_CATALOG["0.9% SODIUM CHLORIDE 500ML"])
    if "SALBUTAMOL" in norm:
        return catalog.get("SALBUTAMOL 2MG/5ML SYRUP", DEFAULT_CATALOG["SALBUTAMOL 2MG/5ML SYRUP"])
    if "AMOXICILLIN" in norm or "CO-AMOXICLAV" in norm:
        return catalog.get("AMOXICILLIN 500MG", DEFAULT_CATALOG["AMOXICILLIN 500MG"])
    if "VITAMIN" in norm or "ZINC" in norm or "SANOMAX" in norm:
        return catalog.get("MULTIVITAMINS + ZINC", DEFAULT_CATALOG["MULTIVITAMINS + ZINC"])
    
    return {
        "generic_name": product_name,
        "ven_class": "E",
        "therapeutic_cluster": "Routine Chronic",
        "dengue_surge_coeff": 1.0,
        "weather_surge_coeff": 1.0,
        "unit_cost_php": 10.0,
        "lead_time_days": 4,
        "clinical_indication": "Commercial pharmaceutical item"
    }

def get_default_mcda_weights(scenario: str) -> Dict[str, float]:
    scen = scenario.lower().strip()
    if scen in ("outbreak", "dengue", "epidemic"):
        return {"volume": 20.0, "clinical": 45.0, "surge": 35.0}
    elif scen in ("weather", "typhoon", "disaster", "flood"):
        return {"volume": 15.0, "clinical": 45.0, "surge": 40.0}
    else:
        return {"volume": 60.0, "clinical": 30.0, "surge": 10.0}

def classify_abc_ven_category(abc: str, ven: str) -> Tuple[str, str]:
    code = f"{abc}{ven}".upper()
    if code in ("AV", "BV", "CV", "AE"):
        return "Category I", "Critical Priority (Zero-Stockout Buffer)"
    elif code in ("BE", "CE", "AN"):
        return "Category II", "Intermediate Priority (Periodic EOQ Reorder)"
    else:
        return "Category III", "Routine Priority (Standard Commercial Replenish)"

def calculate_product_priorities(
    product_totals: List[Dict[str, Any]],
    scenario: str = "normal",
    weights: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    catalog = load_catalog()
    mcda_weights = weights or get_default_mcda_weights(scenario)
    w_vol = mcda_weights.get("volume", 60.0) / 100.0
    w_clin = mcda_weights.get("clinical", 30.0) / 100.0
    w_surge = mcda_weights.get("surge", 10.0) / 100.0

    total_rev = sum(float(p.get("revenue", 0)) for p in product_totals if float(p.get("revenue", 0)) > 0)
    sorted_by_rev = sorted(
        [p for p in product_totals if float(p.get("revenue", 0)) > 0],
        key=lambda x: float(x.get("revenue", 0)),
        reverse=True
    )

    running_rev = 0.0
    enriched = []
    for rank, p in enumerate(sorted_by_rev, 1):
        name = p.get("product") or p.get("product_name") or p.get("name") or "Unknown Product"
        rev = float(p.get("revenue", 0))
        qty = float(p.get("quantity", 0) or p.get("units", 0) or 0)
        
        running_rev += rev
        share = (rev / total_rev * 100.0) if total_rev > 0 else 0.0
        cum_share = (running_rev / total_rev * 100.0) if total_rev > 0 else 0.0

        if cum_share <= 70.0 or rank == 1:
            abc = "A"
        elif cum_share <= 90.0:
            abc = "B"
        else:
            abc = "C"

        meta = match_catalog_item(name, catalog)
        ven = meta["ven_class"]
        cluster = meta["therapeutic_cluster"]
        dengue_coeff = meta["dengue_surge_coeff"]
        weather_coeff = meta["weather_surge_coeff"]

        scen_lower = scenario.lower().strip()
        if scen_lower in ("outbreak", "dengue"):
            surge_multiplier = dengue_coeff
        elif scen_lower in ("weather", "typhoon", "disaster"):
            surge_multiplier = weather_coeff
        else:
            surge_multiplier = 1.0

        category, cat_desc = classify_abc_ven_category(abc, ven)

        enriched.append({
            "name": name,
            "generic_name": meta["generic_name"],
            "revenue": rev,
            "quantity": qty,
            "revenue_share": round(share, 2),
            "cumulative_share": round(cum_share, 2),
            "abc": abc,
            "ven": ven,
            "matrix_code": f"{abc}{ven}",
            "category": category,
            "category_description": cat_desc,
            "therapeutic_cluster": cluster,
            "surge_multiplier": surge_multiplier,
            "unit_cost": meta["unit_cost_php"],
            "lead_time": meta["lead_time_days"],
            "indication": meta["clinical_indication"]
        })

    max_vol = max((p["quantity"] for p in enriched), default=1.0) or 1.0
    max_rev = max((p["revenue"] for p in enriched), default=1.0) or 1.0
    max_surge = max((p["surge_multiplier"] for p in enriched), default=1.0) or 1.0

    ven_scores = {"V": 100.0, "E": 60.0, "N": 20.0}

    for p in enriched:
        norm_vol = (0.5 * (p["quantity"] / max_vol) + 0.5 * (p["revenue"] / max_rev)) * 100.0
        norm_clin = ven_scores.get(p["ven"], 50.0)
        norm_surge = (p["surge_multiplier"] / max_surge) * 100.0 if max_surge > 0 else 50.0

        score = (w_vol * norm_vol) + (w_clin * norm_clin) + (w_surge * norm_surge)
        p["mcda_score"] = round(min(100.0, max(0.0, score)), 2)

    prioritized = sorted(enriched, key=lambda x: x["mcda_score"], reverse=True)
    for idx, p in enumerate(prioritized, 1):
        p["priority_rank"] = idx

    cat1 = [p for p in prioritized if p["category"] == "Category I"]
    cat2 = [p for p in prioritized if p["category"] == "Category II"]
    cat3 = [p for p in prioritized if p["category"] == "Category III"]

    summary = {
        "total_revenue": total_rev,
        "total_skus": len(prioritized),
        "scenario": scenario,
        "weights": mcda_weights,
        "category_1": {
            "count": len(cat1),
            "revenue": sum(p["revenue"] for p in cat1),
            "share": round(sum(p["revenue"] for p in cat1) / total_rev * 100.0, 2) if total_rev > 0 else 0.0,
            "skus": [p["name"] for p in cat1]
        },
        "category_2": {
            "count": len(cat2),
            "revenue": sum(p["revenue"] for p in cat2),
            "share": round(sum(p["revenue"] for p in cat2) / total_rev * 100.0, 2) if total_rev > 0 else 0.0,
            "skus": [p["name"] for p in cat2]
        },
        "category_3": {
            "count": len(cat3),
            "revenue": sum(p["revenue"] for p in cat3),
            "share": round(sum(p["revenue"] for p in cat3) / total_rev * 100.0, 2) if total_rev > 0 else 0.0,
            "skus": [p["name"] for p in cat3]
        }
    }

    matrix = {}
    for a in ("A", "B", "C"):
        for v in ("V", "E", "N"):
            code = f"{a}{v}"
            matches = [p for p in prioritized if p["matrix_code"] == code]
            matrix[code] = {
                "count": len(matches),
                "revenue": sum(p["revenue"] for p in matches),
                "share": round(sum(p["revenue"] for p in matches) / total_rev * 100.0, 2) if total_rev > 0 else 0.0,
                "skus": [p["name"] for p in matches]
            }

    return {
        "products": prioritized,
        "summary": summary,
        "matrix": matrix
    }
