from __future__ import annotations

import math
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
from services.analytics_service.medshield_engine import (
    compute_surge_multiplier,
    calculate_adjusted_safety_stock,
    recalibrate_model_weights,
)
import numpy as np

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


# ─────────────────────────────────────────────────────────────────────────────
# SEASONAL EPIDEMIC & INVENTORY CLASSIFICATION MATRIX
# Pipeline: [Month] -> [Season/Weather] -> [Disease Risk] -> [Medicine Categories]
# Backed by: actual seasonality indices, DOH/PAGASA sources, computed model metrics
# ─────────────────────────────────────────────────────────────────────────────

_SEASONAL_MATRIX = [
    {
        "months": "November - February", "month_numbers": [1, 2],
        "season_climate": "Northeast Monsoon (Amihan) / Cool Dry Season",
        "season_emoji": "AMIHAN", "urgency_level": 3, "urgency_rating": "HIGH_RESPIRATORY_PRIORITY",
        "weather_indicators": "Cooler temperatures (20-25C), low humidity, cold night fronts",
        "anticipated_outbreaks": "Influenza-Like Illness (ILI), SARI, Asthma exacerbations, Allergic Rhinitis",
        "recommended_categories": ["Bronchodilators", "Antihistamines", "Corticosteroids", "Decongestants"],
        "priority_medicines": "Salbutamol 2.5mg Nebules, Cetirizine 10mg, Fluticasone Nasal Spray, Paracetamol",
        "seasonal_index": {"january": 0.6367, "february": 0.8122,
            "interpretation": "lower_than_average",
            "note": "Demand 36% below avg. Amihan brings respiratory cases but not peak supply demand."},
        "model_evidence": {
            "model_used": "BASE_LAG_V1 (Seasonal Naive Benchmark)", "benchmark_mae": 49413.1,
            "correlation": "Temperature drop linked to ILI patterns. No strong rainfall correlation - dry season.",
            "source_data": "DOH-EpiBureau ILI Surveillance 2021-2025"},
        "sources": [
            {"type": "Government", "citation": "DOH Philippines - PIDSR ILI Weekly Reports 2021-2025",
             "url": "https://doh.gov.ph/epidemiology-bureau"},
            {"type": "Academic",
             "citation": "Schisa & Farne (2025). Climatic Factors on Respiratory Pharmaceutical Demand. arXiv:2505.10642",
             "url": "https://arxiv.org/abs/2505.10642"}
        ], "status": "draft"
    },
    {
        "months": "March & April", "month_numbers": [3, 4],
        "season_climate": "Dry Summer Peak / Thermal Surge",
        "season_emoji": "SUMMER", "urgency_level": 2, "urgency_rating": "SUMMER_GASTRO_PRIORITY",
        "weather_indicators": "High temperatures (34-38C), intense solar radiation, low rainfall",
        "anticipated_outbreaks": "Heat Exhaustion, Dehydration, Acute Gastroenteritis, Food Poisoning, Typhoid Fever",
        "recommended_categories": ["Electrolyte Rehydration (ORS)", "Antidiarrheals", "Anti-emetics", "Topical Antifungals"],
        "priority_medicines": "ORS, Metronidazole 500mg, Omeprazole, Hyoscine N-Butylbromide",
        "seasonal_index": {"march": 0.4924, "april": 0.3458,
            "interpretation": "lowest_demand_months",
            "note": "April is the lowest demand month (0.35x). Summer GI outbreaks occur but supply demand is limited."},
        "model_evidence": {
            "model_used": "BASE_LAG_V1 (Seasonal Naive Benchmark)", "benchmark_mae": 49413.1,
            "correlation": "High temperature (>35C) positively associated with gastroenteritis and food-borne illness.",
            "source_data": "DOH-RESU Typhoid & Gastroenteritis Reports 2021-2025; PAGASA Temperature Records"},
        "sources": [
            {"type": "Government", "citation": "DOH Philippines - RESU Typhoid Fever and Diarrhea Monthly Reports",
             "url": "https://doh.gov.ph/epidemiology-bureau"},
            {"type": "Academic",
             "citation": "RAND Corporation (2024). Impact of Climate Change on Health and Drug Demand. RRA3425-1.",
             "url": "https://www.rand.org/pubs/research_reports/RRA3425-1.html"}
        ], "status": "draft"
    },
    {
        "months": "May & June", "month_numbers": [5, 6],
        "season_climate": "Summer Transition to Early Southwest Monsoon",
        "season_emoji": "PRE_MONSOON", "urgency_level": 4, "urgency_rating": "PRE_MONSOON_PREPAREDNESS",
        "weather_indicators": "Thunderstorms, rising humidity (82%+), intermittent heavy downpours",
        "anticipated_outbreaks": "Early Dengue surge onset, HFMD, Waterborne GI infections",
        "recommended_categories": ["Antipyretics & Analgesics", "IV Fluids & Electrolytes", "Broad-Spectrum Antibiotics"],
        "priority_medicines": "Paracetamol 500mg, Dolo Jaga, Co-Amoxiclav 625mg, Sodium Chloride 0.9% IV",
        "seasonal_index": {"may": 0.8771, "june": 2.8018,
            "interpretation": "JUNE_IS_PEAK_DEMAND_MONTH",
            "note": "ALERT: June is the HIGHEST demand month (2.80x average). Critical pre-positioning window before July-August epidemic peak."},
        "model_evidence": {
            "model_used": "GBR_DOH_PAGASA_V1 (Gradient Boosted Regressor)", "champion_mae": 52163.36, "champion_rmse": 69296.74,
            "correlation": "Rainfall onset in late May-June correlates with early Dengue cases. r=+0.429, p<0.01 (MedShield DOH-PAGASA analysis).",
            "source_data": "MedShield Sales 2021-2025; DOH Dengue Surveillance 2021-2025"},
        "sources": [
            {"type": "Government", "citation": "DOH Philippines - Dengue Epidemiology Alert Reports (Early Season), PIDSR 2021-2025",
             "url": "https://doh.gov.ph/epidemiology-bureau"},
            {"type": "Academic",
             "citation": "Carvajal et al. (2018). ML methods reveal dengue incidence patterns using meteorological factors in Manila. BMC Infectious Diseases.",
             "url": "https://link.springer.com/article/10.1186/s12879-018-3066-0"}
        ], "status": "draft"
    },
    {
        "months": "July & August", "month_numbers": [7, 8],
        "season_climate": "Peak Southwest Monsoon (Habagat) & Tropical Cyclones",
        "season_emoji": "HABAGAT", "urgency_level": 5, "urgency_rating": "CRITICAL_EPIDEMIC_SURGE",
        "weather_indicators": "Heavy rainfall (>250mm/mo), high humidity (88%+), severe urban flooding",
        "anticipated_outbreaks": "Dengue Fever Outbreaks, Leptospirosis, Acute Bloody Diarrhea (ABD), Cholera",
        "recommended_categories": ["Flood Prophylactics", "Antipyretics", "IV Rehydration", "Penicillins/Cephalosporins"],
        "priority_medicines": "Doxycycline 100mg (Prophylaxis), Paracetamol 500mg, Dolo Jaga, Cefuroxime 500mg, ORS",
        "seasonal_index": {"july": 0.4369, "august": 0.6533,
            "interpretation": "demand_dips_while_disease_peaks",
            "note": "Sales demand dips (Jul=0.44x) while disease risk peaks. Pre-position stock in June before logistics disruption."},
        "model_evidence": {
            "model_used": "GBR_DOH_PAGASA_V1 - PRIMARY CHOSEN MODEL",
            "champion_mae": 52163.36, "champion_rmse": 69296.74, "benchmark_mae": 49413.1,
            "correlation": "Rainfall->Leptospirosis: r=+0.548, p<0.001 (STRONG). Rainfall->Dengue: r=+0.429, p<0.01. Source: MedShield DOH-PAGASA correlation analysis.",
            "source_data": "DOH Leptospirosis & Dengue National Outbreak Reports; PAGASA Habagat Rainfall Records"},
        "sources": [
            {"type": "Government", "citation": "DOH Philippines - Dengue & Leptospirosis National Outbreak Reports, PIDSR 2021-2025",
             "url": "https://doh.gov.ph/epidemiology-bureau"},
            {"type": "Government", "citation": "PAGASA - Habagat Monsoon & Rainfall Station Records 2021-2024",
             "url": "https://bagong.pagasa.dost.gov.ph"},
            {"type": "Academic",
             "citation": "Carvajal et al. (2018). ML methods reveal dengue incidence patterns using meteorological factors in Manila. BMC Infectious Diseases.",
             "url": "https://link.springer.com/article/10.1186/s12879-018-3066-0"}
        ], "status": "draft"
    },
    {
        "months": "September & October", "month_numbers": [9, 10],
        "season_climate": "Late Typhoon Season & Post-Flood Siltation",
        "season_emoji": "TYPHOON", "urgency_level": 4, "urgency_rating": "HIGH_FLOOD_RISK",
        "weather_indicators": "Frequent typhoons, standing water ponds, high flood inundation",
        "anticipated_outbreaks": "Secondary Leptospirosis peak, Persistent Dengue, Waterborne Typhoid",
        "recommended_categories": ["Anti-Leptospiral Prophylactics", "Antipyretics", "Gastrointestinal Anti-infectives"],
        "priority_medicines": "Doxycycline 100mg, Paracetamol, Ciprofloxacin 500mg, ORS",
        "seasonal_index": {"september": 1.8186, "october": 0.5350,
            "interpretation": "september_is_2nd_highest_demand",
            "note": "September is the 2nd highest demand month (1.82x) - post-flood resupply surge as hospitals restock after typhoon disruption."},
        "model_evidence": {
            "model_used": "BASE_LAG_V1 (Seasonal Naive Benchmark)", "benchmark_mae": 49413.1,
            "correlation": "Post-flood leptospirosis surge follows 2-4 weeks after major flooding events. Seasonal lag confirmed in PAGASA-DOH analysis.",
            "source_data": "DOH Leptospirosis Post-Flood Weekly Reports; PAGASA Typhoon Track Data"},
        "sources": [
            {"type": "Government", "citation": "DOH Philippines - Leptospirosis Post-Typhoon Weekly Reports, PIDSR 2021-2025",
             "url": "https://doh.gov.ph/epidemiology-bureau"},
            {"type": "Academic",
             "citation": "RAND Corporation (2024). Impact of Climate Change on Health and Drug Demand. RRA3425-1.",
             "url": "https://www.rand.org/pubs/research_reports/RRA3425-1.html"}
        ], "status": "draft"
    },
    {
        "months": "November & December", "month_numbers": [11, 12],
        "season_climate": "Transition to Northeast Monsoon (Amihan) & Holiday Peak",
        "season_emoji": "HOLIDAY", "urgency_level": 3, "urgency_rating": "HOLIDAY_RESPIRATORY_SURGE",
        "weather_indicators": "Temperature drop, cool winds, indoor crowding during holidays",
        "anticipated_outbreaks": "Viral Respiratory Infections, ILI, Flu, Pediatric HFMD, Asthma",
        "recommended_categories": ["Bronchodilators & Nebules", "Pediatric Antitussives", "Broad-Spectrum Antibiotics"],
        "priority_medicines": "Salbutamol Nebules, Carbocisteine Syrup, Co-Amoxiclav, Cetirizine",
        "seasonal_index": {"november": 1.4873, "december": 0.5923,
            "interpretation": "november_above_average",
            "note": "November at 1.49x - pre-holiday restocking demand. December drops as hospitals slow during holiday season."},
        "model_evidence": {
            "model_used": "BASE_LAG_V1 + Seasonality Index (MedShield Descriptive Analytics)", "benchmark_mae": 49413.1,
            "correlation": "Indoor crowding + temperature transition correlates with ILI spikes. Confirmed in MedShield seasonality analysis.",
            "source_data": "DOH ILI and Pediatric Respiratory Reports 2021-2025; MedShield Sales Seasonality Analysis"},
        "sources": [
            {"type": "Government", "citation": "DOH Philippines - ILI and Pediatric Respiratory Surveillance Reports, PIDSR 2021-2025",
             "url": "https://doh.gov.ph/epidemiology-bureau"},
            {"type": "Academic",
             "citation": "Yahya et al. (2026). Hybrid ML forecasting for resilient pharmaceutical supply chains. Frontiers in Artificial Intelligence.",
             "url": "https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2026.1803863/full"}
        ], "status": "draft"
    },
]


