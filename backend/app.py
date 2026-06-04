"""MedShield API gateway.

This service proxies requests to the microservices that own analytics
and product data. If the microservices are unavailable, it reads the
current warehouse views directly.
"""

from __future__ import annotations

import os
from json import JSONDecodeError
from pathlib import Path
import sys
from typing import Any

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from services.shared_snapshot import snapshot as warehouse_snapshot
from services.shared_snapshot import supabase_enabled


load_dotenv(ROOT_DIR / ".env")

app = Flask(__name__)
CORS(app)

ANALYTICS_SERVICE_URL = os.getenv("ANALYTICS_SERVICE_URL", "http://localhost:5101").rstrip("/")
PRODUCT_SERVICE_URL = os.getenv("PRODUCT_SERVICE_URL", "http://localhost:5102").rstrip("/")


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def service_get_json(base_url: str, path: str) -> Any:
    response = requests.get(f"{base_url}{path}", timeout=20)
    response.raise_for_status()
    try:
        return response.json()
    except JSONDecodeError as exc:  # pragma: no cover - defensive fallback
        raise RuntimeError(f"Invalid JSON response from {base_url}{path}") from exc


def load_from_services() -> dict[str, Any]:
    return {
        "totals": service_get_json(ANALYTICS_SERVICE_URL, "/summary"),
        "monthly": service_get_json(ANALYTICS_SERVICE_URL, "/monthly"),
        "by_area": service_get_json(ANALYTICS_SERVICE_URL, "/by_area"),
        "year_summary": service_get_json(ANALYTICS_SERVICE_URL, "/year_summary"),
        "seasonality": service_get_json(ANALYTICS_SERVICE_URL, "/seasonality"),
        "top_products": service_get_json(PRODUCT_SERVICE_URL, "/products?limit=15"),
    }


def load_snapshot() -> dict[str, Any]:
    try:
        return load_from_services()
    except Exception as exc:
        app.logger.warning("Microservices unavailable, falling back to shared data source: %s", exc)
    return warehouse_snapshot()


@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


@app.route("/api/summary", methods=["GET"])
def summary():
    data = load_snapshot()
    return jsonify(data["totals"])


@app.route("/api/monthly", methods=["GET"])
def monthly():
    data = load_snapshot()
    year = request.args.get("year")
    rows = data["monthly"]
    if year:
        rows = [row for row in rows if str(row.get("period", "")).startswith(year)]
    return jsonify(rows)


@app.route("/api/by_area", methods=["GET"])
def by_area():
    data = load_snapshot()
    return jsonify(data["by_area"])


@app.route("/api/products", methods=["GET"])
def products():
    data = load_snapshot()
    limit = int(request.args.get("limit", 15))
    return jsonify(data["top_products"][:limit])


@app.route("/api/year_summary", methods=["GET"])
def year_summary():
    data = load_snapshot()
    return jsonify(data["year_summary"])


@app.route("/api/seasonality", methods=["GET"])
def seasonality():
    data = load_snapshot()
    return jsonify(data["seasonality"])


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "MedShield API gateway",
        "architecture": "microservices",
        "source": "warehouse" if supabase_enabled() else "reference-export",
    })


if __name__ == "__main__":
    app.run(debug=env_bool("FLASK_DEBUG", True), port=int(os.getenv("PORT", "5000")))
