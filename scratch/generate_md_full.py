import os

clients = """
BATANGAS
A/R - Batangas - Gerardo Delos Reyes
A/R - Batangas - Norma Cabiliza
A/R - Batangas - Ann Denise Codizal Pharmacy
A/R - Batangas - Botika Estela
A/R - Batangas - DLR Pharmacy
A/R - Batangas - Maggie and Jojo/ JNJ Pharmacy
A/R - Batangas - Shooting Star Trading
A/R - Batangas - Divine Care Hospital
QUEZON
A/R - Quezon - Augustina Cabangon
A/R - Quezon - Aurea Cadacio
A/R - Quezon - Bridgette Inocencio
A/R - Quezon - Cherry Espinosa
A/R - Quezon - Corazon Arroyo
A/R - Quezon - Danilo Olitoquit
A/R - Quezon - Emeline Olaivar
A/R - Quezon - Emma Zoleta
A/R - Quezon - Ester Vergara
A/R - Quezon - Glenda Lao
A/R - Quezon - Gloria Liwanag
A/R - Quezon - Graciela Derada Deleon
A/R - Quezon - Honorata Pañebe
A/R - Quezon - Isabel Oliveros
A/R - Quezon - Janice Mercado
A/R - Quezon - Javierto Reynoso
A/R - Quezon - Jesus Comia
A/R - Quezon - Jing Marasigan
A/R - Quezon - Juanita Tan
A/R - Quezon - Lanie Atienza
A/R - Quezon - Lelette Gamboa
A/R - Quezon - Liza Defeo
A/R - Quezon - Liza Maranan
A/R - Quezon - Lovella Alava
A/R - Quezon - Ma Victoria Ayag
A/R - Quezon - Mary Aileen Morales
A/R - Quezon - Melissa Abbariao
A/R - Quezon - Mercy Reyes
A/R - Quezon - Noemi Francisco
A/R - Quezon - Petronillo Faller
A/R - Quezon - Ramon Nieva
A/R - Quezon - Reggie Revilla
A/R - Quezon - Rodel Redor
A/R - Quezon - Rodolfo Rañola
A/R - Quezon - Roly Dela Peña
A/R - Quezon - Rosalina Bautista
A/R - Quezon - Rufinita Soquilla
A/R - Quezon - Severina Escondo
A/R - Quezon - Teresa Tan
A/R - Quezon - BLB Botika
A/R - Quezon - Bon Pharmacy
A/R - Quezon - Century Drug
A/R - Quezon - DCP Pharmacy
A/R - Quezon - Eastern Drug
A/R - Quezon - Gumaca District Cooperative
A/R - Quezon - KKK Pharmacy
A/R - Quezon - Megawide
A/R - Quezon - Pagkatipunan Drugstore
A/R - Quezon - Perez Drug
A/R - Quezon - RSV Pharmacy
A/R - Quezon - Vickys Pharmacy
A/R - Quezon - Winjoy Pharmacy
A/R - Quezon - Ma. Cecile Aure
A/R - Quezon - Cherrylyn Barola
A/R - Quezon - Mt Carmel General Hospital
A/R - Quezon - RAKKK Prophet
A/R - Quezon - Herminia Laguador
A/R - Quezon - Madel Fetisa
A/R - Quezon - Constancia Catarroja
A/R - Quezon - BEMONC RHU Sariaya
A/R - Quezon - Urbano Oliveros
A/R - Quezon - Brgy Canda Health Center
A/R - Quezon - Bricor Pharmacy
A/R - Quezon - Severina Nadres
A/R - Quezon - AMCA Drug
A/R - Quezon - Dr Jessabeth Mercado
A/R - Quezon - Dr. Florcerel Malay
A/R - Quezon - Dr. Teresa Tagarao
A/R - Quezon - Dr. Victorino Araña
A/R - Quezon - NSDR Birthing Home
A/R - Quezon - Dr. Gilbert Lafuente
A/R - Quezon - Sampaloc Lying Inn
A/R - Quezon - Unihealth Quezon (Medicine)
A/R - Quezon - Tumbaga Birthing Home
A/R - Quezon - Brgy Health Station Sampaloc 1
A/R - Quezon - Raquel Samodio
A/R - Quezon - Asuncion Rañeses
A/R - Quezon - Lopez St Jude General Hospital
A/R - Quezon - Dra. Cherry Bacungan
A/R - Quezon - Dr. Maribel Nosce
A/R - Quezon - Zoleta Birthing Home
A/R - Quezon - Hiyasmin Birthing Home
A/R - Quezon - Nativity of Jesus Birthing Clinic
A/R - Quezon - Gulang Gulang National High School
MARINDUQUE
A/R - Marinduque - Arlene Nebreja
A/R - Marinduque - Arlie Vertucio
A/R - Marinduque - Catherine Sadiwa
A/R - Marinduque - Florito Aliasas
A/R - Marinduque - Imelda Parado
A/R - Marinduque - Julia Masangkay
A/R - Marinduque - Lani Dela Santa
A/R - Marinduque - Lorena Quing
A/R - Marinduque - Manuel Narciso
A/R - Marinduque - Margarita Montellano
A/R - Marinduque - Rey Richard Sore
A/R - Marinduque - Teodolfo Rejano
A/R - Marinduque - JRM - RMV Pharmacy
A/R - Marinduque - MPH Cooperative
A/R - Marinduque - St. Rose of Lima
A/R - Marinduque - WH Pharmacy
A/R - Marinduque - Torrijos Municipal Hall
A/R - Marinduque - Provincial Government of Marinduque
A/R - Marinduque - Dr. Esmeralda Calayag
A/R - Marinduque - Dr. Alfred Saldaña
A/R - Marinduque - Dr. Alex Cruz
A/R - Marinduque - L.Pergis Pharmacy
HOSPITAL
A/R - Hospital - Lucena MMG Hospital
A/R - Hospital - Peter Paul Medical Center of Candelaria
A/R - Hospital - Quezon Medical Center
A/R - Hospital - Unihealth Quezon (Hospital Medicines)
A/R - Hospital - Lucena United Doctors Hospital
DIVISION 3
A/R - D3 - LGU - Pagbilao
A/R - D3 - District - Bondoc Peninsula District Hospital, Catanauan
A/R - D3 - District - Candelaria Municipal Hospital, Candelaria
A/R - D3 - District - Guinyangan Medicare Community Hospital, Guinyangan
A/R - D3 - District - Gumaca District Hospital, Gumaca
A/R - D3 - District - Claro M. Recto District Hospital, Infanta
A/R - D3 - District - Doña Marta Memorial Hospital, Atimonan
A/R - D3 - District - Mauban District Hospital, Mauban
A/R - D3 - District - Magsaysay Memorial District Hospital, Lopez
A/R - D3 - District - Maria Eleazar District Hospital, Tagkawayan
A/R - D3 - District - Polilio Medicare Hospital, Polilio
A/R - D3 - District - Sampaloc Medicare Community Hospital, Sampaloc
A/R - D3 - District - San Francisco Municipal Hospital, San Francisco
A/R - D3 - District - Unisan Medicare Community Hospital, Unisan
A/R - D3 - District - IPHO
A/R - D3 - District - Alabat Island District Hospital
A/R - D3 - District - Provincial Tourism Office
"""

