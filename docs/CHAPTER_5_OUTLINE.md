# Chapter 5: Summary, Conclusions, and Recommendations

This chapter synthesizes the research findings from the design, implementation, and evaluation of the MedShield Decision Support System (DSS). It summarizes the overall study, draws research conclusions linked directly to the primary North Star inventory optimization question, and presents actionable recommendations for both operational deployment and future academic research.

---

## 5.1. Summary of the Study

### 5.1.1. Context and Problem Statement
* **Description:** Recapitulate the operational challenges that motivated this capstone project.
* **Key Focus Areas:**
    * The inefficiencies of legacy, spreadsheet-based inventory management.
    * The financial and operational impact of medicine expiry, stockouts, and dead stock.
    * The lack of integration between external environmental signals (weather, disease outbreaks) and the procurement cycle.

### 5.1.2. The MedShield Decision Support System (DSS) Solution
* **Description:** Summarize the architecture and components developed to solve the problem.
* **Key Focus Areas:**
    * **Data Layer:** Supabase data warehouse implementing clean ETL lineage and margin anomaly filters.
    * **Service Layer (Descriptive & Predictive):** Python services executing STL seasonal decomposition, Facebook Prophet time-series forecasting (with Disease Load Index and Rainfall Severity Index regressors), and XGBoost prioritization/classification models.
    * **Prescriptive Engine:** Cost-minimization calculations (EOQ, Safety Stock, ROP) and constraint-based resource allocation using Linear Programming (LP) and Multi-Criteria Decision Analysis (MCDA).
    * **User Interface:** A Next.js-based executive web application exposing dynamic visual metrics and override logs.

---

## 5.2. Conclusions
*This section provides answers to the primary research questions based on the results documented in Chapter 4.*

### 5.2.1. Addressing the North Star Inventory Optimization Question
* **Description:** Formulate conclusions detailing how the integrated analytical modules directly optimize inventory and reduce losses.
* **Key Focus Areas:**
    * **Role of Descriptive Analytics:** How establishing a clean baseline (such as resolving bulk contract allocations and identifying 80/20 revenue bands) prevents historical demand distortion.
    * **Role of Predictive Analytics:** How integrating leading indicators (DLI and RSI) into time-series forecasting models minimizes stockouts during peak disease and weather seasons.
    * **Role of Prescriptive Analytics:** How translating forecasts into concrete order triggers (ROP) and cost-minimized quantities (EOQ) prevents over-procurement, while LP ensures efficient stock distribution under capacity limits.

### 5.2.2. Value of Signal Integration and Anomaly Overrides
* **Description:** Conclude on the performance gains achieved by incorporating meteorological, epidemiological, and emergency override mechanisms.
* **Key Focus Areas:**
    * The statistical validity and error-reduction rates when using weather and disease covariates versus standard historical forecasting.
    * The necessity of rule-based emergency overrides (such as PAGASA typhoon warnings doubling safety stock levels) to manage low-probability, high-impact supply disruptions.

### 5.2.3. Prevention of Procurement Loss via Dead-Stock Flagging
* **Description:** Conclude on the system's ability to reduce holding costs and waste.
* **Key Focus Areas:**
    * The utility of combining predictive XGBoost ABC classifications with low-velocity checks to flag inactive Class C products before new procurement orders are approved.

---

## 5.3. Recommendations & Future Work
*This section outlines actionable guidelines for the operationalization of the DSS and paths for future study.*

### 5.3.1. Technical and Operational Implementation Guidelines
* **Description:** Actionable steps for MedShield to transition the DSS from a capstone prototype to live production.
* **Recommendations:**
    * **ERP Integration:** Integrate the Supabase data warehouse directly with MedShield's live ERP and supplier inventory portals for real-time transactional updates.
    * **Automated Data Feeds:** Establish direct API connectors with official Department of Health (DOH) disease registries and PAGASA weather stations to eliminate manual upload steps.
    * **User Training & Audit Logging:** Institutionalize planner training for the manual override interface, enforcing the immutable audit log policy for comment captures.

### 5.3.2. Future Academic Research & Model Enhancements
* **Description:** Identify areas where future researchers can expand upon the methodologies established in this study.
* **Recommendations:**
    * **Dynamic Lead-Time Modeling:** Apply machine learning algorithms (such as Random Forests or Recurrent Neural Networks) to predict shipping and customs delays as a function of forecast storm severity index scores.
    * **Advanced Optimization Algorithms:** Transition the prescriptive engine from linear programming to stochastic programming models that explicitly optimize under forecast uncertainty intervals.
    * **Multi-Echelon Inventory Optimization:** Expand the prescriptive scope from single-warehouse calculations to multi-echelon networks, optimizing stock levels across central, regional, and municipal storage hubs simultaneously.
