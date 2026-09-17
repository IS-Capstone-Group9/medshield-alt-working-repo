# MedShield Area Prioritization & Buyer Sector Classification Reference

## 1. Executive Summary & Purpose

This document defines the canonical architecture and operational logic for **Area Prioritization**, **Geographic Anchoring**, and **Buyer Sector / Channel Classification** within the MedShield Decision-Support System (DSS).

MedShield is an Enterprise Decision-Support System designed for pharmaceutical distribution and inventory planning under seasonal disease surge conditions in the Philippines (specifically Region IV-A CALABARZON, Region IV-B MIMAROPA, and Region V Bicol).

---

## 2. Core Architectural Separation: Geography vs. Buyer Cluster vs. Channel

In the MedShield data pipeline and dashboard runtime, commercial records are classified across three distinct orthogonal dimensions:

```mermaid
flowchart TD
    RawRecord["Raw Ingestion / Sales Fact Row"] --> GeoAnchor["1. Geographic Area (Territory / LGU)"]
    RawRecord --> BuyerCluster["2. Buyer Sector / Cluster"]
    RawRecord --> ChannelRoute["3. Commercial Channel"]

    GeoAnchor -->|"Ranking Target"| AreaDSS["Area Prioritization Engine (MCDA Score)"]
    BuyerCluster -->|"Filter & Composition"| AreaDSS
    ChannelRoute -->|"Detailed Drill-Down"| PrescriptiveDSS["Sales & Prescriptive Modules"]

    subgraph Geography["1. Geographic Anchoring (Where)"]
        Cavite["Cavite (Consolidates Lower Cavite)"]
        Batangas["Batangas"]
        Laguna["Laguna"]
        Quezon["Quezon"]
        Marinduque["Marinduque"]
        CamNorte["Camarines Norte"]
        CamSur["Camarines Sur"]
        Albay["Albay"]
        Mindoro["Mindoro"]
    end

    subgraph Sectors["2. Buyer Clusters (Who)"]
        Gov["Government (Public Bidding, LGU)"]
        Priv["Private (Retail Pharmacies, Private Hospitals, Clinics)"]
        Int["Internal (Admin, Logistics Supplies, Overhead)"]
    end

    subgraph Channels["3. Commercial Channels (How)"]
        RetPharma["Retail Pharmacy"]
        PrivHosp["Private Hospital"]
        PrivCare["Private Care"]
        GovBid["Government Bidding"]
        LGUChan["LGU"]
        IntAdmin["Internal Administration / Supplies / Equipment"]
    end
```

### Key Principles:
1. **Geographic Area (`territory` / `lgu_city_muni`)**:
   - Represents the physical distribution territory where pharmaceutical demand occurs.
   - **Area Prioritization** ranks these geographic territories by priority score.
2. **Buyer Sector / Cluster (`sector`)**:
   - Represents the purchasing entity's ownership structure (`Government`, `Private`, `Internal`).
   - Acts as a **filter** and **composition metric** (e.g., *Cavite: 88% Private · 12% Government*), **not** an area name.
3. **Commercial Channel (`channel`)**:
   - Represents the route-to-market (`Retail Pharmacy`, `Private Hospital`, `Private Care`, `Government Bidding`, `LGU`, `Internal Admin`).

---

## 3. Canonical Buyer Sector & Channel Mapping Matrix