@app.get("/seasonal_epidemic_matrix")
def seasonal_epidemic_matrix():
    return jsonify(_SEASONAL_MATRIX)


@app.get("/model_summary")
def model_summary():
    """All models used in the paper with actual computed metrics."""
    return jsonify({
        "methodology": {
            "overall": "CRISP-DM + SEMMA",
            "data_period": "2021-2025 (Sales); 2021-2025 (DOH); 2021-2024 (PAGASA)",
            "status": "draft"
        },
        "descriptive": [
            {"model_name": "Monthly Trend Analysis", "model_code": "MONTHLY_TREND_V1",
             "layer": "Descriptive", "status": "active",
             "output": "Monthly revenue, quantity & gross margin trends (2021-2025)"},
            {"model_name": "Year-over-Year (YoY) Analysis", "model_code": "YOY_V1",
             "layer": "Descriptive", "status": "active", "output": "Annual performance: 2021-2025"},
            {"model_name": "Product ABC / Pareto Classification", "model_code": "ABC_PARETO_V1",
             "layer": "Descriptive", "status": "active",
             "output": "3,335 products classified - A (0-80%), B (80-95%), C (95-100%)"},
            {"model_name": "Seasonality Index", "model_code": "SEASONALITY_INDEX_V1",
             "layer": "Descriptive", "status": "active",
             "seasonal_strength": 0.876574, "peak_month": "June", "peak_index": 2.8018,
             "output": "June=2.80x (peak), Sep=1.82x, Nov=1.49x",
             "monthly_indices": [
                 {"month": "Jan", "index": 0.6367}, {"month": "Feb", "index": 0.8122},
                 {"month": "Mar", "index": 0.4924}, {"month": "Apr", "index": 0.3458},
                 {"month": "May", "index": 0.8771}, {"month": "Jun", "index": 2.8018},
                 {"month": "Jul", "index": 0.4369}, {"month": "Aug", "index": 0.6533},
                 {"month": "Sep", "index": 1.8186}, {"month": "Oct", "index": 0.5350},
                 {"month": "Nov", "index": 1.4873}, {"month": "Dec", "index": 0.5923},
             ]},
            {"model_name": "Territory ABC & K-Means Clustering", "model_code": "TERRITORY_KMEANS_V1",
             "layer": "Descriptive", "status": "partial",
             "note": "Territory ABC computed. K-Means cluster labels pending.",
             "top_territories": [
                 {"territory": "Quezon", "abc_class": "A", "revenue_share": "36.1%"},
                 {"territory": "Batangas", "abc_class": "A", "revenue_share": "24.4%"},
                 {"territory": "Marinduque", "abc_class": "B", "revenue_share": "21.1%"},
             ]},
        ],
        "predictive": [
            {"model_name": "Seasonal Naive Benchmark", "model_code": "BASE_LAG_V1",
             "model_version": "1.0.0", "layer": "Predictive", "status": "benchmark",
             "evaluation_period": "2025-01 to 2025-12",
             "mae": 49413.1, "rmse": 66783.31, "mape": 1908.54,
             "note": "Mandatory baseline. High MAPE due to sparse months - use MAE/RMSE for comparison.",
             "review_status": "BENCHMARK"},
            {"model_name": "GBR with DOH + PAGASA Features", "model_code": "GBR_DOH_PAGASA_V1",
             "model_version": "1.1.0", "layer": "Predictive", "status": "primary_chosen",
             "evaluation_period": "2025-01 to 2025-12",
             "mae": 52163.36, "rmse": 69296.74, "mape": 593.96,
             "note": "Champion model. MAPE improvement: 1909% to 594%. Uses disease+weather external regressors. Proxy weather used for partial periods.",
             "review_status": "PRIMARY_CHOSEN",
             "external_correlations": {
                 "rainfall_leptospirosis": {"r": 0.548, "p_value": "<0.001", "interpretation": "Strong positive"},
                 "rainfall_dengue": {"r": 0.429, "p_value": "<0.01", "interpretation": "Moderate positive"},
             }},
            {"model_name": "Prophet (Sales-Only Baseline)", "model_code": "PROPHET_SALES_ONLY",
             "layer": "Predictive", "status": "planned",
             "note": "Prophet library installed but not yet trained. Seasonal Naive used as sales-only baseline. Prophet training scheduled after product master approval.",
             "review_status": "PLANNED"},
        ],
        "prescriptive": [
            {"model_name": "Seasonal Epidemic & Inventory Classification Matrix",
             "model_code": "SEASONAL_MATRIX_V1", "layer": "Prescriptive", "status": "active",
             "note": "Month->Season->Disease->Medicine Category. Backed by DOH/PAGASA sources and computed seasonal indices."},
            {"model_name": "EOQ / ROP / Safety Stock (Scenario)",
             "model_code": "EOQ_ROP_SCENARIO_V1", "layer": "Prescriptive", "status": "scenario",
             "note": "Formula-based scenario using assumed cost parameters. SCENARIO label - not procurement instruction."},
            {"model_name": "MCDA Territory Ranking", "model_code": "MCDA_V1",
             "layer": "Prescriptive", "status": "scenario",
             "note": "Revenue (60%) + Growth (40%) weights. Outbreak risk weight requires validated DOH territory data."},
            {"model_name": "Procurement Order Planning (t+1, t+2)",
             "model_code": "PROCUREMENT_PLAN_V1", "layer": "Prescriptive", "status": "scenario",
             "note": "1-month and 2-month forward recommendations per therapeutic category."},
        ],
        "data_sources": [
            {"name": "MedShield Internal Sales", "period": "2021-2025", "rows": 20961, "status": "active"},
            {"name": "DOH PIDSR Disease Surveillance", "period": "2021-2025", "status": "partial_proxy"},
            {"name": "PAGASA Rainfall & Weather Records", "period": "2021-2024", "status": "partial_proxy"},
            {"name": "NASA POWER / Open-Meteo (Weather Proxy)", "period": "2021-2025", "status": "active"},
        ],
    })


