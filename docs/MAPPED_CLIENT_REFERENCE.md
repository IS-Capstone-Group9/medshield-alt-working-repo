# MedShield Mapped Client List (Reference)

This document demonstrates how the unstructured raw client data (from the original PDF reference) is transformed into the structured geographic hierarchy required by the MedShield machine learning pipeline. 

By applying the fallback logic, all generic individual accounts and hospitals are anchored to a valid **LGU (City/Municipality)** for model computations, while preserving their original names as UI sub-tags. **To support this fallback logic, the baseline Regional, Provincial, and City/Municipal Health Offices are explicitly instantiated below.**

| Original Raw Client Name (From PDF) | Client Type | Region | Province | **`lgu_city_muni` (Model Anchor)** | **`ui_subtag` / Context** |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CALABARZON** | | | | | |
| *(System Generated Default)* | Regional Hub | CALABARZON | Regional | Quezon City *(Logistical)* | DOH-CHD CALABARZON |
| *(System Generated Default)* | PHO | CALABARZON | Batangas | Batangas City | Batangas Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Agoncillo | Agoncillo Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Alitagtag | Alitagtag Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Balayan | Balayan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Balete | Balete Health Office |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Batangas | Batangas City | Batangas City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Bauan | Bauan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Calaca | Calaca Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Calatagan | Calatagan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Cuenca | Cuenca Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Ibaan | Ibaan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Laurel | Laurel Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Lemery | Lemery Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Lian | Lian Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Lipa | Lipa Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Lobo | Lobo Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Mabini | Mabini Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Malvar | Malvar Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Mataasnakahoy | Mataasnakahoy Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Nasugbu | Nasugbu Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Padre Garcia | Padre Garcia Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Rosario | Rosario Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Jose | San Jose Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Juan | San Juan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Luis | San Luis Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Nicolas | San Nicolas Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Pascual | San Pascual Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Santa Teresita | Santa Teresita Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Santo Tomas | Santo Tomas Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Taal | Taal Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Talisay | Talisay Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Tanauan | Tanauan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Taysan | Taysan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Tingloy | Tingloy Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Tuy | Tuy Health Office |
| A/R - Batangas - Gerardo Delos Reyes | Individual/A/R | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* | Gerardo Delos Reyes |
| A/R - Batangas - Norma Cabiliza | Individual/A/R | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* | Norma Cabiliza |
| A/R - Batangas - Ann Denise Codizal Pharmacy | Pharmacy | CALABARZON | Batangas | Balayan *(Searched Location)* | Ann Denise Codizal Pharmacy |
| A/R - Batangas - Botika Estela | Pharmacy | CALABARZON | Batangas | Balayan *(Searched Location)* | Botika Estela |
| A/R - Batangas - DLR Pharmacy | Pharmacy | CALABARZON | Batangas | Calatagan *(Searched Location)* | DLR Pharmacy |
| A/R - Batangas - Maggie and Jojo/ JNJ Pharmacy | Pharmacy | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* | Maggie and Jojo/ JNJ Pharmacy |
| A/R - Batangas - Shooting Star Trading | Retail | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* | Shooting Star Trading |
| A/R - Batangas - Divine Care Hospital | Private Hospital | CALABARZON | Batangas | San Juan *(Searched Location)* | Divine Care Hospital |
| *(System Generated Default)* | PHO | CALABARZON | Cavite | Trece Martires | Cavite Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Alfonso | Alfonso Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Amadeo | Amadeo Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Bacoor | Bacoor Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Carmona | Carmona Health Office |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | Cavite City | Cavite City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Dasmariñas | Dasmariñas Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | General Emilio Aguinaldo | General Emilio Aguinaldo Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | General Mariano Alvarez | General Mariano Alvarez Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | General Trias | General Trias Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Imus | Imus Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Indang | Indang Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Kawit | Kawit Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Magallanes | Magallanes Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Maragondon | Maragondon Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Mendez | Mendez Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Naic | Naic Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Noveleta | Noveleta Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Rosario | Rosario Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Silang | Silang Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Tagaytay | Tagaytay Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Tanza | Tanza Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Ternate | Ternate Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Trece Martires | Trece Martires Health Office |
| *(System Generated Default)* | PHO | CALABARZON | Laguna | Santa Cruz | Laguna Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Alaminos | Alaminos Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Bay | Bay Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Biñan | Biñan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Cabuyao | Cabuyao Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Calamba | Calamba Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Calauan | Calauan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Cavinti | Cavinti Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Famy | Famy Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Kalayaan | Kalayaan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Liliw | Liliw Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Los Baños | Los Baños Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Luisiana | Luisiana Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Lumban | Lumban Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Mabitac | Mabitac Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Magdalena | Magdalena Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Majayjay | Majayjay Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Nagcarlan | Nagcarlan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Paete | Paete Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Pagsanjan | Pagsanjan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Pakil | Pakil Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Pangil | Pangil Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Pila | Pila Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Rizal | Rizal Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | San Pablo | San Pablo Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | San Pedro | San Pedro Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Santa Cruz | Santa Cruz Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Santa Maria | Santa Maria Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Santa Rosa | Santa Rosa Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Siniloan | Siniloan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Victoria | Victoria Health Office |
| *(System Generated Default)* | PHO | CALABARZON | Quezon | Lucena City | Quezon Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Agdangan | Agdangan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Alabat | Alabat Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Atimonan | Atimonan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Buenavista | Buenavista Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Burdeos | Burdeos Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Calauag | Calauag Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Candelaria | Candelaria Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Catanauan | Catanauan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Dolores | Dolores Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | General Luna | General Luna Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | General Nakar | General Nakar Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Guinayangan | Guinayangan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Gumaca | Gumaca Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Infanta | Infanta Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Jomalig | Jomalig Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Lopez | Lopez Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Lucban | Lucban Health Office |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Quezon | Lucena City | Lucena City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Macalelon | Macalelon Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Mauban | Mauban Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Mulanay | Mulanay Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Padre Burgos | Padre Burgos Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Pagbilao | Pagbilao Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Panukulan | Panukulan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Patnanungan | Patnanungan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Perez | Perez Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Pitogo | Pitogo Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Plaridel | Plaridel Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Polillo | Polillo Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Quezon | Quezon Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Real | Real Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Sampaloc | Sampaloc Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | San Andres | San Andres Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | San Antonio | San Antonio Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | San Francisco | San Francisco Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | San Narciso | San Narciso Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Sariaya | Sariaya Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Tagkawayan | Tagkawayan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Tayabas | Tayabas Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Tiaong | Tiaong Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Unisan | Unisan Health Office |
| A/R - Quezon - Augustina Cabangon | Govt Hospital | CALABARZON | Quezon | Lucena City *(Searched Location)* | Augustina Cabangon |
| A/R - Quezon - Aurea Cadacio | BHS / Midwife | CALABARZON | Quezon | Sariaya *(Searched Location)* | Aurea Cadacio |
| A/R - Quezon - Bridgette Inocencio | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Bridgette Inocencio |
| A/R - Quezon - Cherry Espinosa | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Cherry Espinosa |
| A/R - Quezon - Corazon Arroyo | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Corazon Arroyo |
| A/R - Quezon - Danilo Olitoquit | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Danilo Olitoquit |
| A/R - Quezon - Emeline Olaivar | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Emeline Olaivar |
| A/R - Quezon - Emma Zoleta | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Emma Zoleta |
| A/R - Quezon - Ester Vergara | Clinic | CALABARZON | Quezon | Candelaria *(Searched Location)* | Ester Vergara |
| A/R - Quezon - Glenda Lao | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Glenda Lao |
| A/R - Quezon - Gloria Liwanag | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Gloria Liwanag |
| A/R - Quezon - Graciela Derada Deleon | Clinic | CALABARZON | Quezon | Tayabas *(Searched Location)* | Graciela Derada Deleon |
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
| A/R - Quezon - Petronillo Faller | Clinic | CALABARZON | Quezon | Lucban *(Searched Location)* | Petronillo Faller |
| A/R - Quezon - Ramon Nieva | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Ramon Nieva |
| A/R - Quezon - Reggie Revilla | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Reggie Revilla |
| A/R - Quezon - Rodel Redor | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Rodel Redor |
| A/R - Quezon - Rodolfo Rañola | Clinic | CALABARZON | Quezon | Lucban *(Searched Location)* | Rodolfo Rañola |
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
| A/R - Quezon - Mt Carmel General Hospital | Private Hospital | CALABARZON | Quezon | Lucena City | Mt Carmel General Hospital |
| A/R - Quezon - RAKKK Prophet | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | RAKKK Prophet |
| A/R - Quezon - Herminia Laguador | Clinic | CALABARZON | Quezon | Lucban *(Searched Location)* | Herminia Laguador |
| A/R - Quezon - Madel Fetisa | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Madel Fetisa |
| A/R - Quezon - Constancia Catarroja | RHU/MHO | CALABARZON | Quezon | Sariaya *(Searched Location)* | Constancia Catarroja |
| A/R - Quezon - BEMONC RHU Sariaya | RHU | CALABARZON | Quezon | Sariaya | BEMONC RHU Sariaya |
| A/R - Quezon - Urbano Oliveros | Clinic | CALABARZON | Quezon | Lucena City *(Searched Location)* | Urbano Oliveros |
| A/R - Quezon - Brgy Canda Health Center | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Brgy Canda Health Center |
| A/R - Quezon - Bricor Pharmacy | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Bricor Pharmacy |
| A/R - Quezon - Severina Nadres | Clinic | CALABARZON | Quezon | Tayabas *(Searched Location)* | Severina Nadres |
| A/R - Quezon - AMCA Drug | Pharmacy | CALABARZON | Quezon | Catanauan *(Searched Location)* | AMCA Drug |
| A/R - Quezon - Dr Jessabeth Mercado | Govt Hospital | CALABARZON | Quezon | Lucena City *(Searched Location)* | Dr Jessabeth Mercado |
| A/R - Quezon - Dr. Florcerel Malay | Private Hospital | CALABARZON | Quezon | Sariaya *(Searched Location)* | Dr. Florcerel Malay |
| A/R - Quezon - Dr. Teresa Tagarao | Private Hospital | CALABARZON | Quezon | Lopez *(Searched Location)* | Dr. Teresa Tagarao |
| A/R - Quezon - Dr. Victorino Araña | RHU | CALABARZON | Quezon | Lucban *(Searched Location)* | Dr. Victorino Araña |
| A/R - Quezon - NSDR Birthing Home | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | NSDR Birthing Home |
| A/R - Quezon - Dr. Gilbert Lafuente | Clinic | CALABARZON | Quezon | Padre Burgos *(Searched Location)* | Dr. Gilbert Lafuente |
| A/R - Quezon - Sampaloc Lying Inn | Lying Inn | CALABARZON | Quezon | Sampaloc | Sampaloc Lying Inn |
| A/R - Quezon - Unihealth Quezon (Medicine) | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Unihealth Quezon (Medicine) |
| A/R - Quezon - Tumbaga Birthing Home | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Tumbaga Birthing Home |
| A/R - Quezon - Brgy Health Station Sampaloc 1 | BHS | CALABARZON | Quezon | Sampaloc | Brgy Health Station Sampaloc 1 |
| A/R - Quezon - Raquel Samodio | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Raquel Samodio |
| A/R - Quezon - Asuncion Rañeses | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Asuncion Rañeses |
| A/R - Quezon - Lopez St Jude General Hospital | Private Hospital | CALABARZON | Quezon | Lopez | Lopez St Jude General Hospital |
| A/R - Quezon - Dra. Cherry Bacungan | Private Hospital | CALABARZON | Quezon | Lucena City *(Searched Location)* | Dra. Cherry Bacungan |
| A/R - Quezon - Dr. Maribel Nosce | Clinic | CALABARZON | Quezon | Lucena City *(Searched Location)* | Dr. Maribel Nosce |
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
| A/R - D3 - District - Guinyangan Medicare Community Hospital, Guinyangan | Govt Hospital | CALABARZON | Quezon | Guinayangan | Guinyangan Medicare Community Hospital, Guinyangan |
| A/R - D3 - District - Gumaca District Hospital, Gumaca | Govt Hospital | CALABARZON | Quezon | Gumaca | Gumaca District Hospital, Gumaca |
| A/R - D3 - District - Claro M. Recto District Hospital, Infanta | Govt Hospital | CALABARZON | Quezon | Infanta | Claro M. Recto District Hospital, Infanta |
| A/R - D3 - District - Doña Marta Memorial Hospital, Atimonan | Govt Hospital | CALABARZON | Quezon | Atimonan | Doña Marta Memorial Hospital, Atimonan |
| A/R - D3 - District - Mauban District Hospital, Mauban | Govt Hospital | CALABARZON | Quezon | Mauban | Mauban District Hospital, Mauban |
| A/R - D3 - District - Magsaysay Memorial District Hospital, Lopez | Govt Hospital | CALABARZON | Quezon | Lopez | Magsaysay Memorial District Hospital, Lopez |
| A/R - D3 - District - Maria Eleazar District Hospital, Tagkawayan | Govt Hospital | CALABARZON | Quezon | Tagkawayan | Maria Eleazar District Hospital, Tagkawayan |
| A/R - D3 - District - Polilio Medicare Hospital, Polilio | Govt Hospital | CALABARZON | Quezon | Polillo | Polilio Medicare Hospital, Polilio |
| A/R - D3 - District - Sampaloc Medicare Community Hospital, Sampaloc | Lying Inn | CALABARZON | Quezon | Sampaloc | Sampaloc Medicare Community Hospital, Sampaloc |
| A/R - D3 - District - San Francisco Municipal Hospital, San Francisco | Govt Hospital | CALABARZON | Quezon | San Francisco | San Francisco Municipal Hospital, San Francisco |
| A/R - D3 - District - Unisan Medicare Community Hospital, Unisan | Govt Hospital | CALABARZON | Quezon | Unisan | Unisan Medicare Community Hospital, Unisan |
| A/R - D3 - District - IPHO | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | IPHO |
| A/R - D3 - District - Alabat Island District Hospital | Govt Hospital | CALABARZON | Quezon | Alabat | Alabat Island District Hospital |
| A/R - D3 - District - Provincial Tourism Office | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* | Provincial Tourism Office |
| *(System Generated Default)* | PHO | CALABARZON | Rizal | Antipolo | Rizal Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Angono | Angono Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Antipolo | Antipolo Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Baras | Baras Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Binangonan | Binangonan Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Cainta | Cainta Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Cardona | Cardona Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Jalajala | Jalajala Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Morong | Morong Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Pililla | Pililla Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Rodriguez | Rodriguez Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | San Mateo | San Mateo Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Tanay | Tanay Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Taytay | Taytay Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Teresa | Teresa Health Office |
| **MIMAROPA** | | | | | |
| *(System Generated Default)* | Regional Hub | MIMAROPA | Regional | Quezon City *(Logistical)* | DOH-CHD MIMAROPA |
| *(System Generated Default)* | PHO | MIMAROPA | Marinduque | Boac | Marinduque Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Boac | Boac Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Buenavista | Buenavista Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Gasan | Gasan Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Mogpog | Mogpog Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Santa Cruz | Santa Cruz Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Torrijos | Torrijos Health Office |
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
| *(System Generated Default)* | PHO | MIMAROPA | Occidental Mindoro | Mamburao | Occidental Mindoro Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Abra de Ilog | Abra de Ilog Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Calintaan | Calintaan Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Looc | Looc Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Lubang | Lubang Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Magsaysay | Magsaysay Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Mamburao | Mamburao Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Paluan | Paluan Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Rizal | Rizal Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Sablayan | Sablayan Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | San Jose | San Jose Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Santa Cruz | Santa Cruz Health Office |
| *(System Generated Default)* | PHO | MIMAROPA | Oriental Mindoro | Calapan | Oriental Mindoro Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Baco | Baco Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Bansud | Bansud Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Bongabong | Bongabong Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Bulalacao | Bulalacao Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Calapan | Calapan Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Gloria | Gloria Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Mansalay | Mansalay Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Naujan | Naujan Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Pinamalayan | Pinamalayan Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Pola | Pola Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Puerto Galera | Puerto Galera Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Roxas | Roxas Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | San Teodoro | San Teodoro Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Socorro | Socorro Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Victoria | Victoria Health Office |
| *(System Generated Default)* | PHO | MIMAROPA | Palawan | Puerto Princesa | Palawan Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Aborlan | Aborlan Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Agutaya | Agutaya Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Araceli | Araceli Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Balabac | Balabac Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Bataraza | Bataraza Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Brooke's Point | Brooke's Point Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Busuanga | Busuanga Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Cagayancillo | Cagayancillo Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Coron | Coron Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Culion | Culion Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Cuyo | Cuyo Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Dumaran | Dumaran Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | El Nido | El Nido Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Kalayaan | Kalayaan Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Linapacan | Linapacan Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Magsaysay | Magsaysay Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Narra | Narra Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Puerto Princesa | Puerto Princesa Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Quezon | Quezon Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Rizal | Rizal Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Roxas | Roxas Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | San Vicente | San Vicente Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Sofronio Española | Sofronio Española Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Taytay | Taytay Health Office |
| *(System Generated Default)* | PHO | MIMAROPA | Romblon | Romblon | Romblon Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Alcantara | Alcantara Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Banton | Banton Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Cajidiocan | Cajidiocan Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Calatrava | Calatrava Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Concepcion | Concepcion Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Corcuera | Corcuera Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Ferrol | Ferrol Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Looc | Looc Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Magdiwang | Magdiwang Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Odiongan | Odiongan Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Romblon | Romblon Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | San Agustin | San Agustin Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | San Andres | San Andres Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | San Fernando | San Fernando Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | San Jose | San Jose Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Santa Fe | Santa Fe Health Office |
| **BICOL** | | | | | |
| *(System Generated Default)* | Regional Hub | BICOL | Regional | Legazpi City | DOH-CHD BICOL |
| *(System Generated Default)* | PHO | BICOL | Albay | Legazpi City | Albay Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Bacacay | Bacacay Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Camalig | Camalig Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Daraga | Daraga Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Guinobatan | Guinobatan Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Jovellar | Jovellar Health Office |
| *(System Generated Default)* | CHO/LGU | BICOL | Albay | Legazpi City | Legazpi City Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Libon | Libon Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Ligao | Ligao Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Malilipot | Malilipot Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Malinao | Malinao Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Manito | Manito Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Oas | Oas Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Pio Duran | Pio Duran Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Polangui | Polangui Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Rapu-Rapu | Rapu-Rapu Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Santo Domingo | Santo Domingo Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Tabaco | Tabaco Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Tiwi | Tiwi Health Office |
| *(System Generated Default)* | PHO | BICOL | Camarines Norte | Daet | Camarines Norte Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Basud | Basud Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Capalonga | Capalonga Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Daet | Daet Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Jose Panganiban | Jose Panganiban Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Labo | Labo Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Mercedes | Mercedes Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Paracale | Paracale Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | San Lorenzo Ruiz | San Lorenzo Ruiz Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | San Vicente | San Vicente Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Santa Elena | Santa Elena Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Talisay | Talisay Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Vinzons | Vinzons Health Office |
| *(System Generated Default)* | PHO | BICOL | Camarines Sur | Pili | Camarines Sur Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Baao | Baao Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Balatan | Balatan Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Bato | Bato Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Bombon | Bombon Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Buhi | Buhi Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Bula | Bula Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Cabusao | Cabusao Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Calabanga | Calabanga Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Camaligan | Camaligan Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Canaman | Canaman Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Caramoan | Caramoan Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Del Gallego | Del Gallego Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Gainza | Gainza Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Garchitorena | Garchitorena Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Goa | Goa Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Iriga | Iriga Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Lagonoy | Lagonoy Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Libmanan | Libmanan Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Lupi | Lupi Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Magarao | Magarao Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Milaor | Milaor Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Minalabac | Minalabac Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Nabua | Nabua Health Office |
| *(System Generated Default)* | CHO/LGU | BICOL | Camarines Sur | Naga City | Naga City Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Ocampo | Ocampo Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Pamplona | Pamplona Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Pasacao | Pasacao Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Pili | Pili Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Presentacion | Presentacion Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Ragay | Ragay Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Sagñay | Sagñay Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | San Fernando | San Fernando Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | San Jose | San Jose Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Sipocot | Sipocot Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Siruma | Siruma Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Tigaon | Tigaon Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Tinambac | Tinambac Health Office |
| *(System Generated Default)* | PHO | BICOL | Catanduanes | Virac | Catanduanes Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Bagamanoc | Bagamanoc Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Baras | Baras Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Bato | Bato Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Caramoran | Caramoran Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Gigmoto | Gigmoto Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Pandan | Pandan Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Panganiban | Panganiban Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | San Andres | San Andres Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | San Miguel | San Miguel Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Viga | Viga Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Virac | Virac Health Office |
| *(System Generated Default)* | PHO | BICOL | Masbate | Masbate City | Masbate Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Aroroy | Aroroy Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Baleno | Baleno Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Balud | Balud Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Batuan | Batuan Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Cataingan | Cataingan Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Cawayan | Cawayan Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Claveria | Claveria Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Dimasalang | Dimasalang Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Esperanza | Esperanza Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Mandaon | Mandaon Health Office |
| *(System Generated Default)* | CHO/LGU | BICOL | Masbate | Masbate City | Masbate City Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Milagros | Milagros Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Mobo | Mobo Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Monreal | Monreal Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Palanas | Palanas Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Pio V. Corpuz | Pio V. Corpuz Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Placer | Placer Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | San Fernando | San Fernando Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | San Jacinto | San Jacinto Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | San Pascual | San Pascual Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Uson | Uson Health Office |
| *(System Generated Default)* | PHO | BICOL | Sorsogon | Sorsogon City | Sorsogon Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Barcelona | Barcelona Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Bulan | Bulan Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Bulusan | Bulusan Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Casiguran | Casiguran Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Castilla | Castilla Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Donsol | Donsol Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Gubat | Gubat Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Irosin | Irosin Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Juban | Juban Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Magallanes | Magallanes Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Matnog | Matnog Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Pilar | Pilar Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Prieto Diaz | Prieto Diaz Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Santa Magdalena | Santa Magdalena Health Office |
| *(System Generated Default)* | CHO/LGU | BICOL | Sorsogon | Sorsogon City | Sorsogon City Health Office |