def parse_client(line):
    if line.startswith("A/R - Batangas"):
        name = line.split(" - ")[-1]
        lgu = "Batangas City *(Defaulted to PHO/LGU)*"
        ctype = "Individual/A/R"
        if "Pharmacy" in name or "Botika" in name or "Drug" in name: ctype = "Pharmacy"
        if "Trading" in name: ctype = "Retail"
        if "Hospital" in name: ctype = "Private Hospital"
        
        if name == "Divine Care Hospital":
            lgu = "San Juan *(Searched Location)*"
        elif name == "Botika Estela" or "Ann Denise Codizal" in name:
            lgu = "Balayan *(Searched Location)*"
        elif "DLR" in name:
            lgu = "Calatagan *(Searched Location)*"
            
        return {"Region": "CALABARZON", "Province": "Batangas", "lgu": lgu, "row": f"| {line} | {ctype} | CALABARZON | Batangas | {lgu} | {name} |"}
    
    elif line.startswith("A/R - Quezon") or line.startswith("A/R - Hospital") or line.startswith("A/R - D3"):
        name = line.split(" - ")[-1]
        lgu = "Lucena City *(Defaulted to PHO/LGU)*"
        ctype = "Individual/A/R"
        if "Pharmacy" in name or "Botika" in name or "Drug" in name: ctype = "Pharmacy"
        if "Hospital" in name or line.startswith("A/R - Hospital"): 
            ctype = "Private Hospital" if not line.startswith("A/R - Hospital") and not line.startswith("A/R - D3") else "Govt Hospital"
            if "Lopez" in name: lgu = "Lopez"
            elif "Candelaria" in name: lgu = "Candelaria"
            elif "Catanauan" in name: lgu = "Catanauan"
            elif "Guinyangan" in name: lgu = "Guinayangan"
            elif "Gumaca" in name: lgu = "Gumaca"
            elif "Infanta" in name: lgu = "Infanta"
            elif "Atimonan" in name: lgu = "Atimonan"
            elif "Mauban" in name: lgu = "Mauban"
            elif "Tagkawayan" in name: lgu = "Tagkawayan"
            elif "Polilio" in name: lgu = "Polillo"
            elif "Sampaloc" in name: lgu = "Sampaloc"
            elif "San Francisco" in name: lgu = "San Francisco"
            elif "Unisan" in name: lgu = "Unisan"
            elif "Alabat" in name: lgu = "Alabat"
            else: lgu = "Lucena City"
        if "RHU" in name: 
            ctype = "RHU"
            if "Sariaya" in name: lgu = "Sariaya"
        if "Sampaloc" in name:
            lgu = "Sampaloc"
            ctype = "BHS" if "Station" in name else "Lying Inn"
        if "Cooperative" in name:
            ctype = "Cooperative"
            if "Gumaca" in name: lgu = "Gumaca"
        if "AMCA Drug" in name:
            lgu = "Catanauan *(Searched Location)*"
        if "Florcerel Malay" in name:
            lgu = "Sariaya *(Searched Location)*"
            ctype = "Private Hospital"
        if "Teresa Tagarao" in name:
            lgu = "Lopez *(Searched Location)*"
            ctype = "Private Hospital"
        if "Victorino Araña" in name:
            lgu = "Lucban *(Searched Location)*"
            ctype = "RHU"
        if "Constancia Catarroja" in name:
            lgu = "Sariaya *(Searched Location)*"
            ctype = "RHU/MHO"
        if "Gilbert Lafuente" in name:
            lgu = "Padre Burgos *(Searched Location)*"
            ctype = "Clinic"
        if "Jessabeth Mercado" in name:
            lgu = "Lucena City *(Searched Location)*"
            ctype = "Govt Hospital"
        if "Maribel Nosce" in name:
            lgu = "Lucena City *(Searched Location)*"
            ctype = "Clinic"
        if "Cherry Bacungan" in name:
            lgu = "Lucena City *(Searched Location)*"
            ctype = "Private Hospital"
        if "Urbano Oliveros" in name:
            lgu = "Lucena City *(Searched Location)*"
            ctype = "Clinic"
        if "Herminia Laguador" in name or "Rodolfo Rañola" in name or "Petronillo Faller" in name:
            lgu = "Lucban *(Searched Location)*"
            ctype = "Clinic"
        if "Severina Nadres" in name or "Graciela Derada Deleon" in name:
            lgu = "Tayabas *(Searched Location)*"
            ctype = "Clinic"
        if "Augustina Cabangon" in name:
            lgu = "Lucena City *(Searched Location)*"
            ctype = "Govt Hospital"
        if "Aurea Cadacio" in name:
            lgu = "Sariaya *(Searched Location)*"
            ctype = "BHS / Midwife"
        if "Ester Vergara" in name:
            lgu = "Candelaria *(Searched Location)*"
            ctype = "Clinic"
        if "Century Drug" in name:
            lgu = "Atimonan *(Searched Location)*"
            ctype = "Pharmacy"
        if "DCP Pharmacy" in name:
            lgu = "Agdangan *(Searched Location)*"
            ctype = "Pharmacy"
        if "Eastern Drug" in name:
            lgu = "Gumaca *(Searched Location)*"
            ctype = "Pharmacy"
        if "KKK Pharmacy" in name:
            lgu = "Padre Burgos *(Searched Location)*"
            ctype = "Pharmacy"
        if "Pagkatipunan Drugstore" in name:
            lgu = "Lucena City *(Searched Location)*"
            ctype = "Pharmacy"
        if "RSV Pharmacy" in name:
            lgu = "Candelaria *(Searched Location)*"
            ctype = "Pharmacy"
        if "Vickys Pharmacy" in name:
            lgu = "Lucena City *(Searched Location)*"
            ctype = "Pharmacy"
        if "Winjoy Pharmacy" in name:
            lgu = "Lopez *(Searched Location)*"
            ctype = "Pharmacy"
        if "RAKKK Prophet" in name:
            lgu = "Gumaca *(Searched Location)*"
            ctype = "Private Hospital"
        if "Tumbaga Birthing Home" in name or "Nativity of Jesus" in name:
            lgu = "Sariaya *(Searched Location)*"
            ctype = "Birthing Home"
        if "Zoleta Birthing Home" in name:
            lgu = "San Antonio *(Searched Location)*"
            ctype = "Birthing Home"
        if "Hiyasmin Birthing Home" in name:
            lgu = "Tayabas *(Searched Location)*"
            ctype = "Birthing Home"
        if "JRM" in name and "RMV" in name:
            lgu = "Santa Cruz *(Searched Location)*"
            ctype = "Pharmacy"
        if line.startswith("A/R - D3 - LGU"):
            ctype = "LGU"
            lgu = name
            
        return {"Region": "CALABARZON", "Province": "Quezon", "lgu": lgu, "row": f"| {line} | {ctype} | CALABARZON | Quezon | {lgu} | {name} |"}
        
    elif line.startswith("A/R - Marinduque"):
        name = line.split(" - ")[-1]
        lgu = "Boac *(Defaulted to PHO)*"
        ctype = "Individual/A/R"
        if "Pharmacy" in name or "Botika" in name or "Drug" in name: ctype = "Pharmacy"
        if "Cooperative" in name: ctype = "Cooperative"
        if "Government" in name or "Hall" in name:
            ctype = "Govt"
            if "Torrijos" in name: lgu = "Torrijos"
            else: lgu = "Boac *(Provincial Capital Default)*"
            
        return {"Region": "MIMAROPA", "Province": "Marinduque", "lgu": lgu, "row": f"| {line} | {ctype} | MIMAROPA | Marinduque | {lgu} | {name} |"}

    return None

