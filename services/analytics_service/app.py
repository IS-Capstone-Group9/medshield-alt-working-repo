from __future__ import annotations

import os
import sys
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS


ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from services.shared_snapshot import snapshot


app = Flask(__name__)
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


if __name__ == "__main__":
    app.run(port=int(os.getenv("PORT", "5101")), debug=True)
