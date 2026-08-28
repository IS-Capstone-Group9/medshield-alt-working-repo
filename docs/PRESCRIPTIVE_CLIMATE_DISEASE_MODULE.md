# Prescriptive Climate-Disease Mapping Module & System Worker Assignments

**System:** MedShield Decision Support System (DSS)  
**Document Version:** 1.0.0  
**Status:** Canonical Capstone Specification (Chapter 3 Methodology & Architecture)  

---

## 1. Specialist Worker Role Matrix

Following the **Worker Operating Model** (`.agents/worker-operating-model.md`), the implementation of the Prescriptive Climate-Disease Mapping Module is sequenced across nine specialist roles:

| Specialist Role | Assigned Responsibility | Primary Output / Artifact |
|---|---|---|
| **Orchestrator** | Coordinates cross-layer sequencing between DOH/PAGASA data ingestion, microservices, and UI drill-down interactions. | Integration Roadmap & Milestone Gates |
| **Business Analyst** | Defines business goals, user stories, acceptance criteria, and capstone terminology for prescriptive decision support. | Chapter 3 Thesis Methodology Text |
| **Architect** | Designs system boundaries, data contracts (`/api/seasonal_restock_detail`), and microservice proxy routing. | `docs/ARCHITECTURE.md` System Contract |
| **Data Analyst** | Analyzes Philippine meteorological (PAGASA) and epidemiological (DOH PIDSR) correlations ($r=+0.548$ Leptospirosis, $r=+0.429$ Dengue). | Correlation Matrix & Feature Definitions |
| **BI Specialist** | Translates climate-disease risk metrics into scannable action cards and SKU drill-down tables. | Dashboard Action Card Layout Specs |
| **Backend Engineer** | Implements the Flask analytics endpoint (`/seasonal_restock_detail`) and Express Gateway proxy routing. | `services/analytics_service/app.py` & `server.ts` |
| **Frontend Engineer** | Builds interactive seasonal action cards, dynamic click-selection states, and responsive SKU drill-down table rendering. | `frontend/lib/medshieldReference.ts` |
| **Security Engineer** | Validates authenticated session access, input parameters, and data sanitization for API endpoints. | Role-Based Access Control Audit |
| **QA Engineer** | Executes end-to-end verification across API endpoints, data filtering, UI responsiveness, and zero-error builds. | Verification Test Log |

---

## 2. Chapter 3: Academic Methodology Text (Capstone Thesis Formulation)

> *Use the following academic text directly in your Capstone Paper (Chapter 3: System Methodology & Architecture):*

### 3.4 Prescriptive Climate-Disease Mapping Module

"The MedShield Decision Support System (DSS) introduces a **Prescriptive Climate-Disease Mapping Module**, transitioning the platform from predictive forecasting to actionable pharmaceutical supply chain optimization. The module utilizes a machine learning pipeline to correlate historical meteorological data—specifically PAGASA rainfall, temperature, and relative humidity indices—with localized epidemiological outbreak surveillance data from the Department of Health (DOH) Philippine Integrated Disease Surveillance and Response (PIDSR) framework.

By applying time-series forecasting algorithms (Prophet and Gradient Boosted Regressors), the DSS projects monthly disease case surges. A prescriptive rule-based engine subsequently translates epidemiological risk probabilities into specific pharmaceutical procurement recommendations. The system outputs dynamic restock schedules, targeted SKU categories, current stock levels, Economic Order Quantities (EOQ), Reorder Points (ROP), and urgency scores prior to the onset of identified seasonal health risks."

---

## 3. Epidemiological & Meteorological Baseline Matrix

