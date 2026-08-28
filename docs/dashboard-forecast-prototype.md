# Dashboard Forecast Prototype & Logic

This document serves as the prototype implementation for the rolling 12-month forecast dashboard logic, including the exact TypeScript date calculations and a layout wireframe.

## 1. Time-Window & Calculation Logic (TypeScript)

Here is the exact TypeScript code to compute the date windows based on the provided explicit rules. It uses native `Date` objects and assumes local timezone consistency.

```typescript
/**
 * Computes all necessary time windows for the rolling 12-month DSS dashboard.
 * @param systemDate - The current system date (defaults to new Date())
 */
function computeDashboardWindows(systemDate: Date = new Date()) {
  const today = new Date(systemDate);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)

  // 1. Current Month Window
  const currentMonthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
  // Last day of current month (day 0 of next month is last day of current month)
  const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

  // 2. Historical Window
  // Ends at the last millisecond of the previous month
  const historicalEnd = new Date(currentMonthStart.getTime() - 1);

  // 3. Rolling 12-Month Forecast Window
  // Starts on the first day of the next month
  const forecastStart = new Date(currentYear, currentMonth + 1, 1, 0, 0, 0, 0);
  // Ends on the last day of the same month next year
  const rolling12MonthEnd = new Date(currentYear + 1, currentMonth + 1, 0, 23, 59, 59, 999);

  // 4. Annual / Multi-Year Forecast Window
  const currentYearStart = new Date(currentYear, 0, 1, 0, 0, 0, 0);
  const annualForecastEnd = new Date(currentYear + 3, 11, 31, 23, 59, 59, 999); // Dec 31, 3 years out

  return {
    today,
    currentMonthStart,
    currentMonthEnd,
    historicalEnd,
    forecastStart,
    rolling12MonthEnd,
    currentYearStart,
    annualForecastEnd
  };
}

// Example usage and unit testing of the roll behavior:
function testRollBehavior() {
  // Simulate system date: August 31, 2026, 23:59:59
  const lastSecondAugust = new Date(2026, 7, 31, 23, 59, 59);
  const beforeRoll = computeDashboardWindows(lastSecondAugust);
  
  console.log("--- Before Roll (August 2026) ---");
  console.log("Current Month Start:", beforeRoll.currentMonthStart.toISOString());
  console.log("Forecast Start:", beforeRoll.forecastStart.toISOString());

  // Simulate system date: September 1, 2026, 00:00:00
  const firstSecondSeptember = new Date(2026, 8, 1, 0, 0, 0);
  const afterRoll = computeDashboardWindows(firstSecondSeptember);
  
  console.log("\n--- After Roll (September 2026) ---");
  console.log("Current Month Start:", afterRoll.currentMonthStart.toISOString());
  console.log("Forecast Start:", afterRoll.forecastStart.toISOString());
}
```

## 2. API Forecast Request Payload

When requesting forecast data based on these computed windows:

```json
{
  "start_date": "2026-09-01T00:00:00.000Z", // Example forecast_start
  "end_date": "2027-08-31T23:59:59.999Z",   // Example rolling12MonthEnd
  "granularity": "monthly",
  "include_confidence_intervals": true,
  "model_version": "latest"
}
```

## 3. UI Wireframe Prototype

Below is a layout wireframe to serve as the structural prototype for the dashboard.

```text
+---------------------------------------------------------------------------------------------------+
|  [Logo] MedShield DSS                                   [Date Range: Custom ▼] [Profile: VP]      |
|  Status: 🟢 Data Health 100% | Model: v2.4 (Trained to Dec 2025)                                 |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  TOP-LEVEL KPIs                                                                                   |
|  +---------------------------+  +---------------------------+  +-------------------------------+  |
|  | Current MTD Actuals       |  | MoM % Change              |  | Current Month Forecast        |  |
|  | ₱ 45.2M                   |  | ▲ +5.2% vs prev month     |  | ₱ 52.8M (± 2.1M)              |  |
|  +---------------------------+  +---------------------------+  +-------------------------------+  |
|                                                                                                   |
|  MAIN CANVAS                                                                                      |
|  +--------------------------------+  +---------------------------------------------------------+  |
|  | CURRENT MONTH (Daily/Weekly)   |  | HISTORICAL & ROLLING 12-MONTH FORECAST                  |  |
|  | [Daily ▼]                      |  | [Monthly ▼]                                             |  |
|  |                                |  |                                                         |  |
|  |    |     |                     |  |  Historical (To Jul) | Forecast (Aug 2026 - Jul 2027)   |  |
|  |    |  |  |  |                  |  |         _--_         |            ,--' (Forecast)     |  |
|  | |  |  |  |  |                  |  |      _-'    `-_      |         _-'   [shaded bounds]  |  |
|  | |  |  |  |  |                  |  |   _-'          `-_   |      _-'                       |  |
|  | |__|__|__|__|___               |  | _'                `-_|   _-'                            |  |
|  | Aug1 Aug8 Aug15                |  | Jan  Feb  Mar  ...   | Sep Oct Nov ... Jul          |  |
|  +--------------------------------+  +---------------------------------------------------------+  |
|                                                                                                   |
|  SECONDARY CANVAS (ANNUAL & MULTI-YEAR FORECAST)                                                  |
|  +---------------------------------------------------------------------------------------------+  |
|  | YEAR-BY-YEAR TOTALS (Rolling 3-Year Projection)                                             |  |
|  |                                                                                             |  |
|  |  [ 2026 Actual + Fcst ]    [ 2027 Forecast ]    [ 2028 Forecast ]    [ 2029 Forecast ]      |  |
|  |  ₱ 480.5M                  ₱ 510.2M (±15M)      ₱ 540.8M (±25M)      ₱ 565.0M (±40M)        |  |
|  +---------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

### Key UI Features

- **Data Provenance Area**: Top status bar displays the `model_version` and the `data_cutoff_date` (e.g., Dec 2025).
- **Subtle Styling Cues**: The line chart for the "Historical & Rolling 12-Month Forecast" uses a solid line for historical actuals and a dashed line for the forecast, with a light shaded area for confidence bands.
- **Roll Notification**: An informational banner will appear when the month shifts to explain that the previous month has moved to historical data.
