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
| *(System Generated Default)* | PHO | CALABARZON | Quezon | Lucena City | Quezon Provincial Health Office |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Quezon | Lucena City | Lucena City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Candelaria | Candelaria Municipal Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Sampaloc | Sampaloc Municipal Health Office |
| A/R - Batangas - Gerardo Delos Reyes | Individual/A/R | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* | Gerardo Delos Reyes |
| A/R - Batangas - Norma Cabiliza | Individual/A/R | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* | Norma Cabiliza |
| A/R - Batangas - Ann Denise Codizal Pharmacy | Pharmacy | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* | Ann Denise Codizal Pharmacy |
| A/R - Batangas - Botika Estela | Pharmacy | CALABARZON | Batangas | Balayan *(Searched Location)* | Botika Estela |
| A/R - Batangas - DLR Pharmacy | Pharmacy | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* | DLR Pharmacy |
| A/R - Batangas - Maggie and Jojo/ JNJ Pharmacy | Pharmacy | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* | Maggie and Jojo/ JNJ Pharmacy |
| A/R - Batangas - Shooting Star Trading | Retail | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* | Shooting Star Trading |
| A/R - Batangas - Divine Care Hospital | Private Hospital | CALABARZON | Batangas | San Juan *(Searched Location)* | Divine Care Hospital |
| A/R - Quezon - Augustina Cabangon | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Augustina Cabangon |
| A/R - Quezon - Aurea Cadacio | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Aurea Cadacio |
| A/R - Quezon - Bridgette Inocencio | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Bridgette Inocencio |
| A/R - Quezon - Cherry Espinosa | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Cherry Espinosa |
| A/R - Quezon - Corazon Arroyo | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Corazon Arroyo |
| A/R - Quezon - Danilo Olitoquit | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Danilo Olitoquit |
| A/R - Quezon - Emeline Olaivar | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Emeline Olaivar |
| A/R - Quezon - Emma Zoleta | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Emma Zoleta |
| A/R - Quezon - Ester Vergara | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Ester Vergara |
| A/R - Quezon - Glenda Lao | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Glenda Lao |
| A/R - Quezon - Gloria Liwanag | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Gloria Liwanag |
| A/R - Quezon - Graciela Derada Deleon | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Graciela Derada Deleon |
| A/R - Quezon - Honorata Pañebe | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Honorata Pañebe |
| A/R - Quezon - Isabel Oliveros | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Isabel Oliveros |
| A/R - Quezon - Janice Mercado | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Janice Mercado |
| A/R - Quezon - Javierto Reynoso | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Javierto Reynoso |
| A/R - Quezon - Jesus Comia | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Jesus Comia |
| A/R - Quezon - Jing Marasigan | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Jing Marasigan |
| A/R - Quezon - Juanita Tan | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Juanita Tan |
| A/R - Quezon - Lanie Atienza | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Lanie Atienza |
| A/R - Quezon - Lelette Gamboa | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Lelette Gamboa |
| A/R - Quezon - Liza Defeo | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Liza Defeo |
| A/R - Quezon - Liza Maranan | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Liza Maranan |
| A/R - Quezon - Lovella Alava | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Lovella Alava |
| A/R - Quezon - Ma Victoria Ayag | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Ma Victoria Ayag |
| A/R - Quezon - Mary Aileen Morales | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Mary Aileen Morales |
| A/R - Quezon - Melissa Abbariao | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Melissa Abbariao |
| A/R - Quezon - Mercy Reyes | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Mercy Reyes |
| A/R - Quezon - Noemi Francisco | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Noemi Francisco |
| A/R - Quezon - Petronillo Faller | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Petronillo Faller |
| A/R - Quezon - Ramon Nieva | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Ramon Nieva |
| A/R - Quezon - Reggie Revilla | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Reggie Revilla |
| A/R - Quezon - Rodel Redor | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Rodel Redor |
| A/R - Quezon - Rodolfo Rañola | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Rodolfo Rañola |
| A/R - Quezon - Roly Dela Peña | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Roly Dela Peña |
| A/R - Quezon - Rosalina Bautista | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Rosalina Bautista |
| A/R - Quezon - Rufinita Soquilla | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Rufinita Soquilla |
| A/R - Quezon - Severina Escondo | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Severina Escondo |
| A/R - Quezon - Teresa Tan | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Teresa Tan |
| A/R - Quezon - BLB Botika | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | BLB Botika |
| A/R - Quezon - Bon Pharmacy | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Bon Pharmacy |
| A/R - Quezon - Century Drug | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Century Drug |
| A/R - Quezon - DCP Pharmacy | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | DCP Pharmacy |
| A/R - Quezon - Eastern Drug | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Eastern Drug |
| A/R - Quezon - Gumaca District Cooperative | Cooperative | CALABARZON | Quezon | Gumaca | Gumaca District Cooperative |
| A/R - Quezon - KKK Pharmacy | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | KKK Pharmacy |
| A/R - Quezon - Megawide | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Megawide |
| A/R - Quezon - Pagkatipunan Drugstore | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Pagkatipunan Drugstore |
| A/R - Quezon - Perez Drug | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Perez Drug |
| A/R - Quezon - RSV Pharmacy | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | RSV Pharmacy |
| A/R - Quezon - Vickys Pharmacy | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Vickys Pharmacy |
| A/R - Quezon - Winjoy Pharmacy | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Winjoy Pharmacy |
| A/R - Quezon - Ma. Cecile Aure | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Ma. Cecile Aure |
| A/R - Quezon - Cherrylyn Barola | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Cherrylyn Barola |
| A/R - Quezon - Mt Carmel General Hospital | Private Hospital | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Mt Carmel General Hospital |
| A/R - Quezon - RAKKK Prophet | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | RAKKK Prophet |
| A/R - Quezon - Herminia Laguador | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Herminia Laguador |
| A/R - Quezon - Madel Fetisa | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Madel Fetisa |
| A/R - Quezon - Constancia Catarroja | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Constancia Catarroja |
| A/R - Quezon - BEMONC RHU Sariaya | RHU | CALABARZON | Quezon | Sariaya | BEMONC RHU Sariaya |
| A/R - Quezon - Urbano Oliveros | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Urbano Oliveros |
| A/R - Quezon - Brgy Canda Health Center | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Brgy Canda Health Center |
| A/R - Quezon - Bricor Pharmacy | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Bricor Pharmacy |
| A/R - Quezon - Severina Nadres | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Severina Nadres |
| A/R - Quezon - AMCA Drug | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | AMCA Drug |
| A/R - Quezon - Dr Jessabeth Mercado | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Dr Jessabeth Mercado |
| A/R - Quezon - Dr. Florcerel Malay | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Dr. Florcerel Malay |
| A/R - Quezon - Dr. Teresa Tagarao | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Dr. Teresa Tagarao |
| A/R - Quezon - Dr. Victorino Araña | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Dr. Victorino Araña |
| A/R - Quezon - NSDR Birthing Home | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | NSDR Birthing Home |
| A/R - Quezon - Dr. Gilbert Lafuente | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Dr. Gilbert Lafuente |
| A/R - Quezon - Sampaloc Lying Inn | Lying Inn | CALABARZON | Quezon | Sampaloc | Sampaloc Lying Inn |
| A/R - Quezon - Unihealth Quezon (Medicine) | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Unihealth Quezon (Medicine) |
| A/R - Quezon - Tumbaga Birthing Home | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Tumbaga Birthing Home |
| A/R - Quezon - Brgy Health Station Sampaloc 1 | BHS | CALABARZON | Quezon | Sampaloc | Brgy Health Station Sampaloc 1 |
| A/R - Quezon - Raquel Samodio | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Raquel Samodio |
| A/R - Quezon - Asuncion Rañeses | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Asuncion Rañeses |
| A/R - Quezon - Lopez St Jude General Hospital | Private Hospital | CALABARZON | Quezon | Lopez | Lopez St Jude General Hospital |
| A/R - Quezon - Dra. Cherry Bacungan | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Dra. Cherry Bacungan |
| A/R - Quezon - Dr. Maribel Nosce | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Dr. Maribel Nosce |
| A/R - Quezon - Zoleta Birthing Home | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Zoleta Birthing Home |
| A/R - Quezon - Hiyasmin Birthing Home | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Hiyasmin Birthing Home |
| A/R - Quezon - Nativity of Jesus Birthing Clinic | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Nativity of Jesus Birthing Clinic |
| A/R - Quezon - Gulang Gulang National High School | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Gulang Gulang National High School |
| A/R - Hospital - Lucena MMG Hospital | Govt Hospital | CALABARZON | Quezon | Lucena City | Lucena MMG Hospital |
| A/R - Hospital - Peter Paul Medical Center of Candelaria | Govt Hospital | CALABARZON | Quezon | Candelaria | Peter Paul Medical Center of Candelaria |
| A/R - Hospital - Quezon Medical Center | Govt Hospital | CALABARZON | Quezon | Lucena City | Quezon Medical Center |
| A/R - Hospital - Unihealth Quezon (Hospital Medicines) | Govt Hospital | CALABARZON | Quezon | Lucena City | Unihealth Quezon (Hospital Medicines) |
| A/R - Hospital - Lucena United Doctors Hospital | Govt Hospital | CALABARZON | Quezon | Lucena City | Lucena United Doctors Hospital |
| A/R - D3 - LGU - Pagbilao | LGU | CALABARZON | Quezon | Pagbilao | Pagbilao |
| A/R - D3 - District - Bondoc Peninsula District Hospital, Catanauan | Govt Hospital | CALABARZON | Quezon | Catanauan | Bondoc Peninsula District Hospital, Catanauan |
| A/R - D3 - District - Candelaria Municipal Hospital, Candelaria | Govt Hospital | CALABARZON | Quezon | Candelaria | Candelaria Municipal Hospital, Candelaria |
| A/R - D3 - District - Guinyangan Medicare Community Hospital, Guinyangan | Govt Hospital | CALABARZON | Quezon | Guinyangan | Guinyangan Medicare Community Hospital, Guinyangan |
| A/R - D3 - District - Gumaca District Hospital, Gumaca | Govt Hospital | CALABARZON | Quezon | Gumaca | Gumaca District Hospital, Gumaca |
| A/R - D3 - District - Claro M. Recto District Hospital, Infanta | Govt Hospital | CALABARZON | Quezon | Infanta | Claro M. Recto District Hospital, Infanta |
| A/R - D3 - District - Doña Marta Memorial Hospital, Atimonan | Govt Hospital | CALABARZON | Quezon | Atimonan | Doña Marta Memorial Hospital, Atimonan |
| A/R - D3 - District - Mauban District Hospital, Mauban | Govt Hospital | CALABARZON | Quezon | Mauban | Mauban District Hospital, Mauban |
| A/R - D3 - District - Magsaysay Memorial District Hospital, Lopez | Govt Hospital | CALABARZON | Quezon | Lopez | Magsaysay Memorial District Hospital, Lopez |
| A/R - D3 - District - Maria Eleazar District Hospital, Tagkawayan | Govt Hospital | CALABARZON | Quezon | Tagkawayan | Maria Eleazar District Hospital, Tagkawayan |
| A/R - D3 - District - Polilio Medicare Hospital, Polilio | Govt Hospital | CALABARZON | Quezon | Polilio | Polilio Medicare Hospital, Polilio |
| A/R - D3 - District - Sampaloc Medicare Community Hospital, Sampaloc | Govt Hospital | CALABARZON | Quezon | Sampaloc | Sampaloc Medicare Community Hospital, Sampaloc |
| A/R - D3 - District - San Francisco Municipal Hospital, San Francisco | Govt Hospital | CALABARZON | Quezon | San Francisco | San Francisco Municipal Hospital, San Francisco |
| A/R - D3 - District - Unisan Medicare Community Hospital, Unisan | Govt Hospital | CALABARZON | Quezon | Unisan | Unisan Medicare Community Hospital, Unisan |
| A/R - D3 - District - IPHO | Govt | CALABARZON | Quezon | Lucena City | IPHO |
| A/R - D3 - District - Alabat Island District Hospital | Govt Hospital | CALABARZON | Quezon | Lucena City | Alabat Island District Hospital |
| A/R - D3 - District - Provincial Tourism Office | Govt | CALABARZON | Quezon | Lucena City | Provincial Tourism Office |
| **MIMAROPA (REGION IV-B)** | | | | | |
| *(System Generated Default)* | Regional Hub | MIMAROPA | Regional | Quezon City *(Logistical)* | DOH-CHD MIMAROPA |
| *(System Generated Default)* | PHO | MIMAROPA | Marinduque | Boac | Marinduque Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Boac | Boac Municipal Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Torrijos | Torrijos Municipal Health Office |
| *(System Generated Default)* | PHO | MIMAROPA | Palawan | Puerto Princesa | Palawan Provincial Health Office |
| *(System Generated Default)* | CHO/LGU | MIMAROPA | Palawan | Puerto Princesa | Puerto Princesa City Health Office |
| A/R - Marinduque - Arlene Nebreja | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Arlene Nebreja |
| A/R - Marinduque - Arlie Vertucio | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Arlie Vertucio |
| A/R - Marinduque - Catherine Sadiwa | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Catherine Sadiwa |
| A/R - Marinduque - Florito Aliasas | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Florito Aliasas |
| A/R - Marinduque - Imelda Parado | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Imelda Parado |
| A/R - Marinduque - Julia Masangkay | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Julia Masangkay |
| A/R - Marinduque - Lani Dela Santa | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Lani Dela Santa |
| A/R - Marinduque - Lorena Quing | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Lorena Quing |
| A/R - Marinduque - Manuel Narciso | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Manuel Narciso |
| A/R - Marinduque - Margarita Montellano | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Margarita Montellano |
| A/R - Marinduque - Rey Richard Sore | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Rey Richard Sore |
| A/R - Marinduque - Teodolfo Rejano | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Teodolfo Rejano |
| A/R - Marinduque - JRM - RMV Pharmacy | Pharmacy | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | RMV Pharmacy |
| A/R - Marinduque - MPH Cooperative | Cooperative | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | MPH Cooperative |
| A/R - Marinduque - St. Rose of Lima | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | St. Rose of Lima |
| A/R - Marinduque - WH Pharmacy | Pharmacy | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | WH Pharmacy |
| A/R - Marinduque - Torrijos Municipal Hall | Govt | MIMAROPA | Marinduque | Torrijos | Torrijos Municipal Hall |
| A/R - Marinduque - Provincial Government of Marinduque | Govt | MIMAROPA | Marinduque | Boac *(Provincial Capital Default)* | Provincial Government of Marinduque |
| A/R - Marinduque - Dr. Esmeralda Calayag | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Dr. Esmeralda Calayag |
| A/R - Marinduque - Dr. Alfred Saldaña | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Dr. Alfred Saldaña |
| A/R - Marinduque - Dr. Alex Cruz | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | Dr. Alex Cruz |
| A/R - Marinduque - L.Pergis Pharmacy | Pharmacy | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* | L.Pergis Pharmacy |
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
