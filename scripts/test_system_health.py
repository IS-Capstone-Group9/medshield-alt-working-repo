"""
MedShield End-to-End System Health Check Script
Tests backend gateway (5000) and python microservices (5101/5102).
"""
import urllib.request
import json
import time

ENDPOINTS = [
    ("Express Gateway Health", "http://localhost:5000/api/health"),
    ("Summary KPIs", "http://localhost:5000/api/summary"),
    ("Monthly Trends", "http://localhost:5000/api/monthly"),
    ("Seasonal Epidemic Matrix", "http://localhost:5000/api/seasonal_epidemic_matrix"),
    ("Model Summary Suite", "http://localhost:5000/api/model_summary"),
    ("MCDA Territory Ranking", "http://localhost:5000/api/mcda_territories"),
    ("EOQ / ROP Scenarios", "http://localhost:5000/api/eoq_scenarios"),
    ("Procurement Orders (t+1, t+2)", "http://localhost:5000/api/procurement_orders"),
    ("Analytics Service Direct Health", "http://localhost:5101/health"),
    ("Product Service Direct Health", "http://localhost:5102/health"),
]

print("=== STARTING MEDSHIELD ENDPOINTS HEALTH TEST ===")
success_count = 0
for name, url in ENDPOINTS:
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.status
            data = json.loads(response.read().decode('utf-8'))
            print(f"[OK] {name} ({url}) -> Status {status} | Items: {len(data) if isinstance(data, list) else 'Object'}")
            success_count += 1
    except Exception as e:
        print(f"[FAIL] {name} ({url}) -> Error: {e}")

print(f"\nResult: {success_count}/{len(ENDPOINTS)} endpoints responded successfully.")
