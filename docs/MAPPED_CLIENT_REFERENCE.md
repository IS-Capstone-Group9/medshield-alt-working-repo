# MedShield Mapped Client List (Reference)

This document demonstrates how the unstructured raw client data (from the original PDF reference) is transformed into the structured geographic hierarchy required by the MedShield machine learning pipeline. 

By applying the fallback logic, all generic individual accounts and hospitals are anchored to a valid **LGU (City/Municipality)** for model computations, while preserving their original names as UI sub-tags. **To support this fallback logic, the baseline Regional, Provincial, and City/Municipal Health Offices are explicitly instantiated below.**

| Original Raw Client Name (From PDF) | Client Type | Region | Province | **`lgu_city_muni` (Model Anchor)** | **`ui_subtag` / Context** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CALABARZON (REGION IV-A)** | | | | | |
| *(System Generated Default)* | Regional Hub | CALABARZON | Regional | Quezon City *(Logistical)* | DOH-CHD CALABARZON |
| *(System Generated Default)* | PHO | CALABARZON | Batangas | Batangas City | Batangas Provincial Health Office |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Batangas | Batangas City | Batangas City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Juan | San Juan Municipal Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Balayan | Balayan Municipal Health Office |
| A/R - Batangas - Divine Care Hospital | Private Hospital | CALABARZON | Batangas | San Juan *(Searched Location)* | Divine Care Hospital |
| A/R - Batangas - Botika Estela | Pharmacy | CALABARZON | Batangas | Balayan *(Searched Location)* | Botika Estela |
| A/R - Batangas - Gerardo Delos Reyes | Individual/A/R | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* | Gerardo Delos Reyes |
| *(System Generated Default)* | PHO | CALABARZON | Quezon | Lucena City | Quezon Provincial Health Office |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Quezon | Lucena City | Lucena City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Candelaria | Candelaria Municipal Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Sampaloc | Sampaloc Municipal Health Office |
| A/R - Quezon - Mt Carmel General Hospital | Private Hospital | CALABARZON | Quezon | Lucena City | Mt Carmel General Hospital |
| A/R - Quezon - Brgy Health Station Sampaloc 1 | BHS | CALABARZON | Quezon | Sampaloc | Brgy. Sampaloc 1 |
| A/R - Quezon - BEMONC RHU Sariaya | RHU | CALABARZON | Quezon | Sariaya | RHU Sariaya |
| A/R - Quezon - Gumaca District Cooperative | Cooperative | CALABARZON | Quezon | Gumaca | Gumaca District Cooperative |
| A/R - Quezon - Emma Zoleta | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Emma Zoleta |
| A/R - Hospital - Lucena MMG Hospital | Govt Hospital | CALABARZON | Quezon | Lucena City | Lucena MMG Hospital |
| A/R - D3 - District - Candelaria Municipal Hosp. | Govt Hospital | CALABARZON | Quezon | Candelaria | Candelaria Municipal Hospital |
| A/R - D3 - District - Guinyangan Medicare Hosp. | Govt Hospital | CALABARZON | Quezon | Guinyangan | Guinyangan Medicare Hosp. |
| A/R - D3 - District - Claro M. Recto Dist. Hosp. | Govt Hospital | CALABARZON | Quezon | Infanta | Claro M. Recto Hosp. |
| **MIMAROPA (REGION IV-B)** | | | | | |
| *(System Generated Default)* | Regional Hub | MIMAROPA | Regional | Quezon City *(Logistical)* | DOH-CHD MIMAROPA |
| *(System Generated Default)* | PHO | MIMAROPA | Marinduque | Boac | Marinduque Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Boac | Boac Municipal Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Torrijos | Torrijos Municipal Health Office |
| A/R - Marinduque - Provincial Government | Govt | MIMAROPA | Marinduque | Boac *(Provincial Capital Default)* | Provincial Government |
| A/R - Marinduque - Torrijos Municipal Hall | LGU | MIMAROPA | Marinduque | Torrijos | Torrijos Municipal Hall |
| A/R - Marinduque - Arlene Nebreja | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Arlene Nebreja |
| *(System Generated Default)* | PHO | MIMAROPA | Palawan | Puerto Princesa | Palawan Provincial Health Office |
| *(System Generated Default)* | CHO/LGU | MIMAROPA | Palawan | Puerto Princesa | Puerto Princesa City Health Office |
| **BICOL (REGION V)** | | | | | |
| *(System Generated Default)* | Regional Hub | Bicol | Regional | Legazpi City | DOH-CHD Bicol |
| *(System Generated Default)* | PHO | Bicol | Albay | Legazpi City | Albay Provincial Health Office |
| *(System Generated Default)* | CHO/LGU | Bicol | Albay | Legazpi City | Legazpi City Health Office |
| *(System Generated Default)* | PHO | Bicol | Camarines Sur | Pili | Camarines Sur Provincial Health Office |
| *(System Generated Default)* | CHO/LGU | Bicol | Camarines Sur | Naga City | Naga City Health Office |

---

### How to use this mapped reference:
When importing new sales data, cross-reference the raw string (e.g., `"A/R - D3 - District - Candelaria Municipal Hospital"`) and explicitly extract the trailing town name (`"Candelaria"`) to populate the `lgu_city_muni` column. 

**4-Step Imputation Logic for Missing LGUs:**
1. **Searchable Real-World Location:** Find the actual physical LGU for known institutions (e.g., Botika Estela maps to **Balayan**).
2. **Missing specific client, but LGU is known in sales data:** Default to the City/Municipal Health Office (CHO) from the *System Generated Defaults*.
3. **Unsearchable Client (e.g., individual name) and only Province is known:** Default to the Provincial Health Office (PHO) from the *System Generated Defaults*.
4. **Unsearchable Client and only Region is known:** Default to the DOH Regional Hub (CHD) from the *System Generated Defaults*.
