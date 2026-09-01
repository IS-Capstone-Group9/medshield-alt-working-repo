"""Legacy MedShield Flask API gateway.

This file is retained for reference only. The canonical API gateway now
lives in ``backend/src`` as a TypeScript service.
"""

from __future__ import annotations

import json
import hashlib
import hmac
import os
import secrets
from json import JSONDecodeError
from pathlib import Path
import sys
from threading import Lock
from datetime import datetime, timezone
from typing import Any

import requests
from werkzeug.security import check_password_hash
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
LOCAL_AUTH_STORE = ROOT_DIR / "backend" / "data" / "local_accounts.json"
LOCAL_AUTH_LOCK = Lock()
LOCAL_SESSIONS: dict[str, dict[str, Any]] = {}


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


def auth_backend_unavailable(error: Exception) -> bool:
    """Return True when Supabase auth cannot be reached or rejects the project key."""
    if isinstance(error, (requests.ConnectionError, requests.Timeout)):
        return True

    response = getattr(error, "response", None)
    if response is None:
        return False

    if response.status_code not in {401, 403, 404, 429, 500, 502, 503, 504}:
        return False

    try:
        payload = response.json()
    except Exception:
        payload = {}

    message = " ".join(
        str(payload.get(field, "")) for field in ("message", "error", "hint")
    ).lower()
    if "invalid api key" in message:
        return True
    if "apikey" in message and "invalid" in message:
        return True
    if "jwt" in message and "invalid" in message:
        return True
    return response.status_code in {401, 403, 429, 502, 503, 504}


def _load_local_accounts() -> list[dict[str, Any]]:
    if not LOCAL_AUTH_STORE.exists():
        return []
    try:
        data = json.loads(LOCAL_AUTH_STORE.read_text(encoding="utf-8"))
    except JSONDecodeError:
        app.logger.warning("Local auth store is corrupt; starting with an empty account list.")
        return []
    if not isinstance(data, list):
        app.logger.warning("Local auth store is not a list; starting with an empty account list.")
        return []
    return [account for account in data if isinstance(account, dict)]


def _save_local_accounts(accounts: list[dict[str, Any]]) -> None:
    LOCAL_AUTH_STORE.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = LOCAL_AUTH_STORE.with_name(f"{LOCAL_AUTH_STORE.stem}.tmp")
    tmp_path.write_text(json.dumps(accounts, indent=2), encoding="utf-8")
    tmp_path.replace(LOCAL_AUTH_STORE)


def _serialize_account(account: dict[str, Any]) -> dict[str, Any]:
    return {
        "account_id": account["account_id"],
        "username": account["username"],
        "email": account["email"],
        "password_hash": account["password_hash"],
        "role": account.get("role", "viewer"),
        "is_active": bool(account.get("is_active", True)),
        "last_login_at": account.get("last_login_at"),
        "created_at": account.get("created_at"),
        "updated_at": account.get("updated_at"),
    }


def _check_password_hash(password_hash: str, password: str) -> bool:
    if not password_hash.startswith("scrypt:"):
        return check_password_hash(password_hash, password)

    try:
        params, salt, digest_hex = password_hash.split("$", 2)
        _, n_text, r_text, p_text = params.split(":", 3)
        expected = bytes.fromhex(digest_hex)
        derived = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt.encode("utf-8"),
            n=int(n_text),
            r=int(r_text),
            p=int(p_text),
            dklen=len(expected),
            maxmem=128 * 1024 * 1024,
        )
    except (ValueError, TypeError):
        return False

    return hmac.compare_digest(derived, expected)


def local_verify_login(username: str, password: str) -> dict[str, Any] | None:
    with LOCAL_AUTH_LOCK:
        accounts = _load_local_accounts()
        for account in accounts:
            if account.get("username") != username and account.get("email") != username:
                continue
            if not _check_password_hash(str(account.get("password_hash", "")), password):
                continue
            if not account.get("is_active", True):
                return {"error": "Account is disabled"}

            now = datetime.now(timezone.utc).isoformat()
            account["last_login_at"] = now
            account["updated_at"] = now
            try:
                _save_local_accounts(accounts)
            except OSError:
                app.logger.warning("Could not persist local account login metadata.")
            return {
                "account_id": account["account_id"],
                "username": account["username"],
                "email": account["email"],
                "role": account.get("role", "viewer"),
            }
    return None


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

    if supabase_enabled():
        return jsonify({
            "error": "Supabase login is served only by the TypeScript API gateway.",
            "code": "LEGACY_AUTH_GATEWAY_DISABLED",
        }), 503

    user = local_verify_login(username, password)
    if user is None:
        return jsonify({"error": "Invalid username or password"}), 401
    if user.get("error") == "Account is disabled":
        return jsonify({"error": "Account is disabled"}), 403
    access_token = secrets.token_urlsafe(32)
    LOCAL_SESSIONS[access_token] = user
    return jsonify({"access_token": access_token, "user": user})


def _local_session_user() -> dict[str, Any] | None:
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return None
    return LOCAL_SESSIONS.get(authorization[7:].strip())


@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    user = _local_session_user()
    if user is None:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"user": user})


@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    authorization = request.headers.get("Authorization", "")
    if authorization.startswith("Bearer "):
        LOCAL_SESSIONS.pop(authorization[7:].strip(), None)
    return jsonify({"ok": True})


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
