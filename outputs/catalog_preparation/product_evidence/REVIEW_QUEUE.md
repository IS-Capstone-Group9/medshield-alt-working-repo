# Product evidence found locally

Status: pending review; no product approvals or Databricks deployment.

Found `C:\Users\Adrian\Capstone-Codes\2026 PRICELIST.pdf` and two byte-identical Downloads copies (SHA-256 `f4d5b87cbff348ac3fb1e6845af359e4a98103e26ad8bb14c032a39f408b2c55`).
All three pages were extracted and visually inspected. The document is the MedShield Pharma Corp. standard injectable price list for 2026.

Extracted 96 presentation rows; 265 historical sales labels have a brand-text candidate. These are leads, not verified matches.

## Start with these 20 labels

Ordered by positive sales contribution in the fact-version-19 label receipt. A larger amount sets review priority; it does not prove identity.

| Historical sales label | Positive sales (PHP) | Catalog candidates | Review status |
|---|---:|---|---|
| SPEEDA 2.5IU/0.5ML | 22,466,448.23 | p.2 SPEEDA / Rabies Vaccine, Vero Cell (purified) 2.5 IU/0.5mL lyophillized powder / Box of 5's | Needs review |
| BUPIRIGHT 5MG/ML 0.5% IN 8% 4ML | 15,966,455.39 | p.2 BUPIRIGHT/BUPILON / Bupivacaine + Dextrose 0.5% + 8%, 4 mL / Box of 1's | Needs review |
| SITIXON 1G | 13,053,911.68 | p.2 SITIXON / CEFZOX/HAIXONE / Ceftriaxone (as Sodium) w/ Diluent 1g / Box of 1's | Needs review |
| EVAPROST 250MCG/ML | 9,753,530.12 | p.1 EVAPROST / Carboprost Trometamol 125mcg/0.5ml / Box of 10's; p.1 EVAPROST / Carboprost Trometamol 250mcg/ml / Box of 10's | Needs review |
| SPEEDA | 7,558,970.97 | p.2 SPEEDA / Rabies Vaccine, Vero Cell (purified) 2.5 IU/0.5mL lyophillized powder / Box of 5's | Needs review |
| EUROXONE 1G | 7,315,199.96 | p.2 EUROXONE / Ceftriaxone (as Sodium) w/ Diluent 1g / Box of 1's | Needs review |
| MAXIFER 20MG/ML | 7,295,980.00 | p.1 MAXIFER / Iron Sucrose 20mg/ml (100mg/5ml) / Box of 5's | Needs review |
| BUPIRIGHT AMPULE | 4,883,775.75 | p.2 BUPIRIGHT/BUPILON / Bupivacaine + Dextrose 0.5% + 8%, 4 mL / Box of 1's | Needs review |
| ANTITET 1500IU/0.7ML | 4,641,242.20 | p.2 SHARJVAX/ANTITET / Vaccine, Anti Tetanus serum (equine) 1,500 IU/0.7mL solution for injection ampoule/vial / Box of 10's | Needs review |
| DANOXIME 750MG | 4,474,306.04 | p.2 ZINACARE / DANOXIME / Cefuroxime (as Sodium) w/ Diluent 750mg / Box of 1's | Needs review |
| MERAZOL 40MG | 4,102,882.25 | p.1 OPREX / MERAZOL / RANZOLE / Omeprazole 40mg w/o Diluent / Box of 1's | Needs review |
| EVAPROST 125MCG/ML | 3,753,930.67 | p.1 EVAPROST / Carboprost Trometamol 125mcg/0.5ml / Box of 10's; p.1 EVAPROST / Carboprost Trometamol 250mcg/ml / Box of 10's | Needs review |
| GYNE-TOCIN 10IU/ML | 3,665,975.50 | p.2 GYNE-TOCIN / AMBTOCYN / Oxytocin 10iu/ml / Box of 10's | Needs review |
| ANTIZOAL 5MG/ML | 3,372,167.00 | p.3 ANTIZOAL / Metronidazole 5mg/ml (500mg/100ml) / Box of 1's | Needs review |
| HAIXONE WITH DILUENT 1G | 3,277,185.13 | p.2 SITIXON / CEFZOX/HAIXONE / Ceftriaxone (as Sodium) w/ Diluent 1g / Box of 1's | Needs review |
| ALBUMINAR-20 20% 50ML | 2,697,000.00 | p.1 ALBUMINAR-20 / Human Albumin 20% 50ml / Box of 1 | Needs review |
| ZINACARE 750MG W/ DILUENT | 2,677,030.90 | p.2 ZINACARE / DANOXIME / Cefuroxime (as Sodium) w/ Diluent 750mg / Box of 1's | Needs review |
| SPASBASCINE | 2,566,365.00 | p.1 SPASBASCINE / SPASMOSON / Hyoscine N Butyl Bromide 20mg/ml 1ml / Box of 10's | Needs review |
| CARDOWIN 1MG | 2,258,825.11 | p.3 CARDOWIN / AGYNAPIN/NICARSAPH / Nicardipine 1mg/ml x 10ml / Box of 1's | Needs review |
| SHARJVAX 1500 I.U. / 0.7ML | 2,256,050.64 | p.2 SHARJVAX/ANTITET / Vaccine, Anti Tetanus serum (equine) 1,500 IU/0.7mL solution for injection ampoule/vial / Box of 10's | Needs review |

## Finish the pending fields

1. Check each full catalog presentation against the source label and the actual product label. Resolve multiple brand or strength alternatives before mapping aliases.
2. Find an invoice or delivery record for the historical sale showing the product code and whether its quantity counts boxes, individual ampoules/vials, or another unit. The price list alone cannot answer this.
3. Enter the supported product details in the authoritative product master. Record the evidence ID, page, file hash, reviewer, review date and unresolved questions. Approve each decision separately only when supported.
4. Keep forecast eligibility false until identity, category, historical unit and forecasting suitability are accepted. Adjusted-source transactions additionally need independent transaction evidence.
5. Revalidate the master and regenerate the publication contract/package after any CSV change. The version-19 draft package is bound to the exact unchanged CSV bytes.

## Specific issues to resolve

- NORBIT appears under both norepinephrine and nicardipine; a brand-only join would be unsafe.
- EVAPROST has two printed concentration/presentation entries; preserve them separately pending product-label verification.
- Slash-separated brands are alternatives, not proof that products share one sellable identity.
- Printed prices are contemporary catalog prices. Do not overwrite historical prices or acquisition costs.

No purchase invoices, supplier SKU records or historical packaging records were identified by the local filename search. This is a search result, not proof that no such records exist.
The canonical 4,561-row CSV is unchanged; identity/unit approvals remain zero.

Full source rows and all matching candidates are in `review_candidates.json` beside this guide.
