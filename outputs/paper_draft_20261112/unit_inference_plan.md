# Implementation plan: inferring units and pack sizes from prices

14 November 2026. Goal: convert MedShield's recorded quantities into a consistent unit (pieces) for top product
families, using price evidence in the data and public price references, so planning can move from pesos to packs.
Accountable role: Data Analyst; product meaning stays a catalog-owner decision.

## Why

Recorded quantity mixes units: ENHAMOX's monthly quantity swung from 45 to 1,570 while peso sales stayed steady. Unit
forecasts were 18% less accurate than pesos for this reason, and safety stock can only be stated in pesos.

## Feasibility (probe, 14 Nov)

Unit price per line = gross sales / recorded quantity, top 100 families by net:

| Pattern | Families | Example |
|---|---|---|
| One price level (units already consistent) | 40 | — |
| Distinct levels at pack-like ratios | 24 | LACTAMOX ₱310 / ₱2,970 (≈10×); MAXIFER ₱490 / ₱2,450 (5×); ENHAMOX ₱47 / ₱400–454 / ₱2,800–3,900 |
| Levels at irregular ratios | 20 | MERAZOL ₱390 / ₱1,800 / ₱3,400 / ₱6,248 |
| Too few priced lines | 16 | — |

About 64 of the top 100 look resolvable; the irregular 20 need time and buyer controls or the client.

## Method

### Phase 1: line-level unit prices (0.5 day)
- Unit price = gross sales / recorded quantity, on lines with both positive. Gross is used because discounts vary.
- Keep year and channel (Government, Hospital, area) with each line, since prices drift over time and differ by buyer.
- Output: `unit_prices.csv`.

### Phase 2: price levels per family (1 day)
- Within each family and year, sort log prices and split where consecutive prices jump by more than 35%.
- A level needs at least 5% of the family's lines (minimum 2), so isolated errors don't create levels.
- Track levels across years after adjusting for the family's median price change, so inflation isn't read as a new pack.
- Output: price levels per family with line counts.

### Phase 3: pack-ratio inference (1 day)
- Base level = the lowest level with steady volume. Each higher level's ratio to the base is snapped to a standard pack
  size (2, 3, 4, 5, 6, 10, 12, 20, 24, 25, 30, 50, 100, 120, 200) within ±12%.
- Label text is a second, independent signal: patterns such as `10'S`, `X100`, `BOX OF 50`, `1'S`, `AMPULE`, `VIAL`.
- Each label in the family is assigned a pack factor (pieces per recorded unit).

### Phase 4: external anchoring (1–2 days, Claude web research)
Decides whether the base level is one piece or already a box.
- **DOH Drug Price Reference Index (DPRI):** public per-unit reference prices for generics used in government
  procurement. Needs the generic name (top-100 worksheet; Claude can propose generics from label text for the team to check).
- **Philippine National Formulary** for standard forms and strengths.
- **Retail per-piece prices** from public pharmacy listings as a cross-check.
- Rule: base level within 0.5–2× the reference per-piece price means piece; within the band × a standard pack means box.
- Each anchor records its source URL and access date. Done for the top 30 families first (about 45% of net).

### Phase 5: normalized units and confidence (0.5 day)
- Pieces = recorded quantity × pack factor.
- Confidence per family:
  - **A**: price ratio, label text and external reference agree.
  - **B**: two of the three agree.
  - **C**: one signal only, or conflicting. Not used for planning.
- Output: `unit_mapping_candidate.csv` (label, family, pack factor, unit, confidence, evidence), hash-pinned like the
  family mapping.

### Phase 6: validation (1 day, pre-registered)
Rules fixed before running:
1. **Price consistency:** after normalization, the price per piece within a family and year should have a coefficient of
   variation at least 50% lower than before.
2. **Smoother demand:** monthly piece series for grade-A/B families should have a lower coefficient of variation than raw
   quantity, with peso sales unchanged as the control.
3. **Label agreement:** where the label states a pack size, the inferred factor matches in at least 90% of labels.
4. **Client check:** the top 10 as a yes/no sheet ("we think ENHAMOX is sold per piece at about ₱47 and per box of 10
   at about ₱450; correct?"). This replaces open question #2 with a 5-minute confirmation.

### Phase 7: use (1 day, pre-registered)
- Rerun unit forecasts on pieces for grade-A/B families: mean_6 on pieces vs mean_6 on pesos.
- Restate per-family safety stock and the steady-family (AX) reorder levels in pieces and boxes.
- Feed EOQ and reorder points real units instead of example inputs.
- Dashboard integration only after the validation passes, with the confidence grade shown.

## Effort and order

| Phase | Effort | Depends on |
|---|---|---|
| 1–3 internal inference | 2.5 days | — |
| 4 external anchoring, top 30 | 1–2 days | generic names (proposed by Claude, checked by team) |
| 5–6 normalization and validation | 1.5 days | 1–4 |
| 7 use in models | 1 day | 6 passing |

About 6–7 working days in total. Phases 1–3 alone already resolve the clearest 24 families.

## Risks

| Risk | Mitigation |
|---|---|
| Price levels reflect buyer-specific pricing, not packs | Split by channel before clustering; require a pack-like ratio |
| Inflation read as a new pack size | Year-adjusted levels; consecutive-year tracking |
| Wrong generic gives a wrong reference price | Generic proposals checked by the team; reference used only to choose piece vs box, never to set the factor |
| Mixed products in one family | Grade C, excluded; flagged for the family review |
| Over-claiming | Confidence grades; client confirmation for the top 10; nothing changes procurement |

## What this does not do

- It does not verify stock on hand or real purchase costs.
- It does not replace the catalog owner's confirmation; it reduces the client's work from an open question to a yes/no check.
- It does not change any existing result until Phase 6 passes.