| Season / Month Block | Climate Phase (PAGASA Trigger) | Epidemiological Risk (DOH PIDSR) | Prescribed Essential Medicine Categories | High-Priority SKUs |
|---|---|---|---|---|
| **Nov - Feb** | Amihan (Cool Dry Season) | Influenza-Like Illness (ILI), Asthma Exacerbations, SARI | Bronchodilators, Antihistamines, Corticosteroids | Salbutamol 2.5mg Nebules, Cetirizine 10mg, Paracetamol |
| **Mar & Apr** | Summer Peak Heat Surge | Acute Gastroenteritis, Dehydration, Typhoid Fever | Oral Rehydration Salts (ORS), Antidiarrheals, GI Meds | ORS Packets, Metronidazole 500mg, Omeprazole 40mg |
| **May & Jun** | Pre-Monsoon Thunderstorms | Early Dengue Onset, HFMD, Waterborne GI Outbreaks | Antipyretics, IV Fluids, Broad-Spectrum Antibiotics | Paracetamol 500mg, IV Normal Saline, Co-Amoxiclav 625mg |
| **Jul & Aug (CRITICAL)** | Peak Monsoon (Habagat) & Floods | Dengue Outbreaks, Leptospirosis Wave 1, Cholera | Flood Prophylactics, Dengue Antipyretics, IV Fluids | Doxycycline 100mg, Paracetamol 500mg, Cefuroxime |
| **Sep & Oct** | Late Typhoon & Post-Flood Siltation | Leptospirosis Wave 2, Dengue, Typhoid Fever | Anti-Leptospiral Meds, GI Anti-infectives, ORS | Doxycycline 100mg, Ciprofloxacin 500mg, ORS Packets |
| **Nov & Dec** | Cold Front & Holiday Peak | Flu/ILI, Pediatric Respiratory, Asthma Surge | Bronchodilators, Pediatric Syrups, Antitussives | Salbutamol Nebules, Carbocisteine Syrup, Amoxicillin |

---

## 4. Machine Learning Architecture Specification

### 4.1 Feature Engineering & Target Variables
- **Input Features ($X$):** `month_idx` (1–12), `rainfall_mm` (monthly accumulated), `avg_temp_c`, `humidity_pct`, `historical_disease_cases`.
- **Target Outputs ($y$):**
  - **Classification:** Predicted primary disease risk category (`Dengue`, `Leptospirosis`, `Gastroenteritis`, `ILI/Respiratory`).
  - **Regression:** Projected reorder volume (units) using EOQ formula $EOQ = \sqrt{\frac{2DS}{H}}$.

---

## 5. Python Machine Learning Proof of Concept Script

Below is the complete standalone Python script using `pandas` and `scikit-learn` (`RandomForestClassifier`) to demonstrate the module's machine learning baseline:

```python
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# 1. Generate Synthetic 3-Year Dataset (36 Months)
np.random.seed(42)
months = np.tile(np.arange(1, 13), 3)

rainfall_pattern = [110, 90, 60, 45, 140, 260, 420, 450, 380, 290, 180, 150]
rainfall = np.array(rainfall_pattern * 3) + np.random.normal(0, 20, 36)

temp_pattern = [26.5, 27.0, 28.5, 29.8, 29.5, 28.8, 27.9, 27.8, 28.0, 28.2, 27.5, 26.8]
temperature = np.array(temp_pattern * 3) + np.random.normal(0, 0.5, 36)

# Map target categories based on Philippine seasonal triggers
categories = []
for m in months:
    if m in [1, 2, 11, 12]:
        categories.append("Respiratory_Bronchodilator")
    elif m in [3, 4]:
        categories.append("Gastrointestinal_ORS")
    elif m in [5, 6]:
        categories.append("Antipyretic_DengueEarly")
    elif m in [7, 8]:
        categories.append("FloodProphylactic_Leptospirosis")
    else:
        categories.append("AntiInfective_TyphoonPostFlood")

df = pd.DataFrame({
    'month': months,
    'rainfall_mm': rainfall,
    'temp_c': temperature,
    'prescribed_category': categories
})

# 2. Train Random Forest Classifier
X = df[['month', 'rainfall_mm', 'temp_c']]
y = df['prescribed_category']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# 3. Sample Inference for Target Month (August: Rain=450mm, Temp=27.8C)
sample_input = pd.DataFrame([{'month': 8, 'rainfall_mm': 450.0, 'temp_c': 27.8}])
prediction = model.predict(sample_input)[0]
probs = model.predict_proba(sample_input)[0]
confidence = round(max(probs) * 100, 1)

print(f"Target Month: August (Habagat Monsoon)")
print(f"Predicted Restock Category: {prediction}")
print(f"Model Risk Confidence Score: {confidence}%")
```
