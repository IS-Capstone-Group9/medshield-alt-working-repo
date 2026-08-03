from __future__ import annotations

import os
import sys
from datetime import date
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS


ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from services.shared_snapshot import snapshot
from services.data_pipeline import (
    AREA_COORDINATES,
    ingest_sales_bytes,
    refresh_weather,
    sales_dataset_status,
    sales_page,
    sales_summary,
    weather_effects,
)


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 30 * 1024 * 1024
CORS(app)


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "analytics-service", "architecture": "microservices"})


@app.get("/summary")
def summary():
    return jsonify(snapshot()["totals"])


@app.get("/monthly")
def monthly():
    data = snapshot()
    year = request.args.get("year")
    rows = data["monthly"]
    if year:
        rows = [row for row in rows if str(row.get("period", "")).startswith(year)]
    return jsonify(rows)


@app.get("/by_area")
def by_area():
    return jsonify(snapshot()["by_area"])


@app.get("/year_summary")
def year_summary():
    return jsonify(snapshot()["year_summary"])


@app.get("/seasonality")
def seasonality():
    return jsonify(snapshot()["seasonality"])


@app.get("/forecasts")
def forecasts():
    return jsonify(snapshot().get("forecasts", []))


@app.get("/external_signals")
def external_signals():
    return jsonify(snapshot().get("external_signals", []))


@app.get("/regional_priorities")
def regional_priorities():
    return jsonify(snapshot().get("regional_priorities", []))


@app.get("/area_clusters")
def area_clusters():
    return jsonify(snapshot().get("area_clusters", []))


@app.get("/decision_alerts")
def decision_alerts():
    return jsonify(snapshot().get("decision_alerts", []))


@app.get("/model_evaluation")
def model_evaluation():
    return jsonify(snapshot().get("model_evaluation", []))


@app.get("/sales/status")
def sales_status():
    return jsonify(sales_dataset_status())


@app.get("/sales/transactions")
def sales_transactions():
    year = request.args.get("year")
    page = request.args.get("page", "1")
    page_size = request.args.get("page_size", "25")
    quality_status = request.args.get("quality_status")
    try:
        parsed_page = int(page)
        parsed_page_size = int(page_size)
    except ValueError:
        return jsonify({"error": "page and page_size must be integers"}), 400
    if year and year != "all" and (not year.isdigit() or len(year) != 4):
        return jsonify({"error": "year must be a four-digit year or all"}), 400
    if quality_status and quality_status not in {"all", "valid", "warning", "rejected"}:
        return jsonify({"error": "quality_status is invalid"}), 400
    return jsonify(sales_page(
        year=year,
        page=parsed_page,
        page_size=parsed_page_size,
        search=request.args.get("search", ""),
        quality_status=quality_status,
    ))


@app.get("/sales/summary")
def get_sales_summary():
    year = request.args.get("year")
    quality_status = request.args.get("quality_status")
    if year and year != "all" and (not year.isdigit() or len(year) != 4):
        return jsonify({"error": "year must be a four-digit year or all"}), 400
    if quality_status and quality_status not in {"all", "valid", "warning", "rejected"}:
        return jsonify({"error": "quality_status is invalid"}), 400
    return jsonify(sales_summary(
        year=year,
        search=request.args.get("search", ""),
        quality_status=quality_status,
    ))


@app.post("/sales/ingest")
def sales_ingest():
    file_name = request.args.get("file_name", "").strip()
    if not file_name:
        return jsonify({"error": "file_name is required"}), 400
    try:
        result = ingest_sales_bytes(request.get_data(cache=False), file_name)
        return jsonify(result), 201
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@app.get("/weather/effects")
def get_weather_effects():
    try:
        return jsonify(weather_effects(
            year=request.args.get("year"),
            area=request.args.get("area"),
            grain=request.args.get("grain", "monthly"),
        ))
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@app.post("/weather/refresh")
def weather_refresh():
    payload = request.get_json(silent=True) or {}
    try:
        start = date.fromisoformat(str(payload.get("start", "")))
        end = date.fromisoformat(str(payload.get("end", "")))
        areas = payload.get("areas")
        if areas is not None and not isinstance(areas, list):
            raise ValueError("areas must be an array")
        result = refresh_weather(
            start=start,
            end=end,
            areas=areas,
            provider=str(payload.get("provider", "nasa_power")),
        )
        return jsonify(result)
    except (TypeError, ValueError) as error:
        return jsonify({
            "error": str(error),
            "supported_areas": sorted(AREA_COORDINATES),
        }), 400



