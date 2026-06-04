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
    limit = int(request.args.get("limit", 15))
    return jsonify(rows[:limit])


if __name__ == "__main__":
    app.run(port=int(os.getenv("PORT", "5102")), debug=True)
