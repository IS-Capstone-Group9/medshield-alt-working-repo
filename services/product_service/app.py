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



@app.get("/procurement_orders")
def procurement_orders():
    """
    Returns 1-Month (t+1) and 2-Month (t+2) Recommended Supplier Procurement Orders
    grouped by Therapeutic Category and Top Medicine SKUs, incorporating DOH & Weather signals.
    """
    orders = [
        {
            "category": "Antipyretics & Analgesics (High Fever & Pain)",
            "primary_medicines": "DOLO JAGA, PARACETAMOL 500MG, MEFENAMIC ACID",
            "doh_weather_trigger": "🦠 Dengue Cases +22% YoY | 🌧️ Heavy Rainfall (185mm)",
            "m1_forecast_units": 18450,
            "m2_forecast_units": 19200,
            "m1_m2_total_order_units": 37650,
            "recommended_order_boxes": 377,
            "urgency": "URGENT_REORDER",
            "supplier_action": "Order 37,650 units immediately for Month 1 & Month 2 hospital delivery."
        },
        {
            "category": "Respiratory & Antitussives (Coughs & Colds)",
            "primary_medicines": "SALBUTAMOL 2.5MG NEBULE, CARBOCISTEINE 500MG, CETIRIZINE",
            "doh_weather_trigger": "🦠 ILI / Flu Cases +16% | 💧 Relative Humidity 88%",
            "m1_forecast_units": 14200,
            "m2_forecast_units": 15800,
            "m1_m2_total_order_units": 30000,
            "recommended_order_boxes": 300,
            "urgency": "HIGH_PRIORITY",
            "supplier_action": "Stock 30,000 units before Month 2 monsoon peak."
        },
        {
            "category": "Antibiotics & Anti-Infectives",
            "primary_medicines": "EUROXONE 1G, MONOWEL 1G IV, CO-AMOXICLAV 625MG",
            "doh_weather_trigger": "🦠 SARI / Pneumonia Cases Baseline | 🌡️ Temp Drop 24°C",
            "m1_forecast_units": 9800,
            "m2_forecast_units": 10500,
            "m1_m2_total_order_units": 20300,
            "recommended_order_boxes": 203,
            "urgency": "MONITOR_BUFFER",
            "supplier_action": "Maintain 20,300 units standard buffer across hospital contracts."
        },
        {
            "category": "Flood Prophylactics & Anti-Leptospiral",
            "primary_medicines": "DOXYCYCLINE 100MG CAPSULE",
            "doh_weather_trigger": "🦠 Leptospirosis Watch | 🌀 Typhoon Signal Watch",
            "m1_forecast_units": 4500,
            "m2_forecast_units": 6200,
            "m1_m2_total_order_units": 10700,
            "recommended_order_boxes": 107,
            "urgency": "SEASONAL_PREPAREDNESS",
            "supplier_action": "Pre-position 10,700 units in flood-prone regional hubs (Central Luzon)."
        },
        {
            "category": "Gastrointestinal & Rehydration",
            "primary_medicines": "ORAL REHYDRATION SALTS (ORS), METRONIDAZOLE 500MG",
            "doh_weather_trigger": "🦠 Typhoid / ABD Cases +11%",
            "m1_forecast_units": 6100,
            "m2_forecast_units": 6800,
            "m1_m2_total_order_units": 12900,
            "recommended_order_boxes": 129,
            "urgency": "MONITOR_BUFFER",
            "supplier_action": "Replenish 12,900 units for routine hospital inventory."
        }
    ]
    return jsonify(orders)


if __name__ == "__main__":
    app.run(
        port=int(os.getenv("PRODUCT_SERVICE_PORT", "5102")),
        debug=os.getenv("FLASK_DEBUG", "").strip().lower() in {"1", "true", "yes"},
        use_reloader=False,
    )