lgu_data = {
    "CALABARZON": {
        "Batangas": ["Agoncillo", "Alitagtag", "Balayan", "Balete", "Batangas City", "Bauan", "Calaca", "Calatagan", "Cuenca", "Ibaan", "Laurel", "Lemery", "Lian", "Lipa", "Lobo", "Mabini", "Malvar", "Mataasnakahoy", "Nasugbu", "Padre Garcia", "Rosario", "San Jose", "San Juan", "San Luis", "San Nicolas", "San Pascual", "Santa Teresita", "Santo Tomas", "Taal", "Talisay", "Tanauan", "Taysan", "Tingloy", "Tuy"],
        "Cavite": ["Alfonso", "Amadeo", "Bacoor", "Carmona", "Cavite City", "Dasmariñas", "General Emilio Aguinaldo", "General Mariano Alvarez", "General Trias", "Imus", "Indang", "Kawit", "Magallanes", "Maragondon", "Mendez", "Naic", "Noveleta", "Rosario", "Silang", "Tagaytay", "Tanza", "Ternate", "Trece Martires"],
        "Laguna": ["Alaminos", "Bay", "Biñan", "Cabuyao", "Calamba", "Calauan", "Cavinti", "Famy", "Kalayaan", "Liliw", "Los Baños", "Luisiana", "Lumban", "Mabitac", "Magdalena", "Majayjay", "Nagcarlan", "Paete", "Pagsanjan", "Pakil", "Pangil", "Pila", "Rizal", "San Pablo", "San Pedro", "Santa Cruz", "Santa Maria", "Santa Rosa", "Siniloan", "Victoria"],
        "Quezon": ["Agdangan", "Alabat", "Atimonan", "Buenavista", "Burdeos", "Calauag", "Candelaria", "Catanauan", "Dolores", "General Luna", "General Nakar", "Guinayangan", "Gumaca", "Infanta", "Jomalig", "Lopez", "Lucban", "Lucena City", "Macalelon", "Mauban", "Mulanay", "Padre Burgos", "Pagbilao", "Panukulan", "Patnanungan", "Perez", "Pitogo", "Plaridel", "Polillo", "Quezon", "Real", "Sampaloc", "San Andres", "San Antonio", "San Francisco", "San Narciso", "Sariaya", "Tagkawayan", "Tayabas", "Tiaong", "Unisan"],
        "Rizal": ["Angono", "Antipolo", "Baras", "Binangonan", "Cainta", "Cardona", "Jalajala", "Morong", "Pililla", "Rodriguez", "San Mateo", "Tanay", "Taytay", "Teresa"]
    },
    "MIMAROPA": {
        "Marinduque": ["Boac", "Buenavista", "Gasan", "Mogpog", "Santa Cruz", "Torrijos"],
        "Occidental Mindoro": ["Abra de Ilog", "Calintaan", "Looc", "Lubang", "Magsaysay", "Mamburao", "Paluan", "Rizal", "Sablayan", "San Jose", "Santa Cruz"],
        "Oriental Mindoro": ["Baco", "Bansud", "Bongabong", "Bulalacao", "Calapan", "Gloria", "Mansalay", "Naujan", "Pinamalayan", "Pola", "Puerto Galera", "Roxas", "San Teodoro", "Socorro", "Victoria"],
        "Palawan": ["Aborlan", "Agutaya", "Araceli", "Balabac", "Bataraza", "Brooke's Point", "Busuanga", "Cagayancillo", "Coron", "Culion", "Cuyo", "Dumaran", "El Nido", "Kalayaan", "Linapacan", "Magsaysay", "Narra", "Puerto Princesa", "Quezon", "Rizal", "Roxas", "San Vicente", "Sofronio Española", "Taytay"],
        "Romblon": ["Alcantara", "Banton", "Cajidiocan", "Calatrava", "Concepcion", "Corcuera", "Ferrol", "Looc", "Magdiwang", "Odiongan", "Romblon", "San Agustin", "San Andres", "San Fernando", "San Jose", "Santa Fe"]
    },
    "BICOL": {
        "Albay": ["Bacacay", "Camalig", "Daraga", "Guinobatan", "Jovellar", "Legazpi City", "Libon", "Ligao", "Malilipot", "Malinao", "Manito", "Oas", "Pio Duran", "Polangui", "Rapu-Rapu", "Santo Domingo", "Tabaco", "Tiwi"],
        "Camarines Norte": ["Basud", "Capalonga", "Daet", "Jose Panganiban", "Labo", "Mercedes", "Paracale", "San Lorenzo Ruiz", "San Vicente", "Santa Elena", "Talisay", "Vinzons"],
        "Camarines Sur": ["Baao", "Balatan", "Bato", "Bombon", "Buhi", "Bula", "Cabusao", "Calabanga", "Camaligan", "Canaman", "Caramoan", "Del Gallego", "Gainza", "Garchitorena", "Goa", "Iriga", "Lagonoy", "Libmanan", "Lupi", "Magarao", "Milaor", "Minalabac", "Nabua", "Naga City", "Ocampo", "Pamplona", "Pasacao", "Pili", "Presentacion", "Ragay", "Sagñay", "San Fernando", "San Jose", "Sipocot", "Siruma", "Tigaon", "Tinambac"],
        "Catanduanes": ["Bagamanoc", "Baras", "Bato", "Caramoran", "Gigmoto", "Pandan", "Panganiban", "San Andres", "San Miguel", "Viga", "Virac"],
        "Masbate": ["Aroroy", "Baleno", "Balud", "Batuan", "Cataingan", "Cawayan", "Claveria", "Dimasalang", "Esperanza", "Mandaon", "Masbate City", "Milagros", "Mobo", "Monreal", "Palanas", "Pio V. Corpuz", "Placer", "San Fernando", "San Jacinto", "San Pascual", "Uson"],
        "Sorsogon": ["Barcelona", "Bulan", "Bulusan", "Casiguran", "Castilla", "Donsol", "Gubat", "Irosin", "Juban", "Magallanes", "Matnog", "Pilar", "Prieto Diaz", "Santa Magdalena", "Sorsogon City"]
    }
}