---

### How to use this mapped reference:
When importing new sales data, cross-reference the raw string (e.g., `"A/R - D3 - District - Candelaria Municipal Hospital"`) and explicitly extract the trailing town name (`"Candelaria"`) to populate the `lgu_city_muni` column. 

**4-Step Imputation Logic for Missing LGUs:**
1. **Searchable Real-World Location:** Find the actual physical LGU for known institutions (e.g., Botika Estela maps to **Balayan**).
2. **Missing specific client, but LGU is known in sales data:** Default to the City/Municipal Health Office (CHO) from the *System Generated Defaults*.
3. **Unsearchable Client (e.g., individual name) and only Province is known:** Default to the Provincial Health Office (PHO) from the *System Generated Defaults*.
4. **Unsearchable Client and only Region is known:** Default to the DOH Regional Hub (CHD) from the *System Generated Defaults*.

### ➕ Provision for "Add Client" (New Clients)
If MedShield acquires a completely new client that is not in this reference document or the master ledger, the system handles it seamlessly without breaking:
1. **Dynamic Addition:** When a new client name appears in an imported dataset (e.g., `"A/R - Laguna - Generika Pharmacy"`), the system will treat it as a valid `ui_subtag`.
2. **Anchor Assignment:** The user simply assigns it to its correct LGU anchor (e.g., `San Pablo City`). 
3. **Ledger Update:** The new client is permanently appended to the system's internal mapping dictionary, ensuring that all future transactions for `"Generika Pharmacy"` automatically route to `San Pablo City`.