@app.get("/seasonal_restock_detail")
def seasonal_restock_detail():
    """Returns dynamic category-level prescriptive restock recommendations for a selected season/month block."""
    season_id = request.args.get("season_id", "monsoon").strip().lower()
    
    details_map = {
        "amihan": {
            "season_name": "November - February — Amihan Cool Dry Season",
            "climate_trigger": "Amihan Northeast Monsoon / Cool Air Mass",
            "disease_risks": ["Influenza-Like Illness (ILI)", "Flu Surges", "Asthma Exacerbations", "SARI"],
            "skus": [
                {"sku": "Inhaled Bronchodilators & Corticosteroids", "category": "Bronchodilators", "current_stock": 140, "eoq_reorder": 320, "rop": 120, "urgency": "High", "unit_cost": "₱125.00"},
                {"sku": "Nasal Antihistamines & Decongestants", "category": "Antihistamines", "current_stock": 500, "eoq_reorder": 800, "rop": 300, "urgency": "Medium", "unit_cost": "₱6.50"},
                {"sku": "Systemic Antipyretics (Non-NSAID / Paracetamol)", "category": "Antipyretics", "current_stock": 1200, "eoq_reorder": 2500, "rop": 800, "urgency": "Medium", "unit_cost": "₱8.50"},
            ]
        },
        "summer": {
            "season_name": "March & April — Summer Peak Heat Surge",
            "climate_trigger": "El Niño Heat Wave & Dry Season Peak",
            "disease_risks": ["Acute Gastroenteritis", "Severe Dehydration", "Typhoid Fever", "Foodborne Outbreaks"],
            "skus": [
                {"sku": "Oral Rehydration Salts (ORS)", "category": "Gastrointestinal & Rehydration", "current_stock": 450, "eoq_reorder": 1500, "rop": 500, "urgency": "High", "unit_cost": "₱5.50"},
                {"sku": "GI Anti-Infectives & Antiprotozoals", "category": "Antidiarrheals & GI Meds", "current_stock": 210, "eoq_reorder": 600, "rop": 200, "urgency": "High", "unit_cost": "₱14.00"},
                {"sku": "H2-Receptor Antagonists & PPIs", "category": "GI Anti-infectives", "current_stock": 320, "eoq_reorder": 750, "rop": 250, "urgency": "Medium", "unit_cost": "₱28.00"},
            ]
        },
        "pre_monsoon": {
            "season_name": "May & June — Pre-Monsoon Thunderstorms",
            "climate_trigger": "Early Thunderstorms & Humidity Spike",
            "disease_risks": ["Early Dengue Onset", "HFMD", "Waterborne Gastroenteritis"],
            "skus": [
                {"sku": "Systemic Antipyretics (Non-NSAID)", "category": "Antipyretics", "current_stock": 800, "eoq_reorder": 3000, "rop": 1000, "urgency": "High", "unit_cost": "₱8.50"},
                {"sku": "IV Fluids & Isotonic Electrolytes", "category": "IV Fluids", "current_stock": 120, "eoq_reorder": 450, "rop": 150, "urgency": "High", "unit_cost": "₱95.00"},
                {"sku": "Broad-Spectrum Antibiotics (Co-Amoxiclav)", "category": "Broad Antibiotics", "current_stock": 250, "eoq_reorder": 700, "rop": 220, "urgency": "Medium", "unit_cost": "₱55.00"},
            ]
        },
        "monsoon": {
            "season_name": "July & August — Peak Monsoon (Habagat) & Floods",
            "climate_trigger": "Peak Southwest Monsoon & Urban Inundation",
            "disease_risks": ["Dengue Outbreaks (DII > 1.4)", "Leptospirosis Wave 1", "Acute Bloody Diarrhea", "Cholera Watch"],
            "skus": [
                {"sku": "Systemic Antipyretics (Non-NSAID / Paracetamol)", "category": "Antipyretics", "current_stock": 600, "eoq_reorder": 4000, "rop": 1200, "urgency": "Critical", "unit_cost": "₱8.50"},
                {"sku": "Flood Prophylactics & Antibiotics (Doxycycline)", "category": "Flood Prophylactics", "current_stock": 180, "eoq_reorder": 1200, "rop": 400, "urgency": "Critical", "unit_cost": "₱12.00"},
                {"sku": "IV Fluids & Isotonic Electrolytes", "category": "IV Fluids", "current_stock": 90, "eoq_reorder": 500, "rop": 180, "urgency": "High", "unit_cost": "₱110.00"},
                {"sku": "Oral Rehydration Therapy & GI Anti-Infectives", "category": "GI Anti-infectives", "current_stock": 450, "eoq_reorder": 1500, "rop": 300, "urgency": "High", "unit_cost": "₱22.00"},
                {"sku": "Inhaled Bronchodilators & Corticosteroids", "category": "Bronchodilators", "current_stock": 140, "eoq_reorder": 650, "rop": 200, "urgency": "Medium", "unit_cost": "₱45.00"},
            ]
        },
        "typhoon": {
            "season_name": "September & October — Late Typhoon & Post-Flood Siltation",
            "climate_trigger": "Severe Tropical Storms & Flood Siltation",
            "disease_risks": ["Leptospirosis Wave 2", "Secondary Dengue Vector", "Typhoid Fever"],
            "skus": [
                {"sku": "Flood Prophylactics & Antibiotics (Doxycycline)", "category": "Anti-Leptospiral Meds", "current_stock": 250, "eoq_reorder": 1000, "rop": 350, "urgency": "Critical", "unit_cost": "₱12.00"},
                {"sku": "Oral Rehydration Therapy & GI Anti-Infectives", "category": "GI Anti-infectives", "current_stock": 190, "eoq_reorder": 550, "rop": 180, "urgency": "High", "unit_cost": "₱22.00"},
                {"sku": "IV Fluids & Isotonic Electrolytes", "category": "Rehydration", "current_stock": 380, "eoq_reorder": 1100, "rop": 350, "urgency": "Medium", "unit_cost": "₱95.00"},
            ]
        },
        "holiday": {
            "season_name": "November & December — Cold Front Transition & Holiday Peak",
            "climate_trigger": "Northeastern Cold Surge & Social Gathering Peak",
            "disease_risks": ["Flu/ILI Surges", "Pediatric Respiratory Infections", "Asthma Spike"],
            "skus": [
                {"sku": "Inhaled Bronchodilators & Corticosteroids", "category": "Bronchodilators", "current_stock": 200, "eoq_reorder": 600, "rop": 200, "urgency": "High", "unit_cost": "₱45.00"},
                {"sku": "Nasal Antihistamines & Decongestants", "category": "Antihistamines", "current_stock": 420, "eoq_reorder": 900, "rop": 300, "urgency": "Medium", "unit_cost": "₱8.50"},
                {"sku": "Systemic Antipyretics (Non-NSAID)", "category": "Antipyretics", "current_stock": 310, "eoq_reorder": 850, "rop": 280, "urgency": "Medium", "unit_cost": "₱8.50"},
            ]
        }
    }
    
    selected = details_map.get(season_id, details_map["monsoon"])
    return jsonify({
        "status": "ok",
        "season_id": season_id,
        "detail": selected
    })