Adhering to [`datasources/templates/buyer_sector_mapping.csv`](file:///c:/Users/Ethan/ega_KERR/datasources/templates/buyer_sector_mapping.csv) and [`docs/MAPPED_CLIENT_REFERENCE.md`](file:///c:/Users/Ethan/ega_KERR/docs/MAPPED_CLIENT_REFERENCE.md):

| Raw Identifier / String Pattern | Buyer Sector (`sector`) | Distribution Channel (`channel`) | Geographic Anchor (`territory`) | Classification Basis |
| :--- | :--- | :--- | :--- | :--- |
| `CAVITE`, `LOWER CAVITE` | **Private** | `Retail Pharmacy` | **Cavite** (CALABARZON) | Commercial provincial retail pharmacy distribution. `Lower Cavite` is consolidated into `Cavite`. |
| `BATANGAS` | **Private** | `Retail Pharmacy` | **Batangas** (CALABARZON) | Provincial commercial account. |
| `LAGUNA` | **Private** | `Retail Pharmacy` | **Laguna** (CALABARZON) | Provincial commercial account. |
| `QUEZON`, `EAST`, `EASTERN QUEZON` | **Private** | `Retail Pharmacy` | **Quezon** (CALABARZON) | Provincial / regional territory commercial account. |
| `MARINDUQUE` | **Private** | `Retail Pharmacy` | **Marinduque** (MIMAROPA) | Island province retail account. |
| `CAMARINES NORTE`, `CAM NORTE` | **Private** | `Retail Pharmacy` | **Camarines Norte** (Bicol) | Provincial commercial account. |
| `CAMARINES SUR`, `CAM SUR`, `BICOL` | **Private** | `Retail Pharmacy` | **Camarines Sur** (Bicol) | Provincial commercial account. |
| `ALBAY`, `LEGASPI`, `LAGASPI` | **Private** | `Retail Pharmacy` | **Albay** (Bicol) | Provincial commercial account. |
| `MINDORO` | **Private** | `Retail Pharmacy` | **Mindoro** (MIMAROPA) | Provincial commercial account. |
| `HOSPITAL`, `HOPITAL`, `RAKKK` | **Private** | `Private Hospital` | **Quezon** (Lucena City anchor) | Private inpatient medical center. |
| `LUCENA` | **Private** | `Private Care` | **Quezon** (Lucena City anchor) | Urban private clinical care. |
| `PHARMA` | **Private** | `Retail Pharmacy` | **Quezon** (Lucena City anchor) | Independent retail pharmacy. |
| `GOVERNMENT` | **Government** | `Government Bidding` | **Quezon** / Regional Hub | Institutional public procurement. |
| `PAGBILAO` | **Government** | `LGU` | **Quezon** (Pagbilao LGU) | Reference-backed Municipal LGU (`CLI-0340`). |
| `ADMIN` | **Internal** | `Internal Admin` | *MedShield HQ / Corporate* | Corporate overhead & admin (non-commercial). |
| `SUPPLIES`, `SUPPLLIES`, `SUPPLIES AND EQUIPMENT` | **Internal** | `Internal Supplies` | *MedShield HQ / Logistics* | Internal operational supplies (non-commercial). |
| `EQUIPMENT`, `PERSONAL`, `LOSSES` | **Internal** | `Internal Equipment / Personal / Losses` | *MedShield HQ* | Internal write-offs & asset allocation. |

---

## 4. Geographic Hierarchy & Imputation Ladder

When ingesting client accounts from raw ledgers or invoices, geographic location is resolved using the 4-step imputation hierarchy from [`docs/MAPPED_CLIENT_REFERENCE.md`](file:///c:/Users/Ethan/ega_KERR/docs/MAPPED_CLIENT_REFERENCE.md):

1. **Direct Search / Physical Facility Lookup**:
   - Matches known facilities to their specific LGU (e.g., *Botika Estela* $\rightarrow$ `Balayan, Batangas`).
2. **LGU Known, Specific Facility Unspecified**:
   - Defaults to the Municipal or City Health Office (**MHO / CHO**) (e.g., *Pagbilao* $\rightarrow$ `Pagbilao CHO/MHO, Quezon`).
3. **Only Province Known (e.g., individual sales agent / territory account)**:
   - Defaults to the Provincial Health Office (**PHO**) in the provincial capital (e.g., *A/R - Batangas - Gerardo Delos Reyes* $\rightarrow$ `Batangas City PHO`).
4. **Only Region Known**:
   - Defaults to the DOH Center for Health Development (**CHD**) Regional Hub.
5. **Dynamic "Add Client" Flow**:
   - New client strings in imported datasets are treated as valid `ui_subtag` entries, mapped to their verified LGU anchor, and saved to the system master dictionary.

---

## 5. Multi-Criteria Decision Analysis (MCDA) Scoring Model

The **Area Prioritization** module calculates composite territory ranking scores using Multi-Criteria Decision Analysis (MCDA):

$$\text{MCDA Composite Score} = \left( \frac{\text{Territory Net Sales}}{\text{Max Territory Net Sales}} \times W_{\text{sales}} \right) + \left( \frac{\text{Active Periods with Transactions}}{\text{Total Available Periods}} \times W_{\text{coverage}} \right)$$

### Complementary Weight Dynamics
- The system enforces complementary weights: $W_{\text{sales}} + W_{\text{coverage}} = 100\%$.
- Default configuration: **60% Sales Value Scale** + **40% Active-Period Coverage**.
- Sliders dynamically adjust weights in real time and immediately update Pareto and profile tables.

### Interactive Dimension Controls
- **Buyer Cluster Filter**: Switch between `All Clusters`, `Private`, `Government`, or `Internal`.
- **Product Filter**: Filter by all catalog items or individual therapeutic products.
- **Evidence Filter**: Toggle between `Actual only` and `Actual + estimates`.
- **Time Horizon**: Seamlessly recalculates scores across `Last 30 Days`, `Last 3 Months`, `Last 6 Months`, `Last 12 Months`, `All Time (2017–2025+)`, or `Custom Date Range`.

---

## 6. Pipeline Verification & Quality Metrics

- **Databricks Gold Layer Fact Ingestion (`sales_restart_fact_candidate`)**:
  - 37,178 Gold fact rows ingested with 0 duplicate rows.
  - 25,883 aggregated sector rows published across `['Government', 'Private', 'Internal']`.
  - 0 unmapped or dangling rows.
- **Automated Validation**:
  - Full Playwright E2E suites passing (`medshield-dashboard.spec.ts`, `area-prioritization.spec.ts`, `sales-sectors.spec.ts`).
  - 71 Python analytical unit tests passing in `services/tests/`.
