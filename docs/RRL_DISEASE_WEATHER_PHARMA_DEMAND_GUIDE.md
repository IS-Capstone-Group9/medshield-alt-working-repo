# RRL Guide: Disease, Weather, And Pharmaceutical Demand

## Purpose

This guide helps frame the Review of Related Literature for MedShield's predictive logic: historical sales demand may be associated with disease conditions, weather conditions, seasonality, and local context, but the system must test those relationships before using them for forecasting.

Use this guide for Chapter 2 RRL, Chapter 3 methodology, and the explanation of why disease and weather signals are treated as external regressors or scenarios.

## Recommended RRL Argument

MedShield's forecasting problem is not just a generic sales forecast. Pharmaceutical demand can be affected by historical demand patterns, seasonality, disease activity, weather-linked health risks, and operational context. The RRL should therefore justify three ideas:

1. Historical sales are the baseline for demand forecasting.
2. Disease and weather variables are plausible external signals, especially for product groups linked to respiratory, infectious, emergency, or climate-sensitive conditions.
3. External signals must be validated against baseline forecasts before they are promoted, because correlation does not automatically prove causation.

## Literature Themes

| Theme | What the literature supports | How MedShield should use it |
|---|---|---|
| Pharmaceutical demand forecasting | Pharmaceutical demand is difficult because seasonality, disruptions, and context can make demand unstable. | Start with sales-only benchmark models, then compare advanced models. |
| Disease forecasting and health-service demand | Disease forecasts can support resource allocation and health-service planning by anticipating outbreaks or risk windows. | Use DOH data as historical disease-signal input, not as live outbreak surveillance unless current data exists. |
| Weather and disease relationship | Weather variables such as rainfall, temperature, humidity, and wind can relate to infectious disease patterns, including dengue in the Philippines. | Weather should be joined by territory and month, with lags tested where reasonable. |
| Weather and medicine demand | Climate-sensitive conditions may affect drug demand, and climate variables may improve demand models for specific therapeutic groups. | Treat weather as a challenger regressor or scenario input, not the main source of demand. |
| Sales data as health signal | Medication purchases can act as behavioral signals related to illness patterns and forecasting. | MedShield sales data can be studied as demand behavior, but should not be described as disease surveillance. |
| Explainable decision support | Forecasts must be interpretable enough to support planning decisions and inventory actions. | Publish model metrics, assumptions, limitations, and status with each forecast. |

## Source Notes For RRL

| Source | Key idea for MedShield | Suggested use |
|---|---|---|
| ASTHO, 2024, "Defining Disease Forecasting and Modeling" | Disease forecasting can describe potential outbreaks affecting population and demand for health services, and can guide resource allocation. | Use to justify why disease signals matter to planning, while keeping scope conservative. |
| Carvajal et al., 2018, BMC Infectious Diseases | Meteorological factors and lags were studied for dengue incidence in Metropolitan Manila; rainfall, humidity, and temperature are relevant candidates. | Use to justify testing weather features and lagged features in a Philippine context. |
| Dolan et al., 2023, Nature Communications | Non-prescription medication sales improved respiratory disease forecasting in local areas, showing sales behavior can contain health-signal value. | Use to justify analyzing product demand as a behavioral demand signal. |
| RAND, 2024, "Impact of Climate Change on Health and Drug Demand" | Climate-related disease burden may affect demand for drugs and supply planning. | Use to justify scenario-based planning for weather-sensitive demand. |
| Schisa and Farne, 2025, "The Impact of Climatic Factors on Respiratory Pharmaceutical Demand" | Climate variables were tested against respiratory pharmaceutical demand using forecasting models including Prophet, VARX, Random Forest, and LSTM. | Use cautiously as directly relevant but still external-context evidence. |
| Yahya et al., 2026, Frontiers in Artificial Intelligence | Pharmaceutical demand forecasting benefits from benchmark comparison, temporal holdout testing, and context-aware methods. | Use to justify model comparison, holdout evaluation, and explainability. |