@app.get("/dss/prescriptive")
def dss_prescriptive():
    """
    Returns structured prescriptive data reflecting August monsoon/Habagat climate phase triggers,
    surveillance metrics, surge multipliers, continuous weight learning, and therapeutic categories.
    """
    rainfall_mm = 385.2
    humidity_pct = 84.5
    dengue_alert_level = 3
    
    surge_mult = compute_surge_multiplier(rainfall_mm, humidity_pct, dengue_alert_level)
    
    # Recalibrate MAPE using simulated projected vs actual dispensed categories
    projected = np.array([1200, 800, 500, 300, 150])
    actual = np.array([1350, 950, 480, 290, 190])
    feedback = recalibrate_model_weights(projected, actual)
    
    recs = [
        {
            "category": "Systemic Antipyretics (Non-NSAID / Paracetamol)",
            "base_buffer_pct": 15,
            "surge_buffer_pct": 45,
            "current_stock": 600,
            "safety_stock": round(calculate_adjusted_safety_stock(200, surge_mult)),
            "reorder_qty": 4000,
            "urgency": "Critical",
            "contraindication_flag": True,
            "notes": "Contraindicated: NSAIDs (Ibuprofen, Mefenamic Acid) due to Dengue bleeding risk."
        },
        {
            "category": "Flood Prophylactics & Antibiotics (Doxycycline, Macrolides)",
            "base_buffer_pct": 10,
            "surge_buffer_pct": 40,
            "current_stock": 180,
            "safety_stock": round(calculate_adjusted_safety_stock(120, surge_mult)),
            "reorder_qty": 1200,
            "urgency": "Critical",
            "notes": "High risk of Leptospirosis exposure due to urban flooding. Prophylactic distribution active."
        },
        {
            "category": "IV Fluids & Isotonic Electrolytes",
            "base_buffer_pct": 10,
            "surge_buffer_pct": 35,
            "current_stock": 90,
            "safety_stock": round(calculate_adjusted_safety_stock(80, surge_mult)),
            "reorder_qty": 500,
            "urgency": "High",
            "notes": "Required for Dengue plasma leakage management and gastroenteritis hydration support."
        },
        {
            "category": "Oral Rehydration Therapy & GI Anti-Infectives",
            "base_buffer_pct": 5,
            "surge_buffer_pct": 30,
            "current_stock": 450,
            "safety_stock": round(calculate_adjusted_safety_stock(300, surge_mult)),
            "reorder_qty": 1500,
            "urgency": "High",
            "notes": "Monsoon waterborne outbreak buffer for acute diarrheal illnesses."
        },
        {
            "category": "Inhaled Bronchodilators & Corticosteroids",
            "base_buffer_pct": 5,
            "surge_buffer_pct": 20,
            "current_stock": 140,
            "safety_stock": round(calculate_adjusted_safety_stock(100, surge_mult)),
            "reorder_qty": 650,
            "urgency": "Medium",
            "notes": "Humidity spike triggers pediatric asthma/bronchitis. Adjusting nebulizer stock."
        }
    ]
    
    return jsonify({
        "status": "ok",
        "month": "August",
        "climate_phase": "Peak Monsoon (Habagat) & Urban Inundation",
        "doh_alert_level": "Dengue Alert Level 3",
        "metrics": {
            "rainfall_mm": rainfall_mm,
            "humidity_pct": humidity_pct,
            "dengue_alert_level": dengue_alert_level
        },
        "surge_multiplier": surge_mult,
        "feedback_loop": feedback,
        "recommendations": recs,
        "system_rationale": "August peak Habagat features extreme rainfall (>350mm) and humidity (>80%), driving Dengue surges. NSAIDs are flagged as contraindicated due to hemorrhage risk; systemic paracetamol buffer is boosted by +45%."
    })


