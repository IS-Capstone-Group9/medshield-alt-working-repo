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


if __name__ == "__main__":
    app.run(
        port=int(os.getenv("PRODUCT_SERVICE_PORT", "5102")),
        debug=os.getenv("FLASK_DEBUG", "").strip().lower() in {"1", "true", "yes"},
        use_reloader=False,
    )
