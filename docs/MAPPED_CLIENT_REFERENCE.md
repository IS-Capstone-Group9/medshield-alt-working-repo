# MedShield Mapped Client List (Reference)

This document demonstrates how the unstructured raw client data (from the original PDF reference) is transformed into the structured geographic hierarchy required by the MedShield machine learning pipeline. 

By applying the fallback logic, all generic individual accounts and hospitals are anchored to a valid **LGU (City/Municipality)** for model computations, while preserving their original names as UI sub-tags. **To support this fallback logic, the baseline Regional, Provincial, and City/Municipal Health Offices are explicitly instantiated below.**

| Original Raw Client Name (From PDF) | Client Type | Region | Province | **`lgu_city_muni`** (Model Anchor) | **Barangay** | **`ui_subtag`** / Context |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **NATIONAL & INTERNAL** |  |  |  |  |  |  |
| A/R - Admin | Internal Admin | National | HQ | MedShield HQ |  | MedShield Internal Administration |
| A/R - Government | National Govt | National | National | DOH Central |  | DOH Central Office |
| **CALABARZON** |  |  |  |  |  |  |
| *(System Generated Default)* | Regional Hub | CALABARZON | Regional | Quezon City *(Logistical)* |  | DOH-CHD CALABARZON |
| *(System Generated Default)* | PHO | CALABARZON | Batangas | Batangas City |  | Batangas Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Agoncillo |  | Agoncillo Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Agoncillo |  | Agoncillo Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Alitagtag |  | Alitagtag Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Alitagtag |  | Alitagtag Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Balayan |  | Balayan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Balayan |  | Balayan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Balete |  | Balete Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Balete |  | Balete Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Batangas | Batangas City |  | Batangas City City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Bauan |  | Bauan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Bauan |  | Bauan Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Batangas | Calaca |  | Calaca City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Calatagan |  | Calatagan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Calatagan |  | Calatagan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Cuenca |  | Cuenca Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Cuenca |  | Cuenca Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Ibaan |  | Ibaan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Ibaan |  | Ibaan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Laurel |  | Laurel Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Laurel |  | Laurel Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Lemery |  | Lemery Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Lemery |  | Lemery Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Lian |  | Lian Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Lian |  | Lian Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Batangas | Lipa |  | Lipa City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Lobo |  | Lobo Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Lobo |  | Lobo Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Mabini |  | Mabini Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Mabini |  | Mabini Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Malvar |  | Malvar Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Malvar |  | Malvar Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Mataasnakahoy |  | Mataasnakahoy Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Mataasnakahoy |  | Mataasnakahoy Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Nasugbu |  | Nasugbu Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Nasugbu |  | Nasugbu Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Padre Garcia |  | Padre Garcia Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Padre Garcia |  | Padre Garcia Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Rosario |  | Rosario Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Rosario |  | Rosario Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Jose |  | San Jose Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | San Jose |  | San Jose Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Juan |  | San Juan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | San Juan |  | San Juan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Luis |  | San Luis Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | San Luis |  | San Luis Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Nicolas |  | San Nicolas Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | San Nicolas |  | San Nicolas Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Pascual |  | San Pascual Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | San Pascual |  | San Pascual Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Santa Teresita |  | Santa Teresita Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Santa Teresita |  | Santa Teresita Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Batangas | Santo Tomas |  | Santo Tomas City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Taal |  | Taal Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Taal |  | Taal Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Talisay |  | Talisay Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Talisay |  | Talisay Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Batangas | Tanauan |  | Tanauan City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Taysan |  | Taysan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Taysan |  | Taysan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Tingloy |  | Tingloy Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Tingloy |  | Tingloy Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Tuy |  | Tuy Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Tuy |  | Tuy Rural Health Unit |
| A/R - Batangas - Gerardo Delos Reyes | Individual/A/R | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* |  | Gerardo Delos Reyes |
| A/R - Batangas - Norma Cabiliza | Individual/A/R | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* |  | Norma Cabiliza |
| A/R - Batangas - Ann Denise Codizal Pharmacy | Pharmacy | CALABARZON | Batangas | Balayan *(Searched Location)* |  | Ann Denise Codizal Pharmacy |
| A/R - Batangas - Botika Estela | Pharmacy | CALABARZON | Batangas | Balayan *(Searched Location)* |  | Botika Estela |
| A/R - Batangas - DLR Pharmacy | Pharmacy | CALABARZON | Batangas | Calatagan *(Searched Location)* |  | DLR Pharmacy |
| A/R - Batangas - Maggie and Jojo/ JNJ Pharmacy | Pharmacy | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* |  | Maggie and Jojo/ JNJ Pharmacy |
| A/R - Batangas - Shooting Star Trading | Retail | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* |  | Shooting Star Trading |
| A/R - Batangas - Divine Care Hospital | Private Hospital | CALABARZON | Batangas | San Juan *(Searched Location)* |  | Divine Care Hospital |
| *(System Generated Default)* | PHO | CALABARZON | Cavite | Trece Martires |  | Cavite Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Alfonso |  | Alfonso Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Alfonso |  | Alfonso Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Amadeo |  | Amadeo Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Amadeo |  | Amadeo Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | Bacoor |  | Bacoor City Health Office |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | Carmona |  | Carmona City Health Office |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | Cavite City |  | Cavite City City Health Office |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | Dasmariñas |  | Dasmariñas City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | General Emilio Aguinaldo |  | General Emilio Aguinaldo Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | General Emilio Aguinaldo |  | General Emilio Aguinaldo Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | General Mariano Alvarez |  | General Mariano Alvarez Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | General Mariano Alvarez |  | General Mariano Alvarez Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | General Trias |  | General Trias City Health Office |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | Imus |  | Imus City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Indang |  | Indang Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Indang |  | Indang Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Kawit |  | Kawit Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Kawit |  | Kawit Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Magallanes |  | Magallanes Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Magallanes |  | Magallanes Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Maragondon |  | Maragondon Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Maragondon |  | Maragondon Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Mendez |  | Mendez Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Mendez |  | Mendez Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Naic |  | Naic Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Naic |  | Naic Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Noveleta |  | Noveleta Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Noveleta |  | Noveleta Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Rosario |  | Rosario Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Rosario |  | Rosario Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Silang |  | Silang Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Silang |  | Silang Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | Tagaytay |  | Tagaytay City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Tanza |  | Tanza Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Tanza |  | Tanza Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Ternate |  | Ternate Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Ternate |  | Ternate Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | Trece Martires |  | Trece Martires City Health Office |
| *(System Generated Default)* | PHO | CALABARZON | Laguna | Santa Cruz |  | Laguna Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Alaminos |  | Alaminos Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Alaminos |  | Alaminos Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Bay |  | Bay Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Bay |  | Bay Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Laguna | Biñan |  | Biñan City Health Office |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Laguna | Cabuyao |  | Cabuyao City Health Office |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Laguna | Calamba |  | Calamba City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Calauan |  | Calauan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Calauan |  | Calauan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Cavinti |  | Cavinti Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Cavinti |  | Cavinti Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Famy |  | Famy Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Famy |  | Famy Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Kalayaan |  | Kalayaan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Kalayaan |  | Kalayaan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Liliw |  | Liliw Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Liliw |  | Liliw Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Los Baños |  | Los Baños Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Los Baños |  | Los Baños Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Luisiana |  | Luisiana Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Luisiana |  | Luisiana Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Lumban |  | Lumban Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Lumban |  | Lumban Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Mabitac |  | Mabitac Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Mabitac |  | Mabitac Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Magdalena |  | Magdalena Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Magdalena |  | Magdalena Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Majayjay |  | Majayjay Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Majayjay |  | Majayjay Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Nagcarlan |  | Nagcarlan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Nagcarlan |  | Nagcarlan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Paete |  | Paete Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Paete |  | Paete Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Pagsanjan |  | Pagsanjan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Pagsanjan |  | Pagsanjan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Pakil |  | Pakil Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Pakil |  | Pakil Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Pangil |  | Pangil Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Pangil |  | Pangil Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Pila |  | Pila Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Pila |  | Pila Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Rizal |  | Rizal Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Rizal |  | Rizal Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Laguna | San Pablo |  | San Pablo City Health Office |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Laguna | San Pedro |  | San Pedro City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Santa Cruz |  | Santa Cruz Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Santa Cruz |  | Santa Cruz Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Santa Maria |  | Santa Maria Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Santa Maria |  | Santa Maria Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Laguna | Santa Rosa |  | Santa Rosa City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Siniloan |  | Siniloan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Siniloan |  | Siniloan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Victoria |  | Victoria Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Victoria |  | Victoria Rural Health Unit |
| *(System Generated Default)* | PHO | CALABARZON | Quezon | Lucena City |  | Quezon Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Agdangan |  | Agdangan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Agdangan |  | Agdangan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Alabat |  | Alabat Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Alabat |  | Alabat Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Atimonan |  | Atimonan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Atimonan |  | Atimonan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Buenavista |  | Buenavista Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Buenavista |  | Buenavista Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Burdeos |  | Burdeos Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Burdeos |  | Burdeos Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Calauag |  | Calauag Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Calauag |  | Calauag Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Candelaria |  | Candelaria Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Candelaria |  | Candelaria Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Catanauan |  | Catanauan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Catanauan |  | Catanauan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Dolores |  | Dolores Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Dolores |  | Dolores Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | General Luna |  | General Luna Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | General Luna |  | General Luna Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | General Nakar |  | General Nakar Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | General Nakar |  | General Nakar Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Guinayangan |  | Guinayangan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Guinayangan |  | Guinayangan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Gumaca |  | Gumaca Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Gumaca |  | Gumaca Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Infanta |  | Infanta Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Infanta |  | Infanta Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Jomalig |  | Jomalig Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Jomalig |  | Jomalig Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Lopez |  | Lopez Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Lopez |  | Lopez Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Lucban |  | Lucban Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Lucban |  | Lucban Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Quezon | Lucena City |  | Lucena City City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Macalelon |  | Macalelon Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Macalelon |  | Macalelon Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Mauban |  | Mauban Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Mauban |  | Mauban Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Mulanay |  | Mulanay Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Mulanay |  | Mulanay Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Padre Burgos |  | Padre Burgos Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Padre Burgos |  | Padre Burgos Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Pagbilao |  | Pagbilao Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Pagbilao |  | Pagbilao Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Panukulan |  | Panukulan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Panukulan |  | Panukulan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Patnanungan |  | Patnanungan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Patnanungan |  | Patnanungan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Perez |  | Perez Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Perez |  | Perez Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Pitogo |  | Pitogo Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Pitogo |  | Pitogo Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Plaridel |  | Plaridel Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Plaridel |  | Plaridel Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Polillo |  | Polillo Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Polillo |  | Polillo Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Quezon |  | Quezon Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Quezon |  | Quezon Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Real |  | Real Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Real |  | Real Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Sampaloc |  | Sampaloc Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Sampaloc |  | Sampaloc Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | San Andres |  | San Andres Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | San Andres |  | San Andres Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | San Antonio |  | San Antonio Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | San Antonio |  | San Antonio Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | San Francisco |  | San Francisco Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | San Francisco |  | San Francisco Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | San Narciso |  | San Narciso Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | San Narciso |  | San Narciso Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Sariaya |  | Sariaya Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Sariaya |  | Sariaya Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Tagkawayan |  | Tagkawayan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Tagkawayan |  | Tagkawayan Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Quezon | Tayabas |  | Tayabas City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Tiaong |  | Tiaong Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Tiaong |  | Tiaong Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Unisan |  | Unisan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Unisan |  | Unisan Rural Health Unit |
| A/R - Quezon - Augustina Cabangon | Govt Hospital | CALABARZON | Quezon | Lucena City *(Searched Location)* |  | Augustina Cabangon |
| A/R - Quezon - Aurea Cadacio | BHS / Midwife | CALABARZON | Quezon | Sariaya *(Searched Location)* |  | Aurea Cadacio |
| A/R - Quezon - Bridgette Inocencio | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Bridgette Inocencio |
| A/R - Quezon - Cherry Espinosa | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Cherry Espinosa |
| A/R - Quezon - Corazon Arroyo | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Corazon Arroyo |
| A/R - Quezon - Danilo Olitoquit | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Danilo Olitoquit |
| A/R - Quezon - Emeline Olaivar | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Emeline Olaivar |
| A/R - Quezon - Emma Zoleta | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Emma Zoleta |
| A/R - Quezon - Ester Vergara | Clinic | CALABARZON | Quezon | Candelaria *(Searched Location)* |  | Ester Vergara |
| A/R - Quezon - Glenda Lao | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Glenda Lao |
| A/R - Quezon - Gloria Liwanag | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Gloria Liwanag |
| A/R - Quezon - Graciela Derada Deleon | Clinic | CALABARZON | Quezon | Tayabas *(Searched Location)* |  | Graciela Derada Deleon |
| A/R - Quezon - Honorata Pañebe | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Honorata Pañebe |
| A/R - Quezon - Isabel Oliveros | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Isabel Oliveros |
| A/R - Quezon - Janice Mercado | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Janice Mercado |
| A/R - Quezon - Javierto Reynoso | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Javierto Reynoso |
| A/R - Quezon - Jesus Comia | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Jesus Comia |
| A/R - Quezon - Jing Marasigan | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Jing Marasigan |
| A/R - Quezon - Juanita Tan | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Juanita Tan |
| A/R - Quezon - Lanie Atienza | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Lanie Atienza |
| A/R - Quezon - Lelette Gamboa | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Lelette Gamboa |
| A/R - Quezon - Liza Defeo | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Liza Defeo |
| A/R - Quezon - Liza Maranan | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Liza Maranan |
| A/R - Quezon - Lovella Alava | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Lovella Alava |
| A/R - Quezon - Ma Victoria Ayag | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Ma Victoria Ayag |
| A/R - Quezon - Mary Aileen Morales | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Mary Aileen Morales |
| A/R - Quezon - Melissa Abbariao | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Melissa Abbariao |
| A/R - Quezon - Mercy Reyes | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Mercy Reyes |
| A/R - Quezon - Noemi Francisco | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Noemi Francisco |
| A/R - Quezon - Petronillo Faller | Clinic | CALABARZON | Quezon | Lucban *(Searched Location)* |  | Petronillo Faller |
| A/R - Quezon - Ramon Nieva | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Ramon Nieva |
| A/R - Quezon - Reggie Revilla | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Reggie Revilla |
| A/R - Quezon - Rodel Redor | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Rodel Redor |
| A/R - Quezon - Rodolfo Rañola | Clinic | CALABARZON | Quezon | Lucban *(Searched Location)* |  | Rodolfo Rañola |
| A/R - Quezon - Roly Dela Peña | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Roly Dela Peña |
| A/R - Quezon - Rosalina Bautista | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Rosalina Bautista |
| A/R - Quezon - Rufinita Soquilla | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Rufinita Soquilla |
| A/R - Quezon - Severina Escondo | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Severina Escondo |
| A/R - Quezon - Teresa Tan | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Teresa Tan |
| A/R - Quezon - BLB Botika | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | BLB Botika |
| A/R - Quezon - Bon Pharmacy | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Bon Pharmacy |
| A/R - Quezon - Century Drug | Pharmacy | CALABARZON | Quezon | Atimonan *(Searched Location)* |  | Century Drug |
| A/R - Quezon - DCP Pharmacy | Pharmacy | CALABARZON | Quezon | Agdangan *(Searched Location)* |  | DCP Pharmacy |
| A/R - Quezon - Eastern Drug | Pharmacy | CALABARZON | Quezon | Gumaca *(Searched Location)* |  | Eastern Drug |
| A/R - Quezon - Gumaca District Cooperative | Cooperative | CALABARZON | Quezon | Gumaca |  | Gumaca District Cooperative |
| A/R - Quezon - KKK Pharmacy | Pharmacy | CALABARZON | Quezon | Padre Burgos *(Searched Location)* |  | KKK Pharmacy |
| A/R - Quezon - Megawide | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Megawide |
| A/R - Quezon - Pagkatipunan Drugstore | Pharmacy | CALABARZON | Quezon | Lucena City *(Searched Location)* |  | Pagkatipunan Drugstore |
| A/R - Quezon - Perez Drug | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Perez Drug |
| A/R - Quezon - RSV Pharmacy | Pharmacy | CALABARZON | Quezon | Candelaria *(Searched Location)* |  | RSV Pharmacy |
| A/R - Quezon - Vickys Pharmacy | Pharmacy | CALABARZON | Quezon | Lucena City *(Searched Location)* |  | Vickys Pharmacy |
| A/R - Quezon - Winjoy Pharmacy | Pharmacy | CALABARZON | Quezon | Lopez *(Searched Location)* |  | Winjoy Pharmacy |
| A/R - Quezon - Ma. Cecile Aure | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Ma. Cecile Aure |
| A/R - Quezon - Cherrylyn Barola | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Cherrylyn Barola |
| A/R - Quezon - Mt Carmel General Hospital | Private Hospital | CALABARZON | Quezon | Lucena City | Brgy. 4 | Mt Carmel General Hospital |
| A/R - Quezon - RAKKK Prophet | Private Hospital | CALABARZON | Quezon | Gumaca *(Searched Location)* |  | RAKKK Prophet |
| A/R - Quezon - Herminia Laguador | Clinic | CALABARZON | Quezon | Lucban *(Searched Location)* |  | Herminia Laguador |
| A/R - Quezon - Madel Fetisa | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Madel Fetisa |
| A/R - Quezon - Constancia Catarroja | RHU/MHO | CALABARZON | Quezon | Sariaya *(Searched Location)* |  | Constancia Catarroja |
| A/R - Quezon - BEMONC RHU Sariaya | RHU | CALABARZON | Quezon | Sariaya |  | BEMONC RHU Sariaya |
| A/R - Quezon - Urbano Oliveros | Clinic | CALABARZON | Quezon | Lucena City *(Searched Location)* |  | Urbano Oliveros |
| A/R - Quezon - Brgy Canda Health Center | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Brgy Canda Health Center |
| A/R - Quezon - Bricor Pharmacy | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Bricor Pharmacy |
| A/R - Quezon - Severina Nadres | Clinic | CALABARZON | Quezon | Tayabas *(Searched Location)* |  | Severina Nadres |
| A/R - Quezon - AMCA Drug | Pharmacy | CALABARZON | Quezon | Catanauan *(Searched Location)* |  | AMCA Drug |
| A/R - Quezon - Dr Jessabeth Mercado | Govt Hospital | CALABARZON | Quezon | Lucena City *(Searched Location)* |  | Dr Jessabeth Mercado |
| A/R - Quezon - Dr. Florcerel Malay | Private Hospital | CALABARZON | Quezon | Sariaya *(Searched Location)* |  | Dr. Florcerel Malay |
| A/R - Quezon - Dr. Teresa Tagarao | Private Hospital | CALABARZON | Quezon | Lopez *(Searched Location)* |  | Dr. Teresa Tagarao |
| A/R - Quezon - Dr. Victorino Araña | RHU | CALABARZON | Quezon | Lucban *(Searched Location)* |  | Dr. Victorino Araña |
| A/R - Quezon - NSDR Birthing Home | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | NSDR Birthing Home |
| A/R - Quezon - Dr. Gilbert Lafuente | Clinic | CALABARZON | Quezon | Padre Burgos *(Searched Location)* |  | Dr. Gilbert Lafuente |
| A/R - Quezon - Sampaloc Lying Inn | Lying Inn | CALABARZON | Quezon | Sampaloc |  | Sampaloc Lying Inn |
| A/R - Quezon - Unihealth Quezon (Medicine) | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Unihealth Quezon (Medicine) |
| A/R - Quezon - Tumbaga Birthing Home | Birthing Home | CALABARZON | Quezon | Sariaya *(Searched Location)* |  | Tumbaga Birthing Home |
| A/R - Quezon - Brgy Health Station Sampaloc 1 | BHS | CALABARZON | Quezon | Sampaloc |  | Brgy Health Station Sampaloc 1 |
| A/R - Quezon - Raquel Samodio | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Raquel Samodio |
| A/R - Quezon - Asuncion Rañeses | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Asuncion Rañeses |
| A/R - Quezon - Lopez St Jude General Hospital | Private Hospital | CALABARZON | Quezon | Lopez |  | Lopez St Jude General Hospital |
| A/R - Quezon - Dra. Cherry Bacungan | Private Hospital | CALABARZON | Quezon | Lucena City *(Searched Location)* |  | Dra. Cherry Bacungan |
| A/R - Quezon - Dr. Maribel Nosce | Clinic | CALABARZON | Quezon | Lucena City *(Searched Location)* |  | Dr. Maribel Nosce |
| A/R - Quezon - Zoleta Birthing Home | Birthing Home | CALABARZON | Quezon | San Antonio *(Searched Location)* |  | Zoleta Birthing Home |
| A/R - Quezon - Hiyasmin Birthing Home | Birthing Home | CALABARZON | Quezon | Tayabas *(Searched Location)* |  | Hiyasmin Birthing Home |
| A/R - Quezon - Nativity of Jesus Birthing Clinic | Birthing Home | CALABARZON | Quezon | Sariaya *(Searched Location)* |  | Nativity of Jesus Birthing Clinic |
| A/R - Quezon - Gulang Gulang National High School | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Gulang Gulang National High School |
| A/R - Hospital - Lucena MMG Hospital | Govt Hospital | CALABARZON | Quezon | Lucena City | Brgy. Ibabang Dupay | Lucena MMG Hospital |
| A/R - Hospital - Peter Paul Medical Center of Candelaria | Govt Hospital | CALABARZON | Quezon | Candelaria | Pahinga Norte | Peter Paul Medical Center of Candelaria |
| A/R - Hospital - Quezon Medical Center | Govt Hospital | CALABARZON | Quezon | Lucena City | Brgy. 11 | Quezon Medical Center |
| A/R - Hospital - Unihealth Quezon (Hospital Medicines) | Govt Hospital | CALABARZON | Quezon | Lucena City |  | Unihealth Quezon (Hospital Medicines) |
| A/R - Hospital - Lucena United Doctors Hospital | Govt Hospital | CALABARZON | Quezon | Lucena City | Brgy. Isabang | Lucena United Doctors Hospital |
| A/R - D3 - LGU - Pagbilao | LGU | CALABARZON | Quezon | Pagbilao |  | Pagbilao |
| A/R - D3 - District - Bondoc Peninsula District Hospital, Catanauan | Govt Hospital | CALABARZON | Quezon | Catanauan |  | Bondoc Peninsula District Hospital, Catanauan |
| A/R - D3 - District - Candelaria Municipal Hospital, Candelaria | Govt Hospital | CALABARZON | Quezon | Candelaria |  | Candelaria Municipal Hospital, Candelaria |
| A/R - D3 - District - Guinyangan Medicare Community Hospital, Guinyangan | Govt Hospital | CALABARZON | Quezon | Guinayangan |  | Guinyangan Medicare Community Hospital, Guinyangan |
| A/R - D3 - District - Gumaca District Hospital, Gumaca | Govt Hospital | CALABARZON | Quezon | Gumaca | Rosario | Gumaca District Hospital, Gumaca |
| A/R - D3 - District - Claro M. Recto District Hospital, Infanta | Govt Hospital | CALABARZON | Quezon | Infanta |  | Claro M. Recto District Hospital, Infanta |
| A/R - D3 - District - Doña Marta Memorial Hospital, Atimonan | Govt Hospital | CALABARZON | Quezon | Atimonan |  | Doña Marta Memorial Hospital, Atimonan |
| A/R - D3 - District - Mauban District Hospital, Mauban | Govt Hospital | CALABARZON | Quezon | Mauban |  | Mauban District Hospital, Mauban |
| A/R - D3 - District - Magsaysay Memorial District Hospital, Lopez | Govt Hospital | CALABARZON | Quezon | Lopez | Gomez | Magsaysay Memorial District Hospital, Lopez |
| A/R - D3 - District - Maria Eleazar District Hospital, Tagkawayan | Govt Hospital | CALABARZON | Quezon | Tagkawayan |  | Maria Eleazar District Hospital, Tagkawayan |
| A/R - D3 - District - Polilio Medicare Hospital, Polilio | Govt Hospital | CALABARZON | Quezon | Polillo |  | Polilio Medicare Hospital, Polilio |
| A/R - D3 - District - Sampaloc Medicare Community Hospital, Sampaloc | Lying Inn | CALABARZON | Quezon | Sampaloc |  | Sampaloc Medicare Community Hospital, Sampaloc |
| A/R - D3 - District - San Francisco Municipal Hospital, San Francisco | Govt Hospital | CALABARZON | Quezon | San Francisco | Poblacion | San Francisco Municipal Hospital, San Francisco |
| A/R - D3 - District - Unisan Medicare Community Hospital, Unisan | Govt Hospital | CALABARZON | Quezon | Unisan |  | Unisan Medicare Community Hospital, Unisan |
| A/R - D3 - District - IPHO | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | IPHO |
| A/R - D3 - District - Alabat Island District Hospital | Govt Hospital | CALABARZON | Quezon | Alabat |  | Alabat Island District Hospital |
| A/R - D3 - District - Provincial Tourism Office | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Provincial Tourism Office |
| *(System Generated Default)* | PHO | CALABARZON | Rizal | Antipolo |  | Rizal Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Angono |  | Angono Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Angono |  | Angono Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | CALABARZON | Rizal | Antipolo |  | Antipolo City Health Office |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Baras |  | Baras Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Baras |  | Baras Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Binangonan |  | Binangonan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Binangonan |  | Binangonan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Cainta |  | Cainta Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Cainta |  | Cainta Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Cardona |  | Cardona Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Cardona |  | Cardona Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Jalajala |  | Jalajala Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Jalajala |  | Jalajala Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Morong |  | Morong Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Morong |  | Morong Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Pililla |  | Pililla Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Pililla |  | Pililla Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Rodriguez |  | Rodriguez Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Rodriguez |  | Rodriguez Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | San Mateo |  | San Mateo Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | San Mateo |  | San Mateo Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Tanay |  | Tanay Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Tanay |  | Tanay Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Taytay |  | Taytay Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Taytay |  | Taytay Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Teresa |  | Teresa Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Teresa |  | Teresa Rural Health Unit |
| **MIMAROPA** |  |  |  |  |  |  |
| *(System Generated Default)* | Regional Hub | MIMAROPA | Regional | Quezon City *(Logistical)* |  | DOH-CHD MIMAROPA |
| *(System Generated Default)* | PHO | MIMAROPA | Marinduque | Boac |  | Marinduque Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Boac |  | Boac Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Marinduque | Boac |  | Boac Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Buenavista |  | Buenavista Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Marinduque | Buenavista |  | Buenavista Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Gasan |  | Gasan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Marinduque | Gasan |  | Gasan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Mogpog |  | Mogpog Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Marinduque | Mogpog |  | Mogpog Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Santa Cruz |  | Santa Cruz Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Marinduque | Santa Cruz |  | Santa Cruz Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Torrijos |  | Torrijos Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Marinduque | Torrijos |  | Torrijos Rural Health Unit |
| A/R - Marinduque - Arlene Nebreja | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Arlene Nebreja |
| A/R - Marinduque - Arlie Vertucio | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Arlie Vertucio |
| A/R - Marinduque - Catherine Sadiwa | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Catherine Sadiwa |
| A/R - Marinduque - Florito Aliasas | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Florito Aliasas |
| A/R - Marinduque - Imelda Parado | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Imelda Parado |
| A/R - Marinduque - Julia Masangkay | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Julia Masangkay |
| A/R - Marinduque - Lani Dela Santa | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Lani Dela Santa |
| A/R - Marinduque - Lorena Quing | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Lorena Quing |
| A/R - Marinduque - Manuel Narciso | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Manuel Narciso |
| A/R - Marinduque - Margarita Montellano | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Margarita Montellano |
| A/R - Marinduque - Rey Richard Sore | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Rey Richard Sore |
| A/R - Marinduque - Teodolfo Rejano | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Teodolfo Rejano |
| A/R - Marinduque - JRM - RMV Pharmacy | Pharmacy | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | RMV Pharmacy |
| A/R - Marinduque - MPH Cooperative | Cooperative | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | MPH Cooperative |
| A/R - Marinduque - St. Rose of Lima | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | St. Rose of Lima |
| A/R - Marinduque - WH Pharmacy | Pharmacy | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | WH Pharmacy |
| A/R - Marinduque - Torrijos Municipal Hall | Govt | MIMAROPA | Marinduque | Torrijos |  | Torrijos Municipal Hall |
| A/R - Marinduque - Provincial Government of Marinduque | Govt | MIMAROPA | Marinduque | Boac *(Provincial Capital Default)* |  | Provincial Government of Marinduque |
| A/R - Marinduque - Dr. Esmeralda Calayag | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Dr. Esmeralda Calayag |
| A/R - Marinduque - Dr. Alfred Saldaña | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Dr. Alfred Saldaña |
| A/R - Marinduque - Dr. Alex Cruz | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Dr. Alex Cruz |
| A/R - Marinduque - L.Pergis Pharmacy | Pharmacy | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | L.Pergis Pharmacy |
| *(System Generated Default)* | PHO | MIMAROPA | Occidental Mindoro | Mamburao |  | Occidental Mindoro Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Abra de Ilog |  | Abra de Ilog Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Abra de Ilog |  | Abra de Ilog Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Calintaan |  | Calintaan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Calintaan |  | Calintaan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Looc |  | Looc Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Looc |  | Looc Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Lubang |  | Lubang Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Lubang |  | Lubang Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Magsaysay |  | Magsaysay Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Magsaysay |  | Magsaysay Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Mamburao |  | Mamburao Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Mamburao |  | Mamburao Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Paluan |  | Paluan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Paluan |  | Paluan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Rizal |  | Rizal Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Rizal |  | Rizal Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Sablayan |  | Sablayan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Sablayan |  | Sablayan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | San Jose |  | San Jose Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | San Jose |  | San Jose Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Santa Cruz |  | Santa Cruz Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Santa Cruz |  | Santa Cruz Rural Health Unit |
| *(System Generated Default)* | PHO | MIMAROPA | Oriental Mindoro | Calapan |  | Oriental Mindoro Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Baco |  | Baco Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Baco |  | Baco Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Bansud |  | Bansud Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Bansud |  | Bansud Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Bongabong |  | Bongabong Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Bongabong |  | Bongabong Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Bulalacao |  | Bulalacao Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Bulalacao |  | Bulalacao Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | MIMAROPA | Oriental Mindoro | Calapan |  | Calapan City Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Gloria |  | Gloria Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Gloria |  | Gloria Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Mansalay |  | Mansalay Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Mansalay |  | Mansalay Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Naujan |  | Naujan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Naujan |  | Naujan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Pinamalayan |  | Pinamalayan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Pinamalayan |  | Pinamalayan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Pola |  | Pola Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Pola |  | Pola Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Puerto Galera |  | Puerto Galera Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Puerto Galera |  | Puerto Galera Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Roxas |  | Roxas Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Roxas |  | Roxas Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | San Teodoro |  | San Teodoro Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | San Teodoro |  | San Teodoro Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Socorro |  | Socorro Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Socorro |  | Socorro Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Victoria |  | Victoria Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Victoria |  | Victoria Rural Health Unit |
| *(System Generated Default)* | PHO | MIMAROPA | Palawan | Puerto Princesa |  | Palawan Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Aborlan |  | Aborlan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Aborlan |  | Aborlan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Agutaya |  | Agutaya Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Agutaya |  | Agutaya Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Araceli |  | Araceli Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Araceli |  | Araceli Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Balabac |  | Balabac Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Balabac |  | Balabac Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Bataraza |  | Bataraza Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Bataraza |  | Bataraza Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Brooke's Point |  | Brooke's Point Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Brooke's Point |  | Brooke's Point Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Busuanga |  | Busuanga Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Busuanga |  | Busuanga Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Cagayancillo |  | Cagayancillo Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Cagayancillo |  | Cagayancillo Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Coron |  | Coron Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Coron |  | Coron Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Culion |  | Culion Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Culion |  | Culion Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Cuyo |  | Cuyo Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Cuyo |  | Cuyo Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Dumaran |  | Dumaran Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Dumaran |  | Dumaran Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | El Nido |  | El Nido Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | El Nido |  | El Nido Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Kalayaan |  | Kalayaan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Kalayaan |  | Kalayaan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Linapacan |  | Linapacan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Linapacan |  | Linapacan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Magsaysay |  | Magsaysay Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Magsaysay |  | Magsaysay Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Narra |  | Narra Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Narra |  | Narra Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | MIMAROPA | Palawan | Puerto Princesa |  | Puerto Princesa City Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Quezon |  | Quezon Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Quezon |  | Quezon Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Rizal |  | Rizal Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Rizal |  | Rizal Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Roxas |  | Roxas Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Roxas |  | Roxas Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | San Vicente |  | San Vicente Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | San Vicente |  | San Vicente Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Sofronio Española |  | Sofronio Española Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Sofronio Española |  | Sofronio Española Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Taytay |  | Taytay Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Taytay |  | Taytay Rural Health Unit |
| *(System Generated Default)* | PHO | MIMAROPA | Romblon | Romblon |  | Romblon Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Alcantara |  | Alcantara Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Alcantara |  | Alcantara Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Banton |  | Banton Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Banton |  | Banton Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Cajidiocan |  | Cajidiocan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Cajidiocan |  | Cajidiocan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Calatrava |  | Calatrava Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Calatrava |  | Calatrava Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Concepcion |  | Concepcion Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Concepcion |  | Concepcion Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Corcuera |  | Corcuera Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Corcuera |  | Corcuera Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Ferrol |  | Ferrol Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Ferrol |  | Ferrol Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Looc |  | Looc Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Looc |  | Looc Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Magdiwang |  | Magdiwang Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Magdiwang |  | Magdiwang Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Odiongan |  | Odiongan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Odiongan |  | Odiongan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Romblon |  | Romblon Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Romblon |  | Romblon Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | San Agustin |  | San Agustin Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | San Agustin |  | San Agustin Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | San Andres |  | San Andres Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | San Andres |  | San Andres Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | San Fernando |  | San Fernando Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | San Fernando |  | San Fernando Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | San Jose |  | San Jose Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | San Jose |  | San Jose Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Santa Fe |  | Santa Fe Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Santa Fe |  | Santa Fe Rural Health Unit |
| **BICOL** |  |  |  |  |  |  |
| *(System Generated Default)* | Regional Hub | BICOL | Regional | Legazpi City |  | DOH-CHD BICOL |
| *(System Generated Default)* | PHO | BICOL | Albay | Legazpi City |  | Albay Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Bacacay |  | Bacacay Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Albay | Bacacay |  | Bacacay Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Camalig |  | Camalig Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Albay | Camalig |  | Camalig Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Daraga |  | Daraga Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Albay | Daraga |  | Daraga Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Guinobatan |  | Guinobatan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Albay | Guinobatan |  | Guinobatan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Jovellar |  | Jovellar Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Albay | Jovellar |  | Jovellar Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | BICOL | Albay | Legazpi City |  | Legazpi City City Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Libon |  | Libon Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Albay | Libon |  | Libon Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | BICOL | Albay | Ligao |  | Ligao City Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Malilipot |  | Malilipot Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Albay | Malilipot |  | Malilipot Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Malinao |  | Malinao Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Albay | Malinao |  | Malinao Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Manito |  | Manito Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Albay | Manito |  | Manito Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Oas |  | Oas Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Albay | Oas |  | Oas Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Pio Duran |  | Pio Duran Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Albay | Pio Duran |  | Pio Duran Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Polangui |  | Polangui Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Albay | Polangui |  | Polangui Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Rapu-Rapu |  | Rapu-Rapu Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Albay | Rapu-Rapu |  | Rapu-Rapu Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Santo Domingo |  | Santo Domingo Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Albay | Santo Domingo |  | Santo Domingo Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | BICOL | Albay | Tabaco |  | Tabaco City Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Albay | Tiwi |  | Tiwi Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Albay | Tiwi |  | Tiwi Rural Health Unit |
| *(System Generated Default)* | PHO | BICOL | Camarines Norte | Daet |  | Camarines Norte Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Basud |  | Basud Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Basud |  | Basud Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Capalonga |  | Capalonga Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Capalonga |  | Capalonga Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Daet |  | Daet Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Daet |  | Daet Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Jose Panganiban |  | Jose Panganiban Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Jose Panganiban |  | Jose Panganiban Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Labo |  | Labo Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Labo |  | Labo Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Mercedes |  | Mercedes Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Mercedes |  | Mercedes Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Paracale |  | Paracale Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Paracale |  | Paracale Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | San Lorenzo Ruiz |  | San Lorenzo Ruiz Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | San Lorenzo Ruiz |  | San Lorenzo Ruiz Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | San Vicente |  | San Vicente Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | San Vicente |  | San Vicente Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Santa Elena |  | Santa Elena Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Santa Elena |  | Santa Elena Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Talisay |  | Talisay Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Talisay |  | Talisay Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Vinzons |  | Vinzons Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Vinzons |  | Vinzons Rural Health Unit |
| *(System Generated Default)* | PHO | BICOL | Camarines Sur | Pili |  | Camarines Sur Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Baao |  | Baao Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Baao |  | Baao Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Balatan |  | Balatan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Balatan |  | Balatan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Bato |  | Bato Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Bato |  | Bato Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Bombon |  | Bombon Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Bombon |  | Bombon Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Buhi |  | Buhi Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Buhi |  | Buhi Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Bula |  | Bula Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Bula |  | Bula Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Cabusao |  | Cabusao Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Cabusao |  | Cabusao Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Calabanga |  | Calabanga Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Calabanga |  | Calabanga Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Camaligan |  | Camaligan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Camaligan |  | Camaligan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Canaman |  | Canaman Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Canaman |  | Canaman Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Caramoan |  | Caramoan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Caramoan |  | Caramoan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Del Gallego |  | Del Gallego Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Del Gallego |  | Del Gallego Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Gainza |  | Gainza Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Gainza |  | Gainza Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Garchitorena |  | Garchitorena Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Garchitorena |  | Garchitorena Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Goa |  | Goa Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Goa |  | Goa Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | BICOL | Camarines Sur | Iriga |  | Iriga City Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Lagonoy |  | Lagonoy Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Lagonoy |  | Lagonoy Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Libmanan |  | Libmanan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Libmanan |  | Libmanan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Lupi |  | Lupi Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Lupi |  | Lupi Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Magarao |  | Magarao Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Magarao |  | Magarao Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Milaor |  | Milaor Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Milaor |  | Milaor Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Minalabac |  | Minalabac Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Minalabac |  | Minalabac Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Nabua |  | Nabua Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Nabua |  | Nabua Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | BICOL | Camarines Sur | Naga City |  | Naga City City Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Ocampo |  | Ocampo Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Ocampo |  | Ocampo Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Pamplona |  | Pamplona Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Pamplona |  | Pamplona Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Pasacao |  | Pasacao Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Pasacao |  | Pasacao Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Pili |  | Pili Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Pili |  | Pili Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Presentacion |  | Presentacion Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Presentacion |  | Presentacion Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Ragay |  | Ragay Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Ragay |  | Ragay Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Sagñay |  | Sagñay Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Sagñay |  | Sagñay Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | San Fernando |  | San Fernando Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | San Fernando |  | San Fernando Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | San Jose |  | San Jose Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | San Jose |  | San Jose Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Sipocot |  | Sipocot Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Sipocot |  | Sipocot Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Siruma |  | Siruma Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Siruma |  | Siruma Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Tigaon |  | Tigaon Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Tigaon |  | Tigaon Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Tinambac |  | Tinambac Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Tinambac |  | Tinambac Rural Health Unit |
| *(System Generated Default)* | PHO | BICOL | Catanduanes | Virac |  | Catanduanes Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Bagamanoc |  | Bagamanoc Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Bagamanoc |  | Bagamanoc Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Baras |  | Baras Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Baras |  | Baras Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Bato |  | Bato Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Bato |  | Bato Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Caramoran |  | Caramoran Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Caramoran |  | Caramoran Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Gigmoto |  | Gigmoto Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Gigmoto |  | Gigmoto Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Pandan |  | Pandan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Pandan |  | Pandan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Panganiban |  | Panganiban Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Panganiban |  | Panganiban Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | San Andres |  | San Andres Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | San Andres |  | San Andres Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | San Miguel |  | San Miguel Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | San Miguel |  | San Miguel Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Viga |  | Viga Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Viga |  | Viga Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Virac |  | Virac Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Virac |  | Virac Rural Health Unit |
| *(System Generated Default)* | PHO | BICOL | Masbate | Masbate City |  | Masbate Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Aroroy |  | Aroroy Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Aroroy |  | Aroroy Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Baleno |  | Baleno Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Baleno |  | Baleno Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Balud |  | Balud Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Balud |  | Balud Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Batuan |  | Batuan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Batuan |  | Batuan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Cataingan |  | Cataingan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Cataingan |  | Cataingan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Cawayan |  | Cawayan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Cawayan |  | Cawayan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Claveria |  | Claveria Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Claveria |  | Claveria Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Dimasalang |  | Dimasalang Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Dimasalang |  | Dimasalang Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Esperanza |  | Esperanza Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Esperanza |  | Esperanza Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Mandaon |  | Mandaon Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Mandaon |  | Mandaon Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | BICOL | Masbate | Masbate City |  | Masbate City City Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Milagros |  | Milagros Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Milagros |  | Milagros Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Mobo |  | Mobo Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Mobo |  | Mobo Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Monreal |  | Monreal Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Monreal |  | Monreal Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Palanas |  | Palanas Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Palanas |  | Palanas Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Pio V. Corpuz |  | Pio V. Corpuz Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Pio V. Corpuz |  | Pio V. Corpuz Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Placer |  | Placer Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Placer |  | Placer Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | San Fernando |  | San Fernando Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | San Fernando |  | San Fernando Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | San Jacinto |  | San Jacinto Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | San Jacinto |  | San Jacinto Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | San Pascual |  | San Pascual Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | San Pascual |  | San Pascual Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Uson |  | Uson Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Uson |  | Uson Rural Health Unit |
| *(System Generated Default)* | PHO | BICOL | Sorsogon | Sorsogon City |  | Sorsogon Provincial Health Office |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Barcelona |  | Barcelona Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Barcelona |  | Barcelona Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Bulan |  | Bulan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Bulan |  | Bulan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Bulusan |  | Bulusan Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Bulusan |  | Bulusan Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Casiguran |  | Casiguran Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Casiguran |  | Casiguran Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Castilla |  | Castilla Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Castilla |  | Castilla Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Donsol |  | Donsol Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Donsol |  | Donsol Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Gubat |  | Gubat Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Gubat |  | Gubat Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Irosin |  | Irosin Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Irosin |  | Irosin Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Juban |  | Juban Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Juban |  | Juban Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Magallanes |  | Magallanes Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Magallanes |  | Magallanes Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Matnog |  | Matnog Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Matnog |  | Matnog Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Pilar |  | Pilar Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Pilar |  | Pilar Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Prieto Diaz |  | Prieto Diaz Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Prieto Diaz |  | Prieto Diaz Rural Health Unit |
| *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Santa Magdalena |  | Santa Magdalena Municipal Health Office |
| *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Santa Magdalena |  | Santa Magdalena Rural Health Unit |
| *(System Generated Default)* | CHO/LGU | BICOL | Sorsogon | Sorsogon City |  | Sorsogon City City Health Office |

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
| A/R - Batangas - San Antonio BHS | BHS | CALABARZON | Batangas | Batangas City *(Searched Location)* | San Antonio | San Antonio BHS |
| A/R - Batangas - San Isidro BHS | BHS | CALABARZON | Batangas | Batangas City *(Searched Location)* | San Isidro | San Isidro BHS |
| A/R - Batangas - Talahib Payapa BHS | BHS | CALABARZON | Batangas | Batangas City *(Searched Location)* | Talahib Payapa | Talahib Payapa BHS |
| A/R - Batangas - Haligue Kanluran BHS | BHS | CALABARZON | Batangas | Batangas City *(Searched Location)* | Haligue Kanluran | Haligue Kanluran BHS |
| A/R - Batangas - Marawoy BHS | BHS | CALABARZON | Batangas | Lipa *(Searched Location)* | Marawoy | Marawoy BHS |
| A/R - Batangas - Calamias BHS | BHS | CALABARZON | Batangas | Lipa *(Searched Location)* | Calamias | Calamias BHS |
| A/R - Quezon - Cotta BHS | BHS | CALABARZON | Quezon | Lucena City *(Searched Location)* | Cotta | Cotta BHS |
| A/R - Quezon - Gulang-Gulang BHS | BHS | CALABARZON | Quezon | Lucena City *(Searched Location)* | Gulang-Gulang | Gulang-Gulang BHS |
| A/R - Quezon - Ibabang Dupay BHS | BHS | CALABARZON | Quezon | Lucena City *(Searched Location)* | Ibabang Dupay | Ibabang Dupay BHS |
| A/R - Quezon - Isabang BHS | BHS | CALABARZON | Quezon | Lucena City *(Searched Location)* | Isabang | Isabang BHS |