@app.get("/mcda_territories")
def mcda_territories():
    """MCDA Territory Ranking - Revenue 60% + Growth 40% weights. Status: SCENARIO."""
    raw = [
        {"territory": "Quezon", "revenue_share": 0.3605, "abc_class": "A",
         "active_months": 54, "revenue_score": 100.0, "growth_score": 85.0,
         "recommendation": "Maintain priority stock levels. Highest revenue territory."},
        {"territory": "Batangas", "revenue_share": 0.2441, "abc_class": "A",
         "active_months": 54, "revenue_score": 67.7, "growth_score": 90.0,
         "recommendation": "High growth territory. Increase forward stock allocation."},
        {"territory": "Marinduque", "revenue_share": 0.2112, "abc_class": "B",
         "active_months": 43, "revenue_score": 58.6, "growth_score": 60.0,
         "recommendation": "Moderate priority. Monitor stock levels."},
        {"territory": "Camarines Norte", "revenue_share": 0.0768, "abc_class": "B",
         "active_months": 30, "revenue_score": 21.3, "growth_score": 55.0,
         "recommendation": "Emerging territory - 30 active months. Track growth."},
        {"territory": "Laguna", "revenue_share": 0.0420, "abc_class": "B",
         "active_months": 13, "revenue_score": 11.7, "growth_score": 40.0,
         "recommendation": "New territory (13 months). Pilot stock only."},
    ]
    territories = []
    for i, t in enumerate(raw):
        mcda = round(0.60 * t["revenue_score"] + 0.40 * t["growth_score"], 2)
        territories.append({**t, "outbreak_risk_index": 0.0, "mcda_score": mcda, "priority_rank": i + 1})
    return jsonify({
        "model_code": "MCDA_V1", "model_version": "1.0.0", "status": "scenario",
        "label": "SCENARIO - Review required before procurement action.",
        "weights": {"revenue": 0.60, "growth": 0.40, "outbreak_risk": 0.00},
        "weight_note": "Outbreak risk weight = 0 pending validated DOH territory-level data.",
        "data_period": "2021-2025", "territories": territories,
    })