## MedShield RRL Synthesis Paragraph

Use this as a draft paragraph:

> Prior literature supports the idea that pharmaceutical demand forecasting should not rely only on raw historical averages when external context may influence demand. Studies on pharmaceutical supply chains describe demand as sensitive to seasonality, disruptions, and local conditions. Public-health forecasting literature also shows that disease signals can support planning and resource allocation, while studies on dengue in the Philippines demonstrate that meteorological factors such as rainfall, temperature, humidity, and lag effects can be relevant to disease patterns. Related work on respiratory medication sales further suggests that product demand itself can contain useful behavioral health signals. For MedShield, these findings justify testing disease and weather variables as external regressors or scenario inputs. However, the system should treat sales-only forecasting as the required baseline and promote disease- or weather-adjusted models only when they improve holdout performance and remain interpretable for decision support.

## Methodological Implications

| RRL implication | System logic |
|---|---|
| Disease and weather may affect demand. | Build `fact_disease_signal` and `fact_weather_signal`, then join to sales by period and approved territory. |
| Effects may be delayed. | Test same-month and lagged features, such as one-month or two-month lag, where data coverage supports it. |
| Product groups differ. | Use therapeutic/product category mapping before claiming disease-product relationships. |
| Sales can be a health behavior signal. | Analyze product demand patterns, but do not call MedShield a disease surveillance system. |
| Forecast models need comparison. | Compare sales-only baseline, external-regressor challenger, and simple benchmarks. |
| External data may be incomplete. | Use scenario labels when future disease or weather values are assumed rather than observed. |

## Capstone Scope Wording

Use this wording:

> The study examined whether historical disease and weather signals could improve demand forecasting for pharmaceutical products. Historical sales remained the primary source of demand, while DOH disease records and weather observations were treated as external explanatory signals. The system did not claim to predict outbreaks or official weather alerts; instead, it evaluated whether these external variables improved forecasting performance or provided planning scenarios for decision support.

Avoid this wording:

- "The system proves weather causes pharmaceutical demand."
- "The system predicts disease outbreaks."
- "The system uses live PAGASA or live DOH alerts."
- "All product demand is disease-driven."

## Required Data For This RRL To Become Model Logic

1. Approved product master with therapeutic category and `is_medicine`.
2. Approved area mapping where territories are separated from customer types.
3. Historical DOH data by disease, region/province/city, and month.
4. Historical official PAGASA data where available.
5. Provider-derived weather proxy data clearly labeled when not official PAGASA.
6. Sales demand aggregated to the same grain as external data.
7. Holdout evaluation showing whether external regressors improve forecast accuracy.

## References

- ASTHO. (2024). Defining Disease Forecasting and Modeling. https://www.astho.org/topic/brief/defining-disease-forecasting-modeling/
- Carvajal, T. M., et al. (2018). Machine learning methods reveal the temporal pattern of dengue incidence using meteorological factors in metropolitan Manila, Philippines. BMC Infectious Diseases. https://link.springer.com/article/10.1186/s12879-018-3066-0
- Dolan, E., et al. (2023). Assessing the value of integrating national longitudinal shopping data into respiratory disease forecasting models. Nature Communications. https://www.nature.com/articles/s41467-023-42776-4
- RAND Corporation. (2024). Impact of Climate Change on Health and Drug Demand. https://www.rand.org/pubs/research_reports/RRA3425-1.html
- Schisa, V., & Farne, M. (2025). The Impact of Climatic Factors on Respiratory Pharmaceutical Demand: A Comparison of Forecasting Models for Greece. arXiv. https://arxiv.org/abs/2505.10642
- Yahya, K. Y., Safaei, M. S. M., & Al Dawsari, S. A. (2026). Hybrid machine learning forecasting for resilient and sustainable pharmaceutical supply chains under regulatory and seasonal disruption. Frontiers in Artificial Intelligence. https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2026.1803863/full
