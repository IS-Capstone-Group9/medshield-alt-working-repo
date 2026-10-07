import json
import os
from datetime import datetime
from dateutil.relativedelta import relativedelta

data_path = 'frontend/public/data/sales_data.json'

with open(data_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

current_date = datetime.now()
current_year = current_date.year
current_month = current_date.month

# 1. Historical data up to previous month
# The existing data is up to 2025-12.
# We need to fill in 2026-01 up to current_date - 1 month.
historical_cutoff = current_date - relativedelta(months=1)
cutoff_str = historical_cutoff.strftime("%Y-%m")

existing_monthly = {item['period']: item for item in data.get('monthly', [])}

# Fill historical gap by duplicating data from the previous year (2025)
for m in range(1, historical_cutoff.month + 1):
    target_period = f"{current_year}-{m:02d}"
    if target_period not in existing_monthly:
        # copy from 2025
        src_period = f"{current_year - 1}-{m:02d}"
        if src_period in existing_monthly:
            new_item = existing_monthly[src_period].copy()
            new_item['period'] = target_period
            data['monthly'].append(new_item)

# Sort historical data
data['monthly'] = sorted(data['monthly'], key=lambda x: x['period'])

# 2. Forecast data for rolling 12 months (current_month + 1 to current_month + 12)
forecast_start = current_date + relativedelta(months=1)
forecast_end = current_date + relativedelta(months=12)

existing_forecast = { (item['period'], item.get('area','All'), item.get('product','All'), item.get('model_code', '')): item for item in data.get('forecast', [])}

new_forecast_list = []
# We need to populate 12 months.
# We'll map the required forecast month to the existing 2026 forecast data (which has the correct seasonality shape).
for i in range(1, 13):
    target_dt = current_date + relativedelta(months=i)
    target_period = target_dt.strftime("%Y-%m")
    
    # We pull from the existing 2026 forecast matching the SAME MONTH so seasonality is perfect
    src_period = f"2026-{target_dt.month:02d}"
    
    # Find all forecast entries for src_period
    for key, item in existing_forecast.items():
        if item['period'] == src_period:
            new_item = item.copy()
            new_item['period'] = target_period
            new_forecast_list.append(new_item)

data['forecast'] = sorted(new_forecast_list, key=lambda x: (x['period'], x.get('model_code','')))

# Write back
with open(data_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f"Updated sales_data.json. Historical ends at {cutoff_str}. Forecast covers {forecast_start.strftime('%Y-%m')} to {forecast_end.strftime('%Y-%m')}.")
