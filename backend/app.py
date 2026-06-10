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


def supabase_rpc(function_name: str, params: dict) -> Any:
    """Call a Supabase Postgres RPC function via the REST API."""
    from services.shared_snapshot import supabase_base_url, supabase_headers
    url = f"{supabase_base_url()}/rest/v1/rpc/{function_name}"
    response = requests.post(url, headers=supabase_headers(), json=params, timeout=20)
    response.raise_for_status()
    return response.json()


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


@app.route("/api/auth/login", methods=["POST", "OPTIONS"])
def auth_login():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    body = request.get_json(force=True, silent=True) or {}
    username = (body.get("username") or "").strip()
    password = (body.get("password") or "").strip()

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if not supabase_enabled():
        return jsonify({"error": "Auth service unavailable"}), 503

    try:
        rows = supabase_rpc("verify_login", {"p_username": username, "p_password": password})
        if not rows:
            return jsonify({"error": "Invalid username or password"}), 401
        user = rows[0]
        if not user.get("is_active"):
            return jsonify({"error": "Account is disabled"}), 403
        return jsonify({
            "account_id": user["account_id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
        })
    except Exception as exc:
        app.logger.error("Login error: %s", exc)
        return jsonify({"error": "Authentication service error"}), 500


@app.route("/api/auth/signup", methods=["POST", "OPTIONS"])
def auth_signup():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    body = request.get_json(force=True, silent=True) or {}
    username = (body.get("username") or "").strip()
    email = (body.get("email") or "").strip()
    password = (body.get("password") or "").strip()

    if not username or not email or not password:
        return jsonify({"error": "Username, email and password are required"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if not supabase_enabled():
        return jsonify({"error": "Auth service unavailable"}), 503

    try:
        rows = supabase_rpc("create_account", {
            "p_username": username,
            "p_email": email,
            "p_password": password,
            "p_role": "viewer",
        })
        if not rows:
            return jsonify({"error": "Failed to create account"}), 500
        result = rows[0]
        if result.get("error_msg"):
            return jsonify({"error": result["error_msg"]}), 409
        return jsonify({
            "account_id": result["account_id"],
            "username": result["username"],
            "email": result["email"],
            "role": result["role"],
            "message": "Account created successfully",
        }), 201
    except Exception as exc:
        app.logger.error("Signup error: %s", exc)
        return jsonify({"error": "Account creation failed"}), 500


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