capitals = {
    "Batangas": "Batangas City", "Cavite": "Trece Martires", "Laguna": "Santa Cruz", "Quezon": "Lucena City", "Rizal": "Antipolo",
    "Marinduque": "Boac", "Occidental Mindoro": "Mamburao", "Oriental Mindoro": "Calapan", "Palawan": "Puerto Princesa", "Romblon": "Romblon",
    "Albay": "Legazpi City", "Camarines Norte": "Daet", "Camarines Sur": "Pili", "Catanduanes": "Virac", "Masbate": "Masbate City", "Sorsogon": "Sorsogon City"
}

regional_hubs = {
    "CALABARZON": "Quezon City *(Logistical)*",
    "MIMAROPA": "Quezon City *(Logistical)*",
    "BICOL": "Legazpi City"
}

lines = clients.strip().split("\n")
pdf_clients = []
for line in lines:
    if line.startswith("A/R"):
        parsed = parse_client(line)
        if parsed:
            pdf_clients.append(parsed)

md_content = """# MedShield Mapped Client List (Reference)

This document demonstrates how the unstructured raw client data (from the original PDF reference) is transformed into the structured geographic hierarchy required by the MedShield machine learning pipeline. 

By applying the fallback logic, all generic individual accounts and hospitals are anchored to a valid **LGU (City/Municipality)** for model computations, while preserving their original names as UI sub-tags. **To support this fallback logic, the baseline Regional, Provincial, and City/Municipal Health Offices are explicitly instantiated below.**

| Original Raw Client Name (From PDF) | Client Type | Region | Province | **`lgu_city_muni` (Model Anchor)** | **`ui_subtag` / Context** |
| :--- | :--- | :--- | :--- | :--- | :--- |
"""

