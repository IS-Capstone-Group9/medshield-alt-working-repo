# MedShield Mapped Client List (Reference)

This document demonstrates how the unstructured raw client data (from the original PDF reference) is transformed into the structured geographic hierarchy required by the MedShield machine learning pipeline. 

By applying the fallback logic, all generic individual accounts and hospitals are anchored to a valid **LGU (City/Municipality)** for model computations, while preserving their original names as UI sub-tags. **To support this fallback logic, the baseline Regional, Provincial, and City/Municipal Health Offices are explicitly instantiated below.**

| **Client Code** | Original Raw Client Name (From PDF) | Client Type | Region | Province | **`lgu_city_muni`** (Model Anchor) | **Barangay** | **`ui_subtag`** / Context |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| |  **NATIONAL & INTERNAL** |  |  |  |  |  |  |
| CLI-0001  A/R - Admin | Internal Admin | National | HQ | MedShield HQ |  | MedShield Internal Administration |
| CLI-0002  A/R - Government | National Govt | National | National | DOH Central |  | DOH Central Office |
| |  **CALABARZON** |  |  |  |  |  |  |
| CLI-0003  *(System Generated Default)* | Regional Hub | CALABARZON | Regional | Quezon City *(Logistical)* |  | DOH-CHD CALABARZON |
| CLI-0004  *(System Generated Default)* | PHO | CALABARZON | Batangas | Batangas City |  | Batangas Provincial Health Office |
| CLI-0005  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Agoncillo |  | Agoncillo Municipal Health Office |
| CLI-0006  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Agoncillo |  | Agoncillo Rural Health Unit |
| CLI-0007  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Alitagtag |  | Alitagtag Municipal Health Office |
| CLI-0008  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Alitagtag |  | Alitagtag Rural Health Unit |
| CLI-0009  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Balayan |  | Balayan Municipal Health Office |
| CLI-0010  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Balayan |  | Balayan Rural Health Unit |
| CLI-0011  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Balete |  | Balete Municipal Health Office |
| CLI-0012  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Balete |  | Balete Rural Health Unit |
| CLI-0013  *(System Generated Default)* | CHO/LGU | CALABARZON | Batangas | Batangas City |  | Batangas City City Health Office |
| CLI-0014  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Bauan |  | Bauan Municipal Health Office |
| CLI-0015  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Bauan |  | Bauan Rural Health Unit |
| CLI-0016  *(System Generated Default)* | CHO/LGU | CALABARZON | Batangas | Calaca |  | Calaca City Health Office |
| CLI-0017  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Calatagan |  | Calatagan Municipal Health Office |
| CLI-0018  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Calatagan |  | Calatagan Rural Health Unit |
| CLI-0019  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Cuenca |  | Cuenca Municipal Health Office |
| CLI-0020  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Cuenca |  | Cuenca Rural Health Unit |
| CLI-0021  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Ibaan |  | Ibaan Municipal Health Office |
| CLI-0022  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Ibaan |  | Ibaan Rural Health Unit |
| CLI-0023  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Laurel |  | Laurel Municipal Health Office |
| CLI-0024  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Laurel |  | Laurel Rural Health Unit |
| CLI-0025  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Lemery |  | Lemery Municipal Health Office |
| CLI-0026  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Lemery |  | Lemery Rural Health Unit |
| CLI-0027  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Lian |  | Lian Municipal Health Office |
| CLI-0028  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Lian |  | Lian Rural Health Unit |
| CLI-0029  *(System Generated Default)* | CHO/LGU | CALABARZON | Batangas | Lipa |  | Lipa City Health Office |
| CLI-0030  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Lobo |  | Lobo Municipal Health Office |
| CLI-0031  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Lobo |  | Lobo Rural Health Unit |
| CLI-0032  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Mabini |  | Mabini Municipal Health Office |
| CLI-0033  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Mabini |  | Mabini Rural Health Unit |
| CLI-0034  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Malvar |  | Malvar Municipal Health Office |
| CLI-0035  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Malvar |  | Malvar Rural Health Unit |
| CLI-0036  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Mataasnakahoy |  | Mataasnakahoy Municipal Health Office |
| CLI-0037  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Mataasnakahoy |  | Mataasnakahoy Rural Health Unit |
| CLI-0038  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Nasugbu |  | Nasugbu Municipal Health Office |
| CLI-0039  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Nasugbu |  | Nasugbu Rural Health Unit |
| CLI-0040  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Padre Garcia |  | Padre Garcia Municipal Health Office |
| CLI-0041  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Padre Garcia |  | Padre Garcia Rural Health Unit |
| CLI-0042  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Rosario |  | Rosario Municipal Health Office |
| CLI-0043  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Rosario |  | Rosario Rural Health Unit |
| CLI-0044  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Jose |  | San Jose Municipal Health Office |
| CLI-0045  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | San Jose |  | San Jose Rural Health Unit |
| CLI-0046  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Juan |  | San Juan Municipal Health Office |
| CLI-0047  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | San Juan |  | San Juan Rural Health Unit |
| CLI-0048  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Luis |  | San Luis Municipal Health Office |
| CLI-0049  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | San Luis |  | San Luis Rural Health Unit |
| CLI-0050  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Nicolas |  | San Nicolas Municipal Health Office |
| CLI-0051  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | San Nicolas |  | San Nicolas Rural Health Unit |
| CLI-0052  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | San Pascual |  | San Pascual Municipal Health Office |
| CLI-0053  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | San Pascual |  | San Pascual Rural Health Unit |
| CLI-0054  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Santa Teresita |  | Santa Teresita Municipal Health Office |
| CLI-0055  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Santa Teresita |  | Santa Teresita Rural Health Unit |
| CLI-0056  *(System Generated Default)* | CHO/LGU | CALABARZON | Batangas | Santo Tomas |  | Santo Tomas City Health Office |
| CLI-0057  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Taal |  | Taal Municipal Health Office |
| CLI-0058  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Taal |  | Taal Rural Health Unit |
| CLI-0059  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Talisay |  | Talisay Municipal Health Office |
| CLI-0060  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Talisay |  | Talisay Rural Health Unit |
| CLI-0061  *(System Generated Default)* | CHO/LGU | CALABARZON | Batangas | Tanauan |  | Tanauan City Health Office |
| CLI-0062  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Taysan |  | Taysan Municipal Health Office |
| CLI-0063  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Taysan |  | Taysan Rural Health Unit |
| CLI-0064  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Tingloy |  | Tingloy Municipal Health Office |
| CLI-0065  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Tingloy |  | Tingloy Rural Health Unit |
| CLI-0066  *(System Generated Default)* | MHO/LGU | CALABARZON | Batangas | Tuy |  | Tuy Municipal Health Office |
| CLI-0067  *(System Generated Default)* | RHU/MHO | CALABARZON | Batangas | Tuy |  | Tuy Rural Health Unit |
| CLI-0068  A/R - Batangas - Gerardo Delos Reyes | Individual/A/R | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* |  | Gerardo Delos Reyes |
| CLI-0069  A/R - Batangas - Norma Cabiliza | Individual/A/R | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* |  | Norma Cabiliza |
| CLI-0070  A/R - Batangas - Ann Denise Codizal Pharmacy | Pharmacy | CALABARZON | Batangas | Balayan *(Searched Location)* |  | Ann Denise Codizal Pharmacy |
| CLI-0071  A/R - Batangas - Botika Estela | Pharmacy | CALABARZON | Batangas | Balayan *(Searched Location)* |  | Botika Estela |
| CLI-0072  A/R - Batangas - DLR Pharmacy | Pharmacy | CALABARZON | Batangas | Calatagan *(Searched Location)* |  | DLR Pharmacy |
| CLI-0073  A/R - Batangas - Maggie and Jojo/ JNJ Pharmacy | Pharmacy | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* |  | Maggie and Jojo/ JNJ Pharmacy |
| CLI-0074  A/R - Batangas - Shooting Star Trading | Retail | CALABARZON | Batangas | Batangas City *(Defaulted to PHO/LGU)* |  | Shooting Star Trading |
| CLI-0075  A/R - Batangas - Divine Care Hospital | Private Hospital | CALABARZON | Batangas | San Juan *(Searched Location)* |  | Divine Care Hospital |
| CLI-0076  *(System Generated Default)* | PHO | CALABARZON | Cavite | Trece Martires |  | Cavite Provincial Health Office |
| CLI-0077  *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Alfonso |  | Alfonso Municipal Health Office |
| CLI-0078  *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Alfonso |  | Alfonso Rural Health Unit |
| CLI-0079  *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Amadeo |  | Amadeo Municipal Health Office |
| CLI-0080  *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Amadeo |  | Amadeo Rural Health Unit |
| CLI-0081  *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | Bacoor |  | Bacoor City Health Office |
| CLI-0082  *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | Carmona |  | Carmona City Health Office |
| CLI-0083  *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | Cavite City |  | Cavite City City Health Office |
| CLI-0084  *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | Dasmariñas |  | Dasmariñas City Health Office |
| CLI-0085  *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | General Emilio Aguinaldo |  | General Emilio Aguinaldo Municipal Health Office |
| CLI-0086  *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | General Emilio Aguinaldo |  | General Emilio Aguinaldo Rural Health Unit |
| CLI-0087  *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | General Mariano Alvarez |  | General Mariano Alvarez Municipal Health Office |
| CLI-0088  *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | General Mariano Alvarez |  | General Mariano Alvarez Rural Health Unit |
| CLI-0089  *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | General Trias |  | General Trias City Health Office |
| CLI-0090  *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | Imus |  | Imus City Health Office |
| CLI-0091  *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Indang |  | Indang Municipal Health Office |
| CLI-0092  *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Indang |  | Indang Rural Health Unit |
| CLI-0093  *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Kawit |  | Kawit Municipal Health Office |
| CLI-0094  *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Kawit |  | Kawit Rural Health Unit |
| CLI-0095  *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Magallanes |  | Magallanes Municipal Health Office |
| CLI-0096  *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Magallanes |  | Magallanes Rural Health Unit |
| CLI-0097  *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Maragondon |  | Maragondon Municipal Health Office |
| CLI-0098  *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Maragondon |  | Maragondon Rural Health Unit |
| CLI-0099  *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Mendez |  | Mendez Municipal Health Office |
| CLI-0100  *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Mendez |  | Mendez Rural Health Unit |
| CLI-0101  *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Naic |  | Naic Municipal Health Office |
| CLI-0102  *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Naic |  | Naic Rural Health Unit |
| CLI-0103  *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Noveleta |  | Noveleta Municipal Health Office |
| CLI-0104  *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Noveleta |  | Noveleta Rural Health Unit |
| CLI-0105  *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Rosario |  | Rosario Municipal Health Office |
| CLI-0106  *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Rosario |  | Rosario Rural Health Unit |
| CLI-0107  *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Silang |  | Silang Municipal Health Office |
| CLI-0108  *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Silang |  | Silang Rural Health Unit |
| CLI-0109  *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | Tagaytay |  | Tagaytay City Health Office |
| CLI-0110  *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Tanza |  | Tanza Municipal Health Office |
| CLI-0111  *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Tanza |  | Tanza Rural Health Unit |
| CLI-0112  *(System Generated Default)* | MHO/LGU | CALABARZON | Cavite | Ternate |  | Ternate Municipal Health Office |
| CLI-0113  *(System Generated Default)* | RHU/MHO | CALABARZON | Cavite | Ternate |  | Ternate Rural Health Unit |
| CLI-0114  *(System Generated Default)* | CHO/LGU | CALABARZON | Cavite | Trece Martires |  | Trece Martires City Health Office |
| CLI-0115  *(System Generated Default)* | PHO | CALABARZON | Laguna | Santa Cruz |  | Laguna Provincial Health Office |
| CLI-0116  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Alaminos |  | Alaminos Municipal Health Office |
| CLI-0117  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Alaminos |  | Alaminos Rural Health Unit |
| CLI-0118  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Bay |  | Bay Municipal Health Office |
| CLI-0119  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Bay |  | Bay Rural Health Unit |
| CLI-0120  *(System Generated Default)* | CHO/LGU | CALABARZON | Laguna | Biñan |  | Biñan City Health Office |
| CLI-0121  *(System Generated Default)* | CHO/LGU | CALABARZON | Laguna | Cabuyao |  | Cabuyao City Health Office |
| CLI-0122  *(System Generated Default)* | CHO/LGU | CALABARZON | Laguna | Calamba |  | Calamba City Health Office |
| CLI-0123  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Calauan |  | Calauan Municipal Health Office |
| CLI-0124  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Calauan |  | Calauan Rural Health Unit |
| CLI-0125  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Cavinti |  | Cavinti Municipal Health Office |
| CLI-0126  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Cavinti |  | Cavinti Rural Health Unit |
| CLI-0127  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Famy |  | Famy Municipal Health Office |
| CLI-0128  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Famy |  | Famy Rural Health Unit |
| CLI-0129  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Kalayaan |  | Kalayaan Municipal Health Office |
| CLI-0130  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Kalayaan |  | Kalayaan Rural Health Unit |
| CLI-0131  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Liliw |  | Liliw Municipal Health Office |
| CLI-0132  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Liliw |  | Liliw Rural Health Unit |
| CLI-0133  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Los Baños |  | Los Baños Municipal Health Office |
| CLI-0134  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Los Baños |  | Los Baños Rural Health Unit |
| CLI-0135  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Luisiana |  | Luisiana Municipal Health Office |
| CLI-0136  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Luisiana |  | Luisiana Rural Health Unit |
| CLI-0137  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Lumban |  | Lumban Municipal Health Office |
| CLI-0138  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Lumban |  | Lumban Rural Health Unit |
| CLI-0139  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Mabitac |  | Mabitac Municipal Health Office |
| CLI-0140  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Mabitac |  | Mabitac Rural Health Unit |
| CLI-0141  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Magdalena |  | Magdalena Municipal Health Office |
| CLI-0142  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Magdalena |  | Magdalena Rural Health Unit |
| CLI-0143  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Majayjay |  | Majayjay Municipal Health Office |
| CLI-0144  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Majayjay |  | Majayjay Rural Health Unit |
| CLI-0145  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Nagcarlan |  | Nagcarlan Municipal Health Office |
| CLI-0146  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Nagcarlan |  | Nagcarlan Rural Health Unit |
| CLI-0147  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Paete |  | Paete Municipal Health Office |
| CLI-0148  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Paete |  | Paete Rural Health Unit |
| CLI-0149  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Pagsanjan |  | Pagsanjan Municipal Health Office |
| CLI-0150  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Pagsanjan |  | Pagsanjan Rural Health Unit |
| CLI-0151  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Pakil |  | Pakil Municipal Health Office |
| CLI-0152  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Pakil |  | Pakil Rural Health Unit |
| CLI-0153  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Pangil |  | Pangil Municipal Health Office |
| CLI-0154  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Pangil |  | Pangil Rural Health Unit |
| CLI-0155  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Pila |  | Pila Municipal Health Office |
| CLI-0156  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Pila |  | Pila Rural Health Unit |
| CLI-0157  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Rizal |  | Rizal Municipal Health Office |
| CLI-0158  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Rizal |  | Rizal Rural Health Unit |
| CLI-0159  *(System Generated Default)* | CHO/LGU | CALABARZON | Laguna | San Pablo |  | San Pablo City Health Office |
| CLI-0160  *(System Generated Default)* | CHO/LGU | CALABARZON | Laguna | San Pedro |  | San Pedro City Health Office |
| CLI-0161  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Santa Cruz |  | Santa Cruz Municipal Health Office |
| CLI-0162  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Santa Cruz |  | Santa Cruz Rural Health Unit |
| CLI-0163  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Santa Maria |  | Santa Maria Municipal Health Office |
| CLI-0164  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Santa Maria |  | Santa Maria Rural Health Unit |
| CLI-0165  *(System Generated Default)* | CHO/LGU | CALABARZON | Laguna | Santa Rosa |  | Santa Rosa City Health Office |
| CLI-0166  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Siniloan |  | Siniloan Municipal Health Office |
| CLI-0167  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Siniloan |  | Siniloan Rural Health Unit |
| CLI-0168  *(System Generated Default)* | MHO/LGU | CALABARZON | Laguna | Victoria |  | Victoria Municipal Health Office |
| CLI-0169  *(System Generated Default)* | RHU/MHO | CALABARZON | Laguna | Victoria |  | Victoria Rural Health Unit |
| CLI-0170  *(System Generated Default)* | PHO | CALABARZON | Quezon | Lucena City |  | Quezon Provincial Health Office |
| CLI-0171  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Agdangan |  | Agdangan Municipal Health Office |
| CLI-0172  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Agdangan |  | Agdangan Rural Health Unit |
| CLI-0173  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Alabat |  | Alabat Municipal Health Office |
| CLI-0174  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Alabat |  | Alabat Rural Health Unit |
| CLI-0175  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Atimonan |  | Atimonan Municipal Health Office |
| CLI-0176  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Atimonan |  | Atimonan Rural Health Unit |
| CLI-0177  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Buenavista |  | Buenavista Municipal Health Office |
| CLI-0178  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Buenavista |  | Buenavista Rural Health Unit |
| CLI-0179  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Burdeos |  | Burdeos Municipal Health Office |
| CLI-0180  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Burdeos |  | Burdeos Rural Health Unit |
| CLI-0181  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Calauag |  | Calauag Municipal Health Office |
| CLI-0182  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Calauag |  | Calauag Rural Health Unit |
| CLI-0183  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Candelaria |  | Candelaria Municipal Health Office |
| CLI-0184  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Candelaria |  | Candelaria Rural Health Unit |
| CLI-0185  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Catanauan |  | Catanauan Municipal Health Office |
| CLI-0186  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Catanauan |  | Catanauan Rural Health Unit |
| CLI-0187  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Dolores |  | Dolores Municipal Health Office |
| CLI-0188  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Dolores |  | Dolores Rural Health Unit |
| CLI-0189  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | General Luna |  | General Luna Municipal Health Office |
| CLI-0190  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | General Luna |  | General Luna Rural Health Unit |
| CLI-0191  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | General Nakar |  | General Nakar Municipal Health Office |
| CLI-0192  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | General Nakar |  | General Nakar Rural Health Unit |
| CLI-0193  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Guinayangan |  | Guinayangan Municipal Health Office |
| CLI-0194  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Guinayangan |  | Guinayangan Rural Health Unit |
| CLI-0195  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Gumaca |  | Gumaca Municipal Health Office |
| CLI-0196  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Gumaca |  | Gumaca Rural Health Unit |
| CLI-0197  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Infanta |  | Infanta Municipal Health Office |
| CLI-0198  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Infanta |  | Infanta Rural Health Unit |
| CLI-0199  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Jomalig |  | Jomalig Municipal Health Office |
| CLI-0200  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Jomalig |  | Jomalig Rural Health Unit |
| CLI-0201  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Lopez |  | Lopez Municipal Health Office |
| CLI-0202  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Lopez |  | Lopez Rural Health Unit |
| CLI-0203  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Lucban |  | Lucban Municipal Health Office |
| CLI-0204  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Lucban |  | Lucban Rural Health Unit |
| CLI-0205  *(System Generated Default)* | CHO/LGU | CALABARZON | Quezon | Lucena City |  | Lucena City City Health Office |
| CLI-0206  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Macalelon |  | Macalelon Municipal Health Office |
| CLI-0207  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Macalelon |  | Macalelon Rural Health Unit |
| CLI-0208  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Mauban |  | Mauban Municipal Health Office |
| CLI-0209  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Mauban |  | Mauban Rural Health Unit |
| CLI-0210  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Mulanay |  | Mulanay Municipal Health Office |
| CLI-0211  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Mulanay |  | Mulanay Rural Health Unit |
| CLI-0212  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Padre Burgos |  | Padre Burgos Municipal Health Office |
| CLI-0213  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Padre Burgos |  | Padre Burgos Rural Health Unit |
| CLI-0214  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Pagbilao |  | Pagbilao Municipal Health Office |
| CLI-0215  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Pagbilao |  | Pagbilao Rural Health Unit |
| CLI-0216  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Panukulan |  | Panukulan Municipal Health Office |
| CLI-0217  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Panukulan |  | Panukulan Rural Health Unit |
| CLI-0218  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Patnanungan |  | Patnanungan Municipal Health Office |
| CLI-0219  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Patnanungan |  | Patnanungan Rural Health Unit |
| CLI-0220  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Perez |  | Perez Municipal Health Office |
| CLI-0221  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Perez |  | Perez Rural Health Unit |
| CLI-0222  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Pitogo |  | Pitogo Municipal Health Office |
| CLI-0223  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Pitogo |  | Pitogo Rural Health Unit |
| CLI-0224  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Plaridel |  | Plaridel Municipal Health Office |
| CLI-0225  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Plaridel |  | Plaridel Rural Health Unit |
| CLI-0226  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Polillo |  | Polillo Municipal Health Office |
| CLI-0227  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Polillo |  | Polillo Rural Health Unit |
| CLI-0228  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Quezon |  | Quezon Municipal Health Office |
| CLI-0229  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Quezon |  | Quezon Rural Health Unit |
| CLI-0230  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Real |  | Real Municipal Health Office |
| CLI-0231  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Real |  | Real Rural Health Unit |
| CLI-0232  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Sampaloc |  | Sampaloc Municipal Health Office |
| CLI-0233  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Sampaloc |  | Sampaloc Rural Health Unit |
| CLI-0234  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | San Andres |  | San Andres Municipal Health Office |
| CLI-0235  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | San Andres |  | San Andres Rural Health Unit |
| CLI-0236  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | San Antonio |  | San Antonio Municipal Health Office |
| CLI-0237  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | San Antonio |  | San Antonio Rural Health Unit |
| CLI-0238  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | San Francisco |  | San Francisco Municipal Health Office |
| CLI-0239  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | San Francisco |  | San Francisco Rural Health Unit |
| CLI-0240  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | San Narciso |  | San Narciso Municipal Health Office |
| CLI-0241  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | San Narciso |  | San Narciso Rural Health Unit |
| CLI-0242  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Sariaya |  | Sariaya Municipal Health Office |
| CLI-0243  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Sariaya |  | Sariaya Rural Health Unit |
| CLI-0244  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Tagkawayan |  | Tagkawayan Municipal Health Office |
| CLI-0245  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Tagkawayan |  | Tagkawayan Rural Health Unit |
| CLI-0246  *(System Generated Default)* | CHO/LGU | CALABARZON | Quezon | Tayabas |  | Tayabas City Health Office |
| CLI-0247  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Tiaong |  | Tiaong Municipal Health Office |
| CLI-0248  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Tiaong |  | Tiaong Rural Health Unit |
| CLI-0249  *(System Generated Default)* | MHO/LGU | CALABARZON | Quezon | Unisan |  | Unisan Municipal Health Office |
| CLI-0250  *(System Generated Default)* | RHU/MHO | CALABARZON | Quezon | Unisan |  | Unisan Rural Health Unit |
| CLI-0251  A/R - Quezon - Augustina Cabangon | Govt Hospital | CALABARZON | Quezon | Lucena City *(Searched Location)* |  | Augustina Cabangon |
| CLI-0252  A/R - Quezon - Aurea Cadacio | BHS / Midwife | CALABARZON | Quezon | Sariaya *(Searched Location)* |  | Aurea Cadacio |
| CLI-0253  A/R - Quezon - Bridgette Inocencio | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Bridgette Inocencio |
| CLI-0254  A/R - Quezon - Cherry Espinosa | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Cherry Espinosa |
| CLI-0255  A/R - Quezon - Corazon Arroyo | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Corazon Arroyo |
| CLI-0256  A/R - Quezon - Danilo Olitoquit | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Danilo Olitoquit |
| CLI-0257  A/R - Quezon - Emeline Olaivar | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Emeline Olaivar |
| CLI-0258  A/R - Quezon - Emma Zoleta | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Emma Zoleta |
| CLI-0259  A/R - Quezon - Ester Vergara | Clinic | CALABARZON | Quezon | Candelaria *(Searched Location)* |  | Ester Vergara |
| CLI-0260  A/R - Quezon - Glenda Lao | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Glenda Lao |
| CLI-0261  A/R - Quezon - Gloria Liwanag | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Gloria Liwanag |
| CLI-0262  A/R - Quezon - Graciela Derada Deleon | Clinic | CALABARZON | Quezon | Tayabas *(Searched Location)* |  | Graciela Derada Deleon |
| CLI-0263  A/R - Quezon - Honorata Pañebe | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Honorata Pañebe |
| CLI-0264  A/R - Quezon - Isabel Oliveros | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Isabel Oliveros |
| CLI-0265  A/R - Quezon - Janice Mercado | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Janice Mercado |
| CLI-0266  A/R - Quezon - Javierto Reynoso | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Javierto Reynoso |
| CLI-0267  A/R - Quezon - Jesus Comia | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Jesus Comia |
| CLI-0268  A/R - Quezon - Jing Marasigan | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Jing Marasigan |
| CLI-0269  A/R - Quezon - Juanita Tan | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Juanita Tan |
| CLI-0270  A/R - Quezon - Lanie Atienza | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Lanie Atienza |
| CLI-0271  A/R - Quezon - Lelette Gamboa | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Lelette Gamboa |
| CLI-0272  A/R - Quezon - Liza Defeo | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Liza Defeo |
| CLI-0273  A/R - Quezon - Liza Maranan | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Liza Maranan |
| CLI-0274  A/R - Quezon - Lovella Alava | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Lovella Alava |
| CLI-0275  A/R - Quezon - Ma Victoria Ayag | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Ma Victoria Ayag |
| CLI-0276  A/R - Quezon - Mary Aileen Morales | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Mary Aileen Morales |
| CLI-0277  A/R - Quezon - Melissa Abbariao | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Melissa Abbariao |
| CLI-0278  A/R - Quezon - Mercy Reyes | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Mercy Reyes |
| CLI-0279  A/R - Quezon - Noemi Francisco | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Noemi Francisco |
| CLI-0280  A/R - Quezon - Petronillo Faller | Clinic | CALABARZON | Quezon | Lucban *(Searched Location)* |  | Petronillo Faller |
| CLI-0281  A/R - Quezon - Ramon Nieva | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Ramon Nieva |
| CLI-0282  A/R - Quezon - Reggie Revilla | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Reggie Revilla |
| CLI-0283  A/R - Quezon - Rodel Redor | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Rodel Redor |
| CLI-0284  A/R - Quezon - Rodolfo Rañola | Clinic | CALABARZON | Quezon | Lucban *(Searched Location)* |  | Rodolfo Rañola |
| CLI-0285  A/R - Quezon - Roly Dela Peña | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Roly Dela Peña |
| CLI-0286  A/R - Quezon - Rosalina Bautista | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Rosalina Bautista |
| CLI-0287  A/R - Quezon - Rufinita Soquilla | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Rufinita Soquilla |
| CLI-0288  A/R - Quezon - Severina Escondo | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Severina Escondo |
| CLI-0289  A/R - Quezon - Teresa Tan | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Teresa Tan |
| CLI-0290  A/R - Quezon - BLB Botika | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | BLB Botika |
| CLI-0291  A/R - Quezon - Bon Pharmacy | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Bon Pharmacy |
| CLI-0292  A/R - Quezon - Century Drug | Pharmacy | CALABARZON | Quezon | Atimonan *(Searched Location)* |  | Century Drug |
| CLI-0293  A/R - Quezon - DCP Pharmacy | Pharmacy | CALABARZON | Quezon | Agdangan *(Searched Location)* |  | DCP Pharmacy |
| CLI-0294  A/R - Quezon - Eastern Drug | Pharmacy | CALABARZON | Quezon | Gumaca *(Searched Location)* |  | Eastern Drug |
| CLI-0295  A/R - Quezon - Gumaca District Cooperative | Cooperative | CALABARZON | Quezon | Gumaca |  | Gumaca District Cooperative |
| CLI-0296  A/R - Quezon - KKK Pharmacy | Pharmacy | CALABARZON | Quezon | Padre Burgos *(Searched Location)* |  | KKK Pharmacy |
| CLI-0297  A/R - Quezon - Megawide | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Megawide |
| CLI-0298  A/R - Quezon - Pagkatipunan Drugstore | Pharmacy | CALABARZON | Quezon | Lucena City *(Searched Location)* |  | Pagkatipunan Drugstore |
| CLI-0299  A/R - Quezon - Perez Drug | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Perez Drug |
| CLI-0300  A/R - Quezon - RSV Pharmacy | Pharmacy | CALABARZON | Quezon | Candelaria *(Searched Location)* |  | RSV Pharmacy |
| CLI-0301  A/R - Quezon - Vickys Pharmacy | Pharmacy | CALABARZON | Quezon | Lucena City *(Searched Location)* |  | Vickys Pharmacy |
| CLI-0302  A/R - Quezon - Winjoy Pharmacy | Pharmacy | CALABARZON | Quezon | Lopez *(Searched Location)* |  | Winjoy Pharmacy |
| CLI-0303  A/R - Quezon - Ma. Cecile Aure | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Ma. Cecile Aure |
| CLI-0304  A/R - Quezon - Cherrylyn Barola | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Cherrylyn Barola |
| CLI-0305  A/R - Quezon - Mt Carmel General Hospital | Private Hospital | CALABARZON | Quezon | Lucena City | Brgy. 4 | Mt Carmel General Hospital |
| CLI-0306  A/R - Quezon - RAKKK Prophet | Private Hospital | CALABARZON | Quezon | Gumaca *(Searched Location)* |  | RAKKK Prophet |
| CLI-0307  A/R - Quezon - Herminia Laguador | Clinic | CALABARZON | Quezon | Lucban *(Searched Location)* |  | Herminia Laguador |
| CLI-0308  A/R - Quezon - Madel Fetisa | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Madel Fetisa |
| CLI-0309  A/R - Quezon - Constancia Catarroja | RHU/MHO | CALABARZON | Quezon | Sariaya *(Searched Location)* |  | Constancia Catarroja |
| CLI-0310  A/R - Quezon - BEMONC RHU Sariaya | RHU | CALABARZON | Quezon | Sariaya |  | BEMONC RHU Sariaya |
| CLI-0311  A/R - Quezon - Urbano Oliveros | Clinic | CALABARZON | Quezon | Lucena City *(Searched Location)* |  | Urbano Oliveros |
| CLI-0312  A/R - Quezon - Brgy Canda Health Center | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Brgy Canda Health Center |
| CLI-0313  A/R - Quezon - Bricor Pharmacy | Pharmacy | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Bricor Pharmacy |
| CLI-0314  A/R - Quezon - Severina Nadres | Clinic | CALABARZON | Quezon | Tayabas *(Searched Location)* |  | Severina Nadres |
| CLI-0315  A/R - Quezon - AMCA Drug | Pharmacy | CALABARZON | Quezon | Catanauan *(Searched Location)* |  | AMCA Drug |
| CLI-0316  A/R - Quezon - Dr Jessabeth Mercado | Govt Hospital | CALABARZON | Quezon | Lucena City *(Searched Location)* |  | Dr Jessabeth Mercado |
| CLI-0317  A/R - Quezon - Dr. Florcerel Malay | Private Hospital | CALABARZON | Quezon | Sariaya *(Searched Location)* |  | Dr. Florcerel Malay |
| CLI-0318  A/R - Quezon - Dr. Teresa Tagarao | Private Hospital | CALABARZON | Quezon | Lopez *(Searched Location)* |  | Dr. Teresa Tagarao |
| CLI-0319  A/R - Quezon - Dr. Victorino Araña | RHU | CALABARZON | Quezon | Lucban *(Searched Location)* |  | Dr. Victorino Araña |
| CLI-0320  A/R - Quezon - NSDR Birthing Home | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | NSDR Birthing Home |
| CLI-0321  A/R - Quezon - Dr. Gilbert Lafuente | Clinic | CALABARZON | Quezon | Padre Burgos *(Searched Location)* |  | Dr. Gilbert Lafuente |
| CLI-0322  A/R - Quezon - Sampaloc Lying Inn | Lying Inn | CALABARZON | Quezon | Sampaloc |  | Sampaloc Lying Inn |
| CLI-0323  A/R - Quezon - Unihealth Quezon (Medicine) | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Unihealth Quezon (Medicine) |
| CLI-0324  A/R - Quezon - Tumbaga Birthing Home | Birthing Home | CALABARZON | Quezon | Sariaya *(Searched Location)* |  | Tumbaga Birthing Home |
| CLI-0325  A/R - Quezon - Brgy Health Station Sampaloc 1 | BHS | CALABARZON | Quezon | Sampaloc |  | Brgy Health Station Sampaloc 1 |
| CLI-0326  A/R - Quezon - Raquel Samodio | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Raquel Samodio |
| CLI-0327  A/R - Quezon - Asuncion Rañeses | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Asuncion Rañeses |
| CLI-0328  A/R - Quezon - Lopez St Jude General Hospital | Private Hospital | CALABARZON | Quezon | Lopez |  | Lopez St Jude General Hospital |
| CLI-0329  A/R - Quezon - Dra. Cherry Bacungan | Private Hospital | CALABARZON | Quezon | Lucena City *(Searched Location)* |  | Dra. Cherry Bacungan |
| CLI-0330  A/R - Quezon - Dr. Maribel Nosce | Clinic | CALABARZON | Quezon | Lucena City *(Searched Location)* |  | Dr. Maribel Nosce |
| CLI-0331  A/R - Quezon - Zoleta Birthing Home | Birthing Home | CALABARZON | Quezon | San Antonio *(Searched Location)* |  | Zoleta Birthing Home |
| CLI-0332  A/R - Quezon - Hiyasmin Birthing Home | Birthing Home | CALABARZON | Quezon | Tayabas *(Searched Location)* |  | Hiyasmin Birthing Home |
| CLI-0333  A/R - Quezon - Nativity of Jesus Birthing Clinic | Birthing Home | CALABARZON | Quezon | Sariaya *(Searched Location)* |  | Nativity of Jesus Birthing Clinic |
| CLI-0334  A/R - Quezon - Gulang Gulang National High School | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Gulang Gulang National High School |
| CLI-0335  A/R - Hospital - Lucena MMG Hospital | Govt Hospital | CALABARZON | Quezon | Lucena City | Brgy. Ibabang Dupay | Lucena MMG Hospital |
| CLI-0336  A/R - Hospital - Peter Paul Medical Center of Candelaria | Govt Hospital | CALABARZON | Quezon | Candelaria | Pahinga Norte | Peter Paul Medical Center of Candelaria |
| CLI-0337  A/R - Hospital - Quezon Medical Center | Govt Hospital | CALABARZON | Quezon | Lucena City | Brgy. 11 | Quezon Medical Center |
| CLI-0338  A/R - Hospital - Unihealth Quezon (Hospital Medicines) | Govt Hospital | CALABARZON | Quezon | Lucena City |  | Unihealth Quezon (Hospital Medicines) |
| CLI-0339  A/R - Hospital - Lucena United Doctors Hospital | Govt Hospital | CALABARZON | Quezon | Lucena City | Brgy. Isabang | Lucena United Doctors Hospital |
| CLI-0340  A/R - D3 - LGU - Pagbilao | LGU | CALABARZON | Quezon | Pagbilao |  | Pagbilao |
| CLI-0341  A/R - D3 - District - Bondoc Peninsula District Hospital, Catanauan | Govt Hospital | CALABARZON | Quezon | Catanauan |  | Bondoc Peninsula District Hospital, Catanauan |
| CLI-0342  A/R - D3 - District - Candelaria Municipal Hospital, Candelaria | Govt Hospital | CALABARZON | Quezon | Candelaria |  | Candelaria Municipal Hospital, Candelaria |
| CLI-0343  A/R - D3 - District - Guinyangan Medicare Community Hospital, Guinyangan | Govt Hospital | CALABARZON | Quezon | Guinayangan |  | Guinyangan Medicare Community Hospital, Guinyangan |
| CLI-0344  A/R - D3 - District - Gumaca District Hospital, Gumaca | Govt Hospital | CALABARZON | Quezon | Gumaca | Rosario | Gumaca District Hospital, Gumaca |
| CLI-0345  A/R - D3 - District - Claro M. Recto District Hospital, Infanta | Govt Hospital | CALABARZON | Quezon | Infanta |  | Claro M. Recto District Hospital, Infanta |
| CLI-0346  A/R - D3 - District - Doña Marta Memorial Hospital, Atimonan | Govt Hospital | CALABARZON | Quezon | Atimonan |  | Doña Marta Memorial Hospital, Atimonan |
| CLI-0347  A/R - D3 - District - Mauban District Hospital, Mauban | Govt Hospital | CALABARZON | Quezon | Mauban |  | Mauban District Hospital, Mauban |
| CLI-0348  A/R - D3 - District - Magsaysay Memorial District Hospital, Lopez | Govt Hospital | CALABARZON | Quezon | Lopez | Gomez | Magsaysay Memorial District Hospital, Lopez |
| CLI-0349  A/R - D3 - District - Maria Eleazar District Hospital, Tagkawayan | Govt Hospital | CALABARZON | Quezon | Tagkawayan |  | Maria Eleazar District Hospital, Tagkawayan |
| CLI-0350  A/R - D3 - District - Polilio Medicare Hospital, Polilio | Govt Hospital | CALABARZON | Quezon | Polillo |  | Polilio Medicare Hospital, Polilio |
| CLI-0351  A/R - D3 - District - Sampaloc Medicare Community Hospital, Sampaloc | Lying Inn | CALABARZON | Quezon | Sampaloc |  | Sampaloc Medicare Community Hospital, Sampaloc |
| CLI-0352  A/R - D3 - District - San Francisco Municipal Hospital, San Francisco | Govt Hospital | CALABARZON | Quezon | San Francisco | Poblacion | San Francisco Municipal Hospital, San Francisco |
| CLI-0353  A/R - D3 - District - Unisan Medicare Community Hospital, Unisan | Govt Hospital | CALABARZON | Quezon | Unisan |  | Unisan Medicare Community Hospital, Unisan |
| CLI-0354  A/R - D3 - District - IPHO | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | IPHO |
| CLI-0355  A/R - D3 - District - Alabat Island District Hospital | Govt Hospital | CALABARZON | Quezon | Alabat |  | Alabat Island District Hospital |
| CLI-0356  A/R - D3 - District - Provincial Tourism Office | Individual/A/R | CALABARZON | Quezon | Lucena City *(Defaulted to PHO/LGU)* |  | Provincial Tourism Office |
| CLI-0357  *(System Generated Default)* | PHO | CALABARZON | Rizal | Antipolo |  | Rizal Provincial Health Office |
| CLI-0358  *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Angono |  | Angono Municipal Health Office |
| CLI-0359  *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Angono |  | Angono Rural Health Unit |
| CLI-0360  *(System Generated Default)* | CHO/LGU | CALABARZON | Rizal | Antipolo |  | Antipolo City Health Office |
| CLI-0361  *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Baras |  | Baras Municipal Health Office |
| CLI-0362  *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Baras |  | Baras Rural Health Unit |
| CLI-0363  *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Binangonan |  | Binangonan Municipal Health Office |
| CLI-0364  *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Binangonan |  | Binangonan Rural Health Unit |
| CLI-0365  *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Cainta |  | Cainta Municipal Health Office |
| CLI-0366  *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Cainta |  | Cainta Rural Health Unit |
| CLI-0367  *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Cardona |  | Cardona Municipal Health Office |
| CLI-0368  *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Cardona |  | Cardona Rural Health Unit |
| CLI-0369  *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Jalajala |  | Jalajala Municipal Health Office |
| CLI-0370  *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Jalajala |  | Jalajala Rural Health Unit |
| CLI-0371  *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Morong |  | Morong Municipal Health Office |
| CLI-0372  *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Morong |  | Morong Rural Health Unit |
| CLI-0373  *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Pililla |  | Pililla Municipal Health Office |
| CLI-0374  *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Pililla |  | Pililla Rural Health Unit |
| CLI-0375  *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Rodriguez |  | Rodriguez Municipal Health Office |
| CLI-0376  *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Rodriguez |  | Rodriguez Rural Health Unit |
| CLI-0377  *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | San Mateo |  | San Mateo Municipal Health Office |
| CLI-0378  *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | San Mateo |  | San Mateo Rural Health Unit |
| CLI-0379  *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Tanay |  | Tanay Municipal Health Office |
| CLI-0380  *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Tanay |  | Tanay Rural Health Unit |
| CLI-0381  *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Taytay |  | Taytay Municipal Health Office |
| CLI-0382  *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Taytay |  | Taytay Rural Health Unit |
| CLI-0383  *(System Generated Default)* | MHO/LGU | CALABARZON | Rizal | Teresa |  | Teresa Municipal Health Office |
| CLI-0384  *(System Generated Default)* | RHU/MHO | CALABARZON | Rizal | Teresa |  | Teresa Rural Health Unit |
| |  **MIMAROPA** |  |  |  |  |  |  |
| CLI-0385  *(System Generated Default)* | Regional Hub | MIMAROPA | Regional | Quezon City *(Logistical)* |  | DOH-CHD MIMAROPA |
| CLI-0386  *(System Generated Default)* | PHO | MIMAROPA | Marinduque | Boac |  | Marinduque Provincial Health Office |
| CLI-0387  *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Boac |  | Boac Municipal Health Office |
| CLI-0388  *(System Generated Default)* | RHU/MHO | MIMAROPA | Marinduque | Boac |  | Boac Rural Health Unit |
| CLI-0389  *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Buenavista |  | Buenavista Municipal Health Office |
| CLI-0390  *(System Generated Default)* | RHU/MHO | MIMAROPA | Marinduque | Buenavista |  | Buenavista Rural Health Unit |
| CLI-0391  *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Gasan |  | Gasan Municipal Health Office |
| CLI-0392  *(System Generated Default)* | RHU/MHO | MIMAROPA | Marinduque | Gasan |  | Gasan Rural Health Unit |
| CLI-0393  *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Mogpog |  | Mogpog Municipal Health Office |
| CLI-0394  *(System Generated Default)* | RHU/MHO | MIMAROPA | Marinduque | Mogpog |  | Mogpog Rural Health Unit |
| CLI-0395  *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Santa Cruz |  | Santa Cruz Municipal Health Office |
| CLI-0396  *(System Generated Default)* | RHU/MHO | MIMAROPA | Marinduque | Santa Cruz |  | Santa Cruz Rural Health Unit |
| CLI-0397  *(System Generated Default)* | MHO/LGU | MIMAROPA | Marinduque | Torrijos |  | Torrijos Municipal Health Office |
| CLI-0398  *(System Generated Default)* | RHU/MHO | MIMAROPA | Marinduque | Torrijos |  | Torrijos Rural Health Unit |
| CLI-0399  A/R - Marinduque - Arlene Nebreja | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Arlene Nebreja |
| CLI-0400  A/R - Marinduque - Arlie Vertucio | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Arlie Vertucio |
| CLI-0401  A/R - Marinduque - Catherine Sadiwa | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Catherine Sadiwa |
| CLI-0402  A/R - Marinduque - Florito Aliasas | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Florito Aliasas |
| CLI-0403  A/R - Marinduque - Imelda Parado | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Imelda Parado |
| CLI-0404  A/R - Marinduque - Julia Masangkay | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Julia Masangkay |
| CLI-0405  A/R - Marinduque - Lani Dela Santa | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Lani Dela Santa |
| CLI-0406  A/R - Marinduque - Lorena Quing | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Lorena Quing |
| CLI-0407  A/R - Marinduque - Manuel Narciso | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Manuel Narciso |
| CLI-0408  A/R - Marinduque - Margarita Montellano | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Margarita Montellano |
| CLI-0409  A/R - Marinduque - Rey Richard Sore | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Rey Richard Sore |
| CLI-0410  A/R - Marinduque - Teodolfo Rejano | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Teodolfo Rejano |
| CLI-0411  A/R - Marinduque - JRM - RMV Pharmacy | Pharmacy | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | RMV Pharmacy |
| CLI-0412  A/R - Marinduque - MPH Cooperative | Cooperative | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | MPH Cooperative |
| CLI-0413  A/R - Marinduque - St. Rose of Lima | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | St. Rose of Lima |
| CLI-0414  A/R - Marinduque - WH Pharmacy | Pharmacy | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | WH Pharmacy |
| CLI-0415  A/R - Marinduque - Torrijos Municipal Hall | Govt | MIMAROPA | Marinduque | Torrijos |  | Torrijos Municipal Hall |
| CLI-0416  A/R - Marinduque - Provincial Government of Marinduque | Govt | MIMAROPA | Marinduque | Boac *(Provincial Capital Default)* |  | Provincial Government of Marinduque |
| CLI-0417  A/R - Marinduque - Dr. Esmeralda Calayag | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Dr. Esmeralda Calayag |
| CLI-0418  A/R - Marinduque - Dr. Alfred Saldaña | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Dr. Alfred Saldaña |
| CLI-0419  A/R - Marinduque - Dr. Alex Cruz | Individual/A/R | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | Dr. Alex Cruz |
| CLI-0420  A/R - Marinduque - L.Pergis Pharmacy | Pharmacy | MIMAROPA | Marinduque | Boac *(Defaulted to PHO)* |  | L.Pergis Pharmacy |
| CLI-0421  *(System Generated Default)* | PHO | MIMAROPA | Occidental Mindoro | Mamburao |  | Occidental Mindoro Provincial Health Office |
| CLI-0422  *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Abra de Ilog |  | Abra de Ilog Municipal Health Office |
| CLI-0423  *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Abra de Ilog |  | Abra de Ilog Rural Health Unit |
| CLI-0424  *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Calintaan |  | Calintaan Municipal Health Office |
| CLI-0425  *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Calintaan |  | Calintaan Rural Health Unit |
| CLI-0426  *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Looc |  | Looc Municipal Health Office |
| CLI-0427  *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Looc |  | Looc Rural Health Unit |
| CLI-0428  *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Lubang |  | Lubang Municipal Health Office |
| CLI-0429  *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Lubang |  | Lubang Rural Health Unit |
| CLI-0430  *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Magsaysay |  | Magsaysay Municipal Health Office |
| CLI-0431  *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Magsaysay |  | Magsaysay Rural Health Unit |
| CLI-0432  *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Mamburao |  | Mamburao Municipal Health Office |
| CLI-0433  *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Mamburao |  | Mamburao Rural Health Unit |
| CLI-0434  *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Paluan |  | Paluan Municipal Health Office |
| CLI-0435  *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Paluan |  | Paluan Rural Health Unit |
| CLI-0436  *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Rizal |  | Rizal Municipal Health Office |
| CLI-0437  *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Rizal |  | Rizal Rural Health Unit |
| CLI-0438  *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Sablayan |  | Sablayan Municipal Health Office |
| CLI-0439  *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Sablayan |  | Sablayan Rural Health Unit |
| CLI-0440  *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | San Jose |  | San Jose Municipal Health Office |
| CLI-0441  *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | San Jose |  | San Jose Rural Health Unit |
| CLI-0442  *(System Generated Default)* | MHO/LGU | MIMAROPA | Occidental Mindoro | Santa Cruz |  | Santa Cruz Municipal Health Office |
| CLI-0443  *(System Generated Default)* | RHU/MHO | MIMAROPA | Occidental Mindoro | Santa Cruz |  | Santa Cruz Rural Health Unit |
| CLI-0444  *(System Generated Default)* | PHO | MIMAROPA | Oriental Mindoro | Calapan |  | Oriental Mindoro Provincial Health Office |
| CLI-0445  *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Baco |  | Baco Municipal Health Office |
| CLI-0446  *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Baco |  | Baco Rural Health Unit |
| CLI-0447  *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Bansud |  | Bansud Municipal Health Office |
| CLI-0448  *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Bansud |  | Bansud Rural Health Unit |
| CLI-0449  *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Bongabong |  | Bongabong Municipal Health Office |
| CLI-0450  *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Bongabong |  | Bongabong Rural Health Unit |
| CLI-0451  *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Bulalacao |  | Bulalacao Municipal Health Office |
| CLI-0452  *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Bulalacao |  | Bulalacao Rural Health Unit |
| CLI-0453  *(System Generated Default)* | CHO/LGU | MIMAROPA | Oriental Mindoro | Calapan |  | Calapan City Health Office |
| CLI-0454  *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Gloria |  | Gloria Municipal Health Office |
| CLI-0455  *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Gloria |  | Gloria Rural Health Unit |
| CLI-0456  *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Mansalay |  | Mansalay Municipal Health Office |
| CLI-0457  *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Mansalay |  | Mansalay Rural Health Unit |
| CLI-0458  *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Naujan |  | Naujan Municipal Health Office |
| CLI-0459  *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Naujan |  | Naujan Rural Health Unit |
| CLI-0460  *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Pinamalayan |  | Pinamalayan Municipal Health Office |
| CLI-0461  *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Pinamalayan |  | Pinamalayan Rural Health Unit |
| CLI-0462  *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Pola |  | Pola Municipal Health Office |
| CLI-0463  *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Pola |  | Pola Rural Health Unit |
| CLI-0464  *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Puerto Galera |  | Puerto Galera Municipal Health Office |
| CLI-0465  *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Puerto Galera |  | Puerto Galera Rural Health Unit |
| CLI-0466  *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Roxas |  | Roxas Municipal Health Office |
| CLI-0467  *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Roxas |  | Roxas Rural Health Unit |
| CLI-0468  *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | San Teodoro |  | San Teodoro Municipal Health Office |
| CLI-0469  *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | San Teodoro |  | San Teodoro Rural Health Unit |
| CLI-0470  *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Socorro |  | Socorro Municipal Health Office |
| CLI-0471  *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Socorro |  | Socorro Rural Health Unit |
| CLI-0472  *(System Generated Default)* | MHO/LGU | MIMAROPA | Oriental Mindoro | Victoria |  | Victoria Municipal Health Office |
| CLI-0473  *(System Generated Default)* | RHU/MHO | MIMAROPA | Oriental Mindoro | Victoria |  | Victoria Rural Health Unit |
| CLI-0474  *(System Generated Default)* | PHO | MIMAROPA | Palawan | Puerto Princesa |  | Palawan Provincial Health Office |
| CLI-0475  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Aborlan |  | Aborlan Municipal Health Office |
| CLI-0476  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Aborlan |  | Aborlan Rural Health Unit |
| CLI-0477  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Agutaya |  | Agutaya Municipal Health Office |
| CLI-0478  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Agutaya |  | Agutaya Rural Health Unit |
| CLI-0479  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Araceli |  | Araceli Municipal Health Office |
| CLI-0480  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Araceli |  | Araceli Rural Health Unit |
| CLI-0481  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Balabac |  | Balabac Municipal Health Office |
| CLI-0482  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Balabac |  | Balabac Rural Health Unit |
| CLI-0483  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Bataraza |  | Bataraza Municipal Health Office |
| CLI-0484  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Bataraza |  | Bataraza Rural Health Unit |
| CLI-0485  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Brooke's Point |  | Brooke's Point Municipal Health Office |
| CLI-0486  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Brooke's Point |  | Brooke's Point Rural Health Unit |
| CLI-0487  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Busuanga |  | Busuanga Municipal Health Office |
| CLI-0488  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Busuanga |  | Busuanga Rural Health Unit |
| CLI-0489  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Cagayancillo |  | Cagayancillo Municipal Health Office |
| CLI-0490  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Cagayancillo |  | Cagayancillo Rural Health Unit |
| CLI-0491  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Coron |  | Coron Municipal Health Office |
| CLI-0492  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Coron |  | Coron Rural Health Unit |
| CLI-0493  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Culion |  | Culion Municipal Health Office |
| CLI-0494  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Culion |  | Culion Rural Health Unit |
| CLI-0495  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Cuyo |  | Cuyo Municipal Health Office |
| CLI-0496  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Cuyo |  | Cuyo Rural Health Unit |
| CLI-0497  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Dumaran |  | Dumaran Municipal Health Office |
| CLI-0498  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Dumaran |  | Dumaran Rural Health Unit |
| CLI-0499  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | El Nido |  | El Nido Municipal Health Office |
| CLI-0500  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | El Nido |  | El Nido Rural Health Unit |
| CLI-0501  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Kalayaan |  | Kalayaan Municipal Health Office |
| CLI-0502  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Kalayaan |  | Kalayaan Rural Health Unit |
| CLI-0503  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Linapacan |  | Linapacan Municipal Health Office |
| CLI-0504  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Linapacan |  | Linapacan Rural Health Unit |
| CLI-0505  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Magsaysay |  | Magsaysay Municipal Health Office |
| CLI-0506  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Magsaysay |  | Magsaysay Rural Health Unit |
| CLI-0507  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Narra |  | Narra Municipal Health Office |
| CLI-0508  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Narra |  | Narra Rural Health Unit |
| CLI-0509  *(System Generated Default)* | CHO/LGU | MIMAROPA | Palawan | Puerto Princesa |  | Puerto Princesa City Health Office |
| CLI-0510  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Quezon |  | Quezon Municipal Health Office |
| CLI-0511  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Quezon |  | Quezon Rural Health Unit |
| CLI-0512  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Rizal |  | Rizal Municipal Health Office |
| CLI-0513  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Rizal |  | Rizal Rural Health Unit |
| CLI-0514  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Roxas |  | Roxas Municipal Health Office |
| CLI-0515  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Roxas |  | Roxas Rural Health Unit |
| CLI-0516  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | San Vicente |  | San Vicente Municipal Health Office |
| CLI-0517  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | San Vicente |  | San Vicente Rural Health Unit |
| CLI-0518  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Sofronio Española |  | Sofronio Española Municipal Health Office |
| CLI-0519  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Sofronio Española |  | Sofronio Española Rural Health Unit |
| CLI-0520  *(System Generated Default)* | MHO/LGU | MIMAROPA | Palawan | Taytay |  | Taytay Municipal Health Office |
| CLI-0521  *(System Generated Default)* | RHU/MHO | MIMAROPA | Palawan | Taytay |  | Taytay Rural Health Unit |
| CLI-0522  *(System Generated Default)* | PHO | MIMAROPA | Romblon | Romblon |  | Romblon Provincial Health Office |
| CLI-0523  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Alcantara |  | Alcantara Municipal Health Office |
| CLI-0524  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Alcantara |  | Alcantara Rural Health Unit |
| CLI-0525  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Banton |  | Banton Municipal Health Office |
| CLI-0526  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Banton |  | Banton Rural Health Unit |
| CLI-0527  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Cajidiocan |  | Cajidiocan Municipal Health Office |
| CLI-0528  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Cajidiocan |  | Cajidiocan Rural Health Unit |
| CLI-0529  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Calatrava |  | Calatrava Municipal Health Office |
| CLI-0530  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Calatrava |  | Calatrava Rural Health Unit |
| CLI-0531  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Concepcion |  | Concepcion Municipal Health Office |
| CLI-0532  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Concepcion |  | Concepcion Rural Health Unit |
| CLI-0533  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Corcuera |  | Corcuera Municipal Health Office |
| CLI-0534  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Corcuera |  | Corcuera Rural Health Unit |
| CLI-0535  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Ferrol |  | Ferrol Municipal Health Office |
| CLI-0536  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Ferrol |  | Ferrol Rural Health Unit |
| CLI-0537  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Looc |  | Looc Municipal Health Office |
| CLI-0538  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Looc |  | Looc Rural Health Unit |
| CLI-0539  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Magdiwang |  | Magdiwang Municipal Health Office |
| CLI-0540  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Magdiwang |  | Magdiwang Rural Health Unit |
| CLI-0541  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Odiongan |  | Odiongan Municipal Health Office |
| CLI-0542  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Odiongan |  | Odiongan Rural Health Unit |
| CLI-0543  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Romblon |  | Romblon Municipal Health Office |
| CLI-0544  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Romblon |  | Romblon Rural Health Unit |
| CLI-0545  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | San Agustin |  | San Agustin Municipal Health Office |
| CLI-0546  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | San Agustin |  | San Agustin Rural Health Unit |
| CLI-0547  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | San Andres |  | San Andres Municipal Health Office |
| CLI-0548  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | San Andres |  | San Andres Rural Health Unit |
| CLI-0549  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | San Fernando |  | San Fernando Municipal Health Office |
| CLI-0550  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | San Fernando |  | San Fernando Rural Health Unit |
| CLI-0551  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | San Jose |  | San Jose Municipal Health Office |
| CLI-0552  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | San Jose |  | San Jose Rural Health Unit |
| CLI-0553  *(System Generated Default)* | MHO/LGU | MIMAROPA | Romblon | Santa Fe |  | Santa Fe Municipal Health Office |
| CLI-0554  *(System Generated Default)* | RHU/MHO | MIMAROPA | Romblon | Santa Fe |  | Santa Fe Rural Health Unit |
| |  **BICOL** |  |  |  |  |  |  |
| CLI-0555  *(System Generated Default)* | Regional Hub | BICOL | Regional | Legazpi City |  | DOH-CHD BICOL |
| CLI-0556  *(System Generated Default)* | PHO | BICOL | Albay | Legazpi City |  | Albay Provincial Health Office |
| CLI-0557  *(System Generated Default)* | MHO/LGU | BICOL | Albay | Bacacay |  | Bacacay Municipal Health Office |
| CLI-0558  *(System Generated Default)* | RHU/MHO | BICOL | Albay | Bacacay |  | Bacacay Rural Health Unit |
| CLI-0559  *(System Generated Default)* | MHO/LGU | BICOL | Albay | Camalig |  | Camalig Municipal Health Office |
| CLI-0560  *(System Generated Default)* | RHU/MHO | BICOL | Albay | Camalig |  | Camalig Rural Health Unit |
| CLI-0561  *(System Generated Default)* | MHO/LGU | BICOL | Albay | Daraga |  | Daraga Municipal Health Office |
| CLI-0562  *(System Generated Default)* | RHU/MHO | BICOL | Albay | Daraga |  | Daraga Rural Health Unit |
| CLI-0563  *(System Generated Default)* | MHO/LGU | BICOL | Albay | Guinobatan |  | Guinobatan Municipal Health Office |
| CLI-0564  *(System Generated Default)* | RHU/MHO | BICOL | Albay | Guinobatan |  | Guinobatan Rural Health Unit |
| CLI-0565  *(System Generated Default)* | MHO/LGU | BICOL | Albay | Jovellar |  | Jovellar Municipal Health Office |
| CLI-0566  *(System Generated Default)* | RHU/MHO | BICOL | Albay | Jovellar |  | Jovellar Rural Health Unit |
| CLI-0567  *(System Generated Default)* | CHO/LGU | BICOL | Albay | Legazpi City |  | Legazpi City City Health Office |
| CLI-0568  *(System Generated Default)* | MHO/LGU | BICOL | Albay | Libon |  | Libon Municipal Health Office |
| CLI-0569  *(System Generated Default)* | RHU/MHO | BICOL | Albay | Libon |  | Libon Rural Health Unit |
| CLI-0570  *(System Generated Default)* | CHO/LGU | BICOL | Albay | Ligao |  | Ligao City Health Office |
| CLI-0571  *(System Generated Default)* | MHO/LGU | BICOL | Albay | Malilipot |  | Malilipot Municipal Health Office |
| CLI-0572  *(System Generated Default)* | RHU/MHO | BICOL | Albay | Malilipot |  | Malilipot Rural Health Unit |
| CLI-0573  *(System Generated Default)* | MHO/LGU | BICOL | Albay | Malinao |  | Malinao Municipal Health Office |
| CLI-0574  *(System Generated Default)* | RHU/MHO | BICOL | Albay | Malinao |  | Malinao Rural Health Unit |
| CLI-0575  *(System Generated Default)* | MHO/LGU | BICOL | Albay | Manito |  | Manito Municipal Health Office |
| CLI-0576  *(System Generated Default)* | RHU/MHO | BICOL | Albay | Manito |  | Manito Rural Health Unit |
| CLI-0577  *(System Generated Default)* | MHO/LGU | BICOL | Albay | Oas |  | Oas Municipal Health Office |
| CLI-0578  *(System Generated Default)* | RHU/MHO | BICOL | Albay | Oas |  | Oas Rural Health Unit |
| CLI-0579  *(System Generated Default)* | MHO/LGU | BICOL | Albay | Pio Duran |  | Pio Duran Municipal Health Office |
| CLI-0580  *(System Generated Default)* | RHU/MHO | BICOL | Albay | Pio Duran |  | Pio Duran Rural Health Unit |
| CLI-0581  *(System Generated Default)* | MHO/LGU | BICOL | Albay | Polangui |  | Polangui Municipal Health Office |
| CLI-0582  *(System Generated Default)* | RHU/MHO | BICOL | Albay | Polangui |  | Polangui Rural Health Unit |
| CLI-0583  *(System Generated Default)* | MHO/LGU | BICOL | Albay | Rapu-Rapu |  | Rapu-Rapu Municipal Health Office |
| CLI-0584  *(System Generated Default)* | RHU/MHO | BICOL | Albay | Rapu-Rapu |  | Rapu-Rapu Rural Health Unit |
| CLI-0585  *(System Generated Default)* | MHO/LGU | BICOL | Albay | Santo Domingo |  | Santo Domingo Municipal Health Office |
| CLI-0586  *(System Generated Default)* | RHU/MHO | BICOL | Albay | Santo Domingo |  | Santo Domingo Rural Health Unit |
| CLI-0587  *(System Generated Default)* | CHO/LGU | BICOL | Albay | Tabaco |  | Tabaco City Health Office |
| CLI-0588  *(System Generated Default)* | MHO/LGU | BICOL | Albay | Tiwi |  | Tiwi Municipal Health Office |
| CLI-0589  *(System Generated Default)* | RHU/MHO | BICOL | Albay | Tiwi |  | Tiwi Rural Health Unit |
| CLI-0590  *(System Generated Default)* | PHO | BICOL | Camarines Norte | Daet |  | Camarines Norte Provincial Health Office |
| CLI-0591  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Basud |  | Basud Municipal Health Office |
| CLI-0592  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Basud |  | Basud Rural Health Unit |
| CLI-0593  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Capalonga |  | Capalonga Municipal Health Office |
| CLI-0594  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Capalonga |  | Capalonga Rural Health Unit |
| CLI-0595  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Daet |  | Daet Municipal Health Office |
| CLI-0596  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Daet |  | Daet Rural Health Unit |
| CLI-0597  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Jose Panganiban |  | Jose Panganiban Municipal Health Office |
| CLI-0598  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Jose Panganiban |  | Jose Panganiban Rural Health Unit |
| CLI-0599  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Labo |  | Labo Municipal Health Office |
| CLI-0600  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Labo |  | Labo Rural Health Unit |
| CLI-0601  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Mercedes |  | Mercedes Municipal Health Office |
| CLI-0602  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Mercedes |  | Mercedes Rural Health Unit |
| CLI-0603  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Paracale |  | Paracale Municipal Health Office |
| CLI-0604  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Paracale |  | Paracale Rural Health Unit |
| CLI-0605  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | San Lorenzo Ruiz |  | San Lorenzo Ruiz Municipal Health Office |
| CLI-0606  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | San Lorenzo Ruiz |  | San Lorenzo Ruiz Rural Health Unit |
| CLI-0607  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | San Vicente |  | San Vicente Municipal Health Office |
| CLI-0608  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | San Vicente |  | San Vicente Rural Health Unit |
| CLI-0609  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Santa Elena |  | Santa Elena Municipal Health Office |
| CLI-0610  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Santa Elena |  | Santa Elena Rural Health Unit |
| CLI-0611  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Talisay |  | Talisay Municipal Health Office |
| CLI-0612  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Talisay |  | Talisay Rural Health Unit |
| CLI-0613  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Norte | Vinzons |  | Vinzons Municipal Health Office |
| CLI-0614  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Norte | Vinzons |  | Vinzons Rural Health Unit |
| CLI-0615  *(System Generated Default)* | PHO | BICOL | Camarines Sur | Pili |  | Camarines Sur Provincial Health Office |
| CLI-0616  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Baao |  | Baao Municipal Health Office |
| CLI-0617  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Baao |  | Baao Rural Health Unit |
| CLI-0618  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Balatan |  | Balatan Municipal Health Office |
| CLI-0619  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Balatan |  | Balatan Rural Health Unit |
| CLI-0620  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Bato |  | Bato Municipal Health Office |
| CLI-0621  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Bato |  | Bato Rural Health Unit |
| CLI-0622  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Bombon |  | Bombon Municipal Health Office |
| CLI-0623  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Bombon |  | Bombon Rural Health Unit |
| CLI-0624  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Buhi |  | Buhi Municipal Health Office |
| CLI-0625  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Buhi |  | Buhi Rural Health Unit |
| CLI-0626  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Bula |  | Bula Municipal Health Office |
| CLI-0627  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Bula |  | Bula Rural Health Unit |
| CLI-0628  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Cabusao |  | Cabusao Municipal Health Office |
| CLI-0629  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Cabusao |  | Cabusao Rural Health Unit |
| CLI-0630  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Calabanga |  | Calabanga Municipal Health Office |
| CLI-0631  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Calabanga |  | Calabanga Rural Health Unit |
| CLI-0632  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Camaligan |  | Camaligan Municipal Health Office |
| CLI-0633  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Camaligan |  | Camaligan Rural Health Unit |
| CLI-0634  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Canaman |  | Canaman Municipal Health Office |
| CLI-0635  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Canaman |  | Canaman Rural Health Unit |
| CLI-0636  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Caramoan |  | Caramoan Municipal Health Office |
| CLI-0637  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Caramoan |  | Caramoan Rural Health Unit |
| CLI-0638  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Del Gallego |  | Del Gallego Municipal Health Office |
| CLI-0639  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Del Gallego |  | Del Gallego Rural Health Unit |
| CLI-0640  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Gainza |  | Gainza Municipal Health Office |
| CLI-0641  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Gainza |  | Gainza Rural Health Unit |
| CLI-0642  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Garchitorena |  | Garchitorena Municipal Health Office |
| CLI-0643  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Garchitorena |  | Garchitorena Rural Health Unit |
| CLI-0644  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Goa |  | Goa Municipal Health Office |
| CLI-0645  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Goa |  | Goa Rural Health Unit |
| CLI-0646  *(System Generated Default)* | CHO/LGU | BICOL | Camarines Sur | Iriga |  | Iriga City Health Office |
| CLI-0647  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Lagonoy |  | Lagonoy Municipal Health Office |
| CLI-0648  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Lagonoy |  | Lagonoy Rural Health Unit |
| CLI-0649  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Libmanan |  | Libmanan Municipal Health Office |
| CLI-0650  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Libmanan |  | Libmanan Rural Health Unit |
| CLI-0651  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Lupi |  | Lupi Municipal Health Office |
| CLI-0652  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Lupi |  | Lupi Rural Health Unit |
| CLI-0653  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Magarao |  | Magarao Municipal Health Office |
| CLI-0654  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Magarao |  | Magarao Rural Health Unit |
| CLI-0655  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Milaor |  | Milaor Municipal Health Office |
| CLI-0656  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Milaor |  | Milaor Rural Health Unit |
| CLI-0657  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Minalabac |  | Minalabac Municipal Health Office |
| CLI-0658  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Minalabac |  | Minalabac Rural Health Unit |
| CLI-0659  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Nabua |  | Nabua Municipal Health Office |
| CLI-0660  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Nabua |  | Nabua Rural Health Unit |
| CLI-0661  *(System Generated Default)* | CHO/LGU | BICOL | Camarines Sur | Naga City |  | Naga City City Health Office |
| CLI-0662  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Ocampo |  | Ocampo Municipal Health Office |
| CLI-0663  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Ocampo |  | Ocampo Rural Health Unit |
| CLI-0664  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Pamplona |  | Pamplona Municipal Health Office |
| CLI-0665  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Pamplona |  | Pamplona Rural Health Unit |
| CLI-0666  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Pasacao |  | Pasacao Municipal Health Office |
| CLI-0667  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Pasacao |  | Pasacao Rural Health Unit |
| CLI-0668  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Pili |  | Pili Municipal Health Office |
| CLI-0669  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Pili |  | Pili Rural Health Unit |
| CLI-0670  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Presentacion |  | Presentacion Municipal Health Office |
| CLI-0671  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Presentacion |  | Presentacion Rural Health Unit |
| CLI-0672  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Ragay |  | Ragay Municipal Health Office |
| CLI-0673  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Ragay |  | Ragay Rural Health Unit |
| CLI-0674  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Sagñay |  | Sagñay Municipal Health Office |
| CLI-0675  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Sagñay |  | Sagñay Rural Health Unit |
| CLI-0676  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | San Fernando |  | San Fernando Municipal Health Office |
| CLI-0677  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | San Fernando |  | San Fernando Rural Health Unit |
| CLI-0678  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | San Jose |  | San Jose Municipal Health Office |
| CLI-0679  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | San Jose |  | San Jose Rural Health Unit |
| CLI-0680  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Sipocot |  | Sipocot Municipal Health Office |
| CLI-0681  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Sipocot |  | Sipocot Rural Health Unit |
| CLI-0682  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Siruma |  | Siruma Municipal Health Office |
| CLI-0683  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Siruma |  | Siruma Rural Health Unit |
| CLI-0684  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Tigaon |  | Tigaon Municipal Health Office |
| CLI-0685  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Tigaon |  | Tigaon Rural Health Unit |
| CLI-0686  *(System Generated Default)* | MHO/LGU | BICOL | Camarines Sur | Tinambac |  | Tinambac Municipal Health Office |
| CLI-0687  *(System Generated Default)* | RHU/MHO | BICOL | Camarines Sur | Tinambac |  | Tinambac Rural Health Unit |
| CLI-0688  *(System Generated Default)* | PHO | BICOL | Catanduanes | Virac |  | Catanduanes Provincial Health Office |
| CLI-0689  *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Bagamanoc |  | Bagamanoc Municipal Health Office |
| CLI-0690  *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Bagamanoc |  | Bagamanoc Rural Health Unit |
| CLI-0691  *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Baras |  | Baras Municipal Health Office |
| CLI-0692  *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Baras |  | Baras Rural Health Unit |
| CLI-0693  *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Bato |  | Bato Municipal Health Office |
| CLI-0694  *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Bato |  | Bato Rural Health Unit |
| CLI-0695  *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Caramoran |  | Caramoran Municipal Health Office |
| CLI-0696  *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Caramoran |  | Caramoran Rural Health Unit |
| CLI-0697  *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Gigmoto |  | Gigmoto Municipal Health Office |
| CLI-0698  *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Gigmoto |  | Gigmoto Rural Health Unit |
| CLI-0699  *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Pandan |  | Pandan Municipal Health Office |
| CLI-0700  *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Pandan |  | Pandan Rural Health Unit |
| CLI-0701  *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Panganiban |  | Panganiban Municipal Health Office |
| CLI-0702  *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Panganiban |  | Panganiban Rural Health Unit |
| CLI-0703  *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | San Andres |  | San Andres Municipal Health Office |
| CLI-0704  *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | San Andres |  | San Andres Rural Health Unit |
| CLI-0705  *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | San Miguel |  | San Miguel Municipal Health Office |
| CLI-0706  *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | San Miguel |  | San Miguel Rural Health Unit |
| CLI-0707  *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Viga |  | Viga Municipal Health Office |
| CLI-0708  *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Viga |  | Viga Rural Health Unit |
| CLI-0709  *(System Generated Default)* | MHO/LGU | BICOL | Catanduanes | Virac |  | Virac Municipal Health Office |
| CLI-0710  *(System Generated Default)* | RHU/MHO | BICOL | Catanduanes | Virac |  | Virac Rural Health Unit |
| CLI-0711  *(System Generated Default)* | PHO | BICOL | Masbate | Masbate City |  | Masbate Provincial Health Office |
| CLI-0712  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Aroroy |  | Aroroy Municipal Health Office |
| CLI-0713  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Aroroy |  | Aroroy Rural Health Unit |
| CLI-0714  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Baleno |  | Baleno Municipal Health Office |
| CLI-0715  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Baleno |  | Baleno Rural Health Unit |
| CLI-0716  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Balud |  | Balud Municipal Health Office |
| CLI-0717  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Balud |  | Balud Rural Health Unit |
| CLI-0718  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Batuan |  | Batuan Municipal Health Office |
| CLI-0719  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Batuan |  | Batuan Rural Health Unit |
| CLI-0720  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Cataingan |  | Cataingan Municipal Health Office |
| CLI-0721  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Cataingan |  | Cataingan Rural Health Unit |
| CLI-0722  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Cawayan |  | Cawayan Municipal Health Office |
| CLI-0723  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Cawayan |  | Cawayan Rural Health Unit |
| CLI-0724  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Claveria |  | Claveria Municipal Health Office |
| CLI-0725  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Claveria |  | Claveria Rural Health Unit |
| CLI-0726  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Dimasalang |  | Dimasalang Municipal Health Office |
| CLI-0727  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Dimasalang |  | Dimasalang Rural Health Unit |
| CLI-0728  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Esperanza |  | Esperanza Municipal Health Office |
| CLI-0729  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Esperanza |  | Esperanza Rural Health Unit |
| CLI-0730  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Mandaon |  | Mandaon Municipal Health Office |
| CLI-0731  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Mandaon |  | Mandaon Rural Health Unit |
| CLI-0732  *(System Generated Default)* | CHO/LGU | BICOL | Masbate | Masbate City |  | Masbate City City Health Office |
| CLI-0733  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Milagros |  | Milagros Municipal Health Office |
| CLI-0734  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Milagros |  | Milagros Rural Health Unit |
| CLI-0735  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Mobo |  | Mobo Municipal Health Office |
| CLI-0736  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Mobo |  | Mobo Rural Health Unit |
| CLI-0737  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Monreal |  | Monreal Municipal Health Office |
| CLI-0738  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Monreal |  | Monreal Rural Health Unit |
| CLI-0739  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Palanas |  | Palanas Municipal Health Office |
| CLI-0740  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Palanas |  | Palanas Rural Health Unit |
| CLI-0741  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Pio V. Corpuz |  | Pio V. Corpuz Municipal Health Office |
| CLI-0742  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Pio V. Corpuz |  | Pio V. Corpuz Rural Health Unit |
| CLI-0743  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Placer |  | Placer Municipal Health Office |
| CLI-0744  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Placer |  | Placer Rural Health Unit |
| CLI-0745  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | San Fernando |  | San Fernando Municipal Health Office |
| CLI-0746  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | San Fernando |  | San Fernando Rural Health Unit |
| CLI-0747  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | San Jacinto |  | San Jacinto Municipal Health Office |
| CLI-0748  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | San Jacinto |  | San Jacinto Rural Health Unit |
| CLI-0749  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | San Pascual |  | San Pascual Municipal Health Office |
| CLI-0750  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | San Pascual |  | San Pascual Rural Health Unit |
| CLI-0751  *(System Generated Default)* | MHO/LGU | BICOL | Masbate | Uson |  | Uson Municipal Health Office |
| CLI-0752  *(System Generated Default)* | RHU/MHO | BICOL | Masbate | Uson |  | Uson Rural Health Unit |
| CLI-0753  *(System Generated Default)* | PHO | BICOL | Sorsogon | Sorsogon City |  | Sorsogon Provincial Health Office |
| CLI-0754  *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Barcelona |  | Barcelona Municipal Health Office |
| CLI-0755  *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Barcelona |  | Barcelona Rural Health Unit |
| CLI-0756  *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Bulan |  | Bulan Municipal Health Office |
| CLI-0757  *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Bulan |  | Bulan Rural Health Unit |
| CLI-0758  *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Bulusan |  | Bulusan Municipal Health Office |
| CLI-0759  *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Bulusan |  | Bulusan Rural Health Unit |
| CLI-0760  *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Casiguran |  | Casiguran Municipal Health Office |
| CLI-0761  *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Casiguran |  | Casiguran Rural Health Unit |
| CLI-0762  *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Castilla |  | Castilla Municipal Health Office |
| CLI-0763  *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Castilla |  | Castilla Rural Health Unit |
| CLI-0764  *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Donsol |  | Donsol Municipal Health Office |
| CLI-0765  *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Donsol |  | Donsol Rural Health Unit |
| CLI-0766  *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Gubat |  | Gubat Municipal Health Office |
| CLI-0767  *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Gubat |  | Gubat Rural Health Unit |
| CLI-0768  *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Irosin |  | Irosin Municipal Health Office |
| CLI-0769  *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Irosin |  | Irosin Rural Health Unit |
| CLI-0770  *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Juban |  | Juban Municipal Health Office |
| CLI-0771  *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Juban |  | Juban Rural Health Unit |
| CLI-0772  *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Magallanes |  | Magallanes Municipal Health Office |
| CLI-0773  *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Magallanes |  | Magallanes Rural Health Unit |
| CLI-0774  *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Matnog |  | Matnog Municipal Health Office |
| CLI-0775  *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Matnog |  | Matnog Rural Health Unit |
| CLI-0776  *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Pilar |  | Pilar Municipal Health Office |
| CLI-0777  *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Pilar |  | Pilar Rural Health Unit |
| CLI-0778  *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Prieto Diaz |  | Prieto Diaz Municipal Health Office |
| CLI-0779  *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Prieto Diaz |  | Prieto Diaz Rural Health Unit |
| CLI-0780  *(System Generated Default)* | MHO/LGU | BICOL | Sorsogon | Santa Magdalena |  | Santa Magdalena Municipal Health Office |
| CLI-0781  *(System Generated Default)* | RHU/MHO | BICOL | Sorsogon | Santa Magdalena |  | Santa Magdalena Rural Health Unit |
| CLI-0782  *(System Generated Default)* | CHO/LGU | BICOL | Sorsogon | Sorsogon City |  | Sorsogon City City Health Office |

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