@app.get("/seasonal_epidemic_matrix")
def seasonal_epidemic_matrix():
    """
    Seasonal Epidemic & Inventory Classification Matrix (Philippine Climate & DOH Alignment)
    Pipeline: [Target Month] -> [Expected Weather/Season] -> [Anticipated Disease Outbreaks] -> [Recommended Restock Categories]
    """
    matrix = [
        {
            "months": "January & February",
            "season_climate": "Northeast Monsoon (Amihan) / Cool Dry Season",
            "weather_indicators": "Cooler temperatures (20-25°C), low humidity, cold night fronts",
            "anticipated_outbreaks": "Influenza-Like Illness (ILI), SARI, Asthma exacerbations, Allergic Rhinitis",
            "recommended_categories": ["Bronchodilators", "Antihistamines", "Corticosteroids", "Decongestants"],
            "priority_medicines": "Salbutamol 2.5mg Nebules, Cetirizine 10mg, Fluticasone Nasal Spray, Paracetamol",
            "urgency_rating": "HIGH_RESPIRATORY_PRIORITY"
        },
        {
            "months": "March & April",
            "season_climate": "Dry Summer Peak / Thermal Surge",
            "weather_indicators": "High temperatures (34-38°C), intense solar radiation, low rainfall",
            "anticipated_outbreaks": "Heat Exhaustion, Dehydration, Acute Gastroenteritis, Food Poisoning, Typhoid Fever",
            "recommended_categories": ["Electrolyte Rehydration (ORS)", "Antidiarrheals", "Anti-emetics", "Topical Antifungals"],
            "priority_medicines": "Oral Rehydration Salts (ORS), Metronidazole 500mg, Omeprazole, Hyoscine N-Butylbromide",
            "urgency_rating": "SUMMER_GASTRO_PRIORITY"
        },
        {
            "months": "May & June",
            "season_climate": "Summer Transition to Early Southwest Monsoon",
            "weather_indicators": "Thunderstorms, rising humidity (82%+), intermittent heavy downpours",
            "anticipated_outbreaks": "Early Dengue surge onset, Hand-Foot-Mouth Disease (HFMD), Waterborne GI infections",
            "recommended_categories": ["Antipyretics & Analgesics", "IV Fluids & Electrolytes", "Broad-Spectrum Antibiotics"],
            "priority_medicines": "Paracetamol 500mg, Dolo Jaga, Co-Amoxiclav 625mg, Sodium Chloride 0.9% IV",
            "urgency_rating": "PRE_MONSOON_PREPAREDNESS"
        },
        {
            "months": "July & August",
            "season_climate": "Peak Southwest Monsoon (Habagat) & Tropical Cyclones",
            "weather_indicators": "Heavy rainfall (>250mm/mo), high humidity (88%+), severe urban flooding",
            "anticipated_outbreaks": "Dengue Fever Outbreaks, Leptospirosis, Acute Bloody Diarrhea (ABD), Cholera",
            "recommended_categories": ["Flood Prophylactics", "Antipyretics", "IV Rehydration", "Penicillins/Cephalosporins"],
            "priority_medicines": "Doxycycline 100mg (Prophylaxis), Paracetamol 500mg, Dolo Jaga, Cefuroxime 500mg, ORS",
            "urgency_rating": "CRITICAL_EPIDEMIC_SURGE"
        },
        {
            "months": "September & October",
            "season_climate": "Late Typhoon Season & Post-Flood Siltation",
            "weather_indicators": "Frequent typhoons, standing water ponds, high flood inundation",
            "anticipated_outbreaks": "Secondary Leptospirosis peak, Persistent Dengue, Waterborne Typhoid",
            "recommended_categories": ["Anti-Leptospiral Prophylactics", "Antipyretics", "Gastrointestinal Anti-infectives"],
            "priority_medicines": "Doxycycline 100mg, Paracetamol, Ciprofloxacin 500mg, Oral Rehydration Salts",
            "urgency_rating": "HIGH_FLOOD_RISK"
        },
        {
            "months": "November & December",
            "season_climate": "Transition to Northeast Monsoon (Amihan) & Holiday Peak",
            "weather_indicators": "Temperature drop, cool winds, indoor crowding during holidays",
            "anticipated_outbreaks": "Viral Respiratory Infections, ILI, Flu, Pediatric HFMD, Asthma",
            "recommended_categories": ["Bronchodilators & Nebules", "Pediatric Antitussives", "Broad-Spectrum Antibiotics"],
            "priority_medicines": "Salbutamol Nebules, Carbocisteine Syrup, Co-Amoxiclav, Cetirizine",
            "urgency_rating": "HOLIDAY_RESPIRATORY_SURGE"
        }
    ]
    return jsonify(matrix)


if __name__ == "__main__":
    app.run(
        port=int(os.getenv("ANALYTICS_SERVICE_PORT", "5101")),
        debug=os.getenv("FLASK_DEBUG", "").strip().lower() in {"1", "true", "yes"},
        use_reloader=False,
    )