for region, provinces in lgu_data.items():
    md_content += f"| **{region}** | | | | | |\n"
    md_content += f"| *(System Generated Default)* | Regional Hub | {region} | Regional | {regional_hubs[region]} | DOH-CHD {region} |\n"
    # Placeholder list for urbanized municipalities. Add names here to classify them as MHO instead of RHU.
    urbanized_municipalities = ["Taytay", "Cainta"] 

    for province, lgus in provinces.items():
        md_content += f"| *(System Generated Default)* | PHO | {region} | {province} | {capitals[province]} | {province} Provincial Health Office |\n"
        for lgu in lgus:
            if "City" in lgu:
                ctype = "CHO/LGU"
                subtag = f"{lgu} Health Office"
            elif lgu in urbanized_municipalities:
                ctype = "MHO/LGU"
                subtag = f"{lgu} Health Office"
            else:
                ctype = "RHU/MHO"
                subtag = f"{lgu} Rural Health Unit"
            
            md_content += f"| *(System Generated Default)* | {ctype} | {region} | {province} | {lgu} | {subtag} |\n"
        
        # Add PDF clients for this province
        for client in pdf_clients:
            if client["Region"] == region and client["Province"] == province:
                md_content += client["row"] + "\n"

md_content += """
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
"""

with open(r"c:\Users\Ethan\med_newprojv5\docs\MAPPED_CLIENT_REFERENCE.md", "w", encoding="utf-8") as f:
    f.write(md_content)

print("Done generating massive MAPPED_CLIENT_REFERENCE.md")
