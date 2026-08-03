from __future__ import annotations

import os
import sys
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from services.shared_snapshot import snapshot


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "product-service", "architecture": "microservices"})


@app.get("/products")
def products():
    rows = snapshot()["top_products"]
    try:
        limit = int(request.args.get("limit", 15))
    except (TypeError, ValueError):
        return jsonify({"error": "limit must be an integer"}), 400
    if limit < 1 or limit > 100:
        return jsonify({"error": "limit must be between 1 and 100"}), 400
    return jsonify(rows[:limit])


@app.get("/inventory_recommendations")
def inventory_recommendations():
    return jsonify(snapshot().get("inventory_recommendations", []))


@app.get("/product_priorities")
def product_priorities():
    return jsonify(snapshot().get("product_priorities", []))


@app.get("/allocation_recommendations")
def allocation_recommendations():
    return jsonify(snapshot().get("allocation_recommendations", []))


@app.get("/product_region_matches")
def product_region_matches():
    return jsonify(snapshot().get("product_region_matches", []))


THERAPEUTIC_TAXONOMY = {
    "Antipyretics & Analgesics (High Fever & Pain)": {
        "keywords": ["PARACETAMOL", "MEFENAMIC", "DOLO", "ANALGESIC", "BUPIVACAINE", "PAIN"],
        "indication": "High fever, Dengue fever, body aches, ILI symptom management",
        "disease_triggers": ["Dengue", "ILI", "COVID-19"],
        "weather_triggers": ["Heat Spikes", "Monsoon Season"]
    },
    "Respiratory & Antitussives (Coughs & Colds)": {
        "keywords": ["SALBUTAMOL", "CARBOCISTEINE", "CETIRIZINE", "COUGH", "COLD", "NEBULE", "ASTHMA"],
        "indication": "Coughs, colds, upper respiratory congestion, asthma flare-ups",
        "disease_triggers": ["ILI", "SARI", "COVID-19"],
        "weather_triggers": ["High Humidity", "Monsoon Rains"]
    },
    "Antibiotics & Anti-Infectives": {
        "keywords": ["AMOXICLAV", "CEFUROXIME", "CEFRADINE", "AZITHROMYCIN", "CIPROFLOXACIN", "CLOXACILLIN", "EUROXONE", "MONOWEL"],
        "indication": "Bacterial respiratory infections, hospital infection control",
        "disease_triggers": ["SARI", "Pneumonia", "Bacterial Outbreaks"],
        "weather_triggers": ["Cold Spikes", "Monsoon Rains"]
    },
    "Flood Prophylactics & Anti-Leptospiral": {
        "keywords": ["DOXYCYCLINE", "PROPHYLAXIS", "LEPTO"],
        "indication": "Post-flood Leptospirosis exposure prophylaxis",
        "disease_triggers": ["Leptospirosis"],
        "weather_triggers": ["Typhoons", "Extreme Rainfall (>150mm)"]
    },
    "Gastrointestinal & Rehydration": {
        "keywords": ["REHYDRATION", "ORS", "METRONIDAZOLE", "OMEPRAZOLE", "DIARRHEA", "TYPHOID"],
        "indication": "Dehydration, Acute Bloody Diarrhea (ABD), Typhoid fever",
        "disease_triggers": ["Typhoid", "ABD", "Cholera"],
        "weather_triggers": ["Urban Flooding", "Water Contamination"]
    }
}


@app.get("/classify_medicine")
def classify_medicine():
    name = request.args.get("name", "").strip()
    if not name:
        return jsonify({"error": "name parameter is required"}), 400
    
    import re
    p_upper = name.upper()
    for cat, details in THERAPEUTIC_TAXONOMY.items():
        for kw in details["keywords"]:
            if re.search(r'\b' + re.escape(kw) + r'\b', p_upper):
                return jsonify({
                    "product_name": name,
                    "therapeutic_category": cat,
                    "primary_indication": details["indication"],
                    "disease_triggers": details["disease_triggers"],
                    "weather_triggers": details["weather_triggers"],
                    "ai_confidence": 0.95
                })
    
    return jsonify({
        "product_name": name,
        "therapeutic_category": "General Pharmaceutical / Specialty",
        "primary_indication": "Hospital distribution item; requires clinical review",
        "disease_triggers": ["General Baseline"],
        "weather_triggers": ["General Seasonality"],
        "ai_confidence": 0.75
    })


@app.get("/therapeutic_categories")
def therapeutic_categories():
    categories_list = []
    for cat, details in THERAPEUTIC_TAXONOMY.items():
        categories_list.append({
            "category_name": cat,
            "indication": details["indication"],
            "disease_triggers": details["disease_triggers"],
            "weather_triggers": details["weather_triggers"]
        })
    return jsonify(categories_list)


if __name__ == "__main__":
    app.run(
        port=int(os.getenv("PRODUCT_SERVICE_PORT", "5102")),
        debug=os.getenv("FLASK_DEBUG", "").strip().lower() in {"1", "true", "yes"},
        use_reloader=False,
    )
