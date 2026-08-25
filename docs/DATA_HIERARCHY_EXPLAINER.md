# MedShield Data Hierarchy & Client Mapping Explainer

This document outlines the geographical and administrative data structure utilized by the MedShield Decision-Support System (DSS). It explains how raw, unstructured client data is mapped into a structured hierarchy to ensure statistical validity for machine learning models while retaining granular context for human operators.

## 1. Scope & Administrative Hierarchy
The MedShield system is strictly scoped to three regions in the Philippines:
- **CALABARZON (Region IV-A)**
- **MIMAROPA (Region IV-B)**
- **Bicol (Region V)**

*Note: Metro Manila (NCR) is excluded from the data scope. However, logistical deliveries or transactions assigned to regional hubs physically located in Quezon City (e.g., DOH-CHD CALABARZON, DOH-CHD MIMAROPA) are mapped to their respective service jurisdictions, not NCR.*

### Core Hierarchy Levels
The system enforces a 4-tier hierarchy for all incoming data:
1. **Region** (e.g., CALABARZON)
2. **Province** (e.g., Quezon)
3. **LGU / City / Municipality** (e.g., Lucena City) - **[Machine Learning Anchor]**
4. **Barangay** (e.g., Brgy. San Isidro) - **[UI Sub-tag]**

---

## 2. The LGU Anchor Strategy (Machine Learning)

**The Rule:** All 10 predictive and prescriptive models (Prophet, XGBoost, Linear Programming, etc.) explicitly `GROUP BY` the **LGU (City/Municipality)**. 

### Why the LGU Level?
- **Data Density:** There are approximately 350 LGUs across the three regions, providing a perfect matrix size for fast, accurate machine learning computations.
- **Preventing Sparsity:** If the models attempted to compute demand at the Barangay level (~11,000 barangays), the extreme data sparsity would cause models like Linear Programming and Cosine Similarity to crash or produce statistically insignificant noise.
- **Logistical Reality:** Pharmaceutical buffer stocks are typically deployed from Regional warehouses to Provincial or City Health Offices (CHO), making the LGU the most accurate terminus for system-level inventory allocation.

---

## 3. Handling Unassigned or Missing Clients

When raw data lacks an explicit LGU tag, MedShield utilizes a tiered imputation logic to ensure demand is still accurately recorded:

1. **Searchable Real-World Location (Primary Check):**
   - *Logic:* If the client is a known institution (hospital, pharmacy, or registered clinic), find its actual physical location.
   - *Example:* "Divine Care Hospital" in Batangas maps to **San Juan** (its actual LGU), not the provincial capital.
2. **Missing specific client, but LGU is known in Sales Report:**
   - *Default:* City/Municipal Health Office (CHO/MHO)
   - *Example:* 1,000 units sent to "Lucena" maps to Lucena CHO.
3. **Unsearchable Client (e.g., individual name) and only Province is known:**
   - *Default:* Provincial Health Office (PHO)
   - *Example:* "Gerardo Delos Reyes - Batangas" maps to the Batangas PHO (Batangas City).
4. **Unsearchable Client and only Region is known:**
   - *Default:* DOH Center for Health Development (CHD)
   - *Example:* 20,000 units allocated to "Bicol Buffer Stock" maps to DOH-CHD Bicol.

---

## 4. The Barangay "Sub-Tag" System (UI Context)

While the mathematical models ignore barangays to maintain stability, the **Dashboard UI** actively uses them to provide human operators with granular, actionable intelligence.

### How it Works:
- **Database Layer:** The database tracks the `lgu_city_muni` as a mandatory field for every row, and tracks the `barangay_subtag` as an optional, nullable metadata field.
- **Model Layer:** The Linear Programming optimizer calculates that **Puerto Princesa (LGU)** requires 9,000 units to handle a Dengue surge. It ignores the barangay metadata.
- **Dashboard Layer (Visual Mode):** The Procurement Officer clicks on the 9,000 unit allocation for Puerto Princesa. The UI queries the `barangay_subtag` data and displays a drill-down tooltip:
  > *"66% of recent Dengue demand in this LGU originated from Ospital ng Palawan (Brgy. San Pedro). Recommend prioritizing drop-offs at this facility."*

This hybrid architecture guarantees mathematical accuracy for the machine learning suite while empowering human operators with precise, street-level delivery intelligence.