@app.get("/eoq_scenarios")
def eoq_scenarios():
    """EOQ / ROP / Safety Stock scenario formulas. Status: SCENARIO - assumed cost parameters."""
    S = 500       # PHP ordering cost per order (assumed)
    h_pct = 0.15  # 15% holding cost per year (assumed)
    LT = 14       # lead time days (assumed)
    Z = 1.65      # 95% service level

    items = [
        {"category": "Antipyretics & Analgesics", "sku": "Paracetamol 500mg",
         "annual_demand": 37650, "unit_cost_php": 8.50},
        {"category": "Respiratory & Antitussives", "sku": "Salbutamol 2.5mg Nebule",
         "annual_demand": 30000, "unit_cost_php": 45.00},
        {"category": "Flood Prophylactics", "sku": "Doxycycline 100mg",
         "annual_demand": 10700, "unit_cost_php": 12.00},
        {"category": "Antibiotics & Anti-Infectives", "sku": "Co-Amoxiclav 625mg",
         "annual_demand": 20300, "unit_cost_php": 55.00},
        {"category": "Gastrointestinal & Rehydration", "sku": "ORS Packets",
         "annual_demand": 12900, "unit_cost_php": 5.50},
    ]
    results = []
    for it in items:
        D = it["annual_demand"]
        H = it["unit_cost_php"] * h_pct
        eoq = round(math.sqrt((2 * D * S) / H)) if H > 0 else 0
        daily_d = D / 365
        ss = round(Z * (daily_d * 0.25) * math.sqrt(LT))
        rop = round(daily_d * LT + ss)
        results.append({
            "category": it["category"], "representative_sku": it["sku"],
            "annual_demand_units": D, "assumed_unit_cost_php": it["unit_cost_php"],
            "eoq_units": eoq, "safety_stock_units": ss, "reorder_point_units": rop,
            "orders_per_year": round(D / eoq, 1) if eoq > 0 else None,
        })
    return jsonify({
        "model_code": "EOQ_ROP_SCENARIO_V1", "model_version": "1.0.0", "status": "scenario",
        "label": "SCENARIO - Assumed cost parameters. Not a procurement instruction. Requires live inventory, lead-time, and cost-policy data.",
        "assumptions": {
            "ordering_cost_php": S, "holding_cost_pct": h_pct,
            "lead_time_days": LT, "service_level_pct": 95, "demand_variability_pct": 25,
        },
        "formula": "EOQ=sqrt(2*D*S/H) | ROP=(D/365*LT)+SS | SS=Z*sigma_d*sqrt(LT)",
        "scenarios": results,
    })


if __name__ == "__main__":
    app.run(
        port=int(os.getenv("ANALYTICS_SERVICE_PORT", "5101")),
        debug=os.getenv("FLASK_DEBUG", "").strip().lower() in {"1", "true", "yes"},
        use_reloader=False,
    )
