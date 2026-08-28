# Non-Medical Product Classification Guide

## Purpose

This guide explains how to separate likely non-medical or non-pharmaceutical items from sales products before forecasting pharmaceutical demand.

Use this before product-level ABC, Prophet, XGBoost, EOQ, ROP, or disease/weather relationship analysis.

## Output Created

The current candidate file is:

`outputs/product_classification_review/likely_non_medical_product_candidates.csv`

The summary file is:

`outputs/product_classification_review/likely_non_medical_product_summary.md`

These files were generated from:

`data/medshield/processed/sales_transactions_area_allocated.json.gz`

## Current Result

The first pass found:

| Measure | Value |
|---|---:|
| Likely non-medical product strings | 330 |
| Matched sales rows | 1,653 |
| Candidate total trade price | 41,144,527.85 |

The scan is keyword-based, so it is not final. It is intended to create a review queue for the product master.

## Candidate Categories

| Proposed category | Examples |
|---|---|
| `office_stationery` | Bond paper, ballpen, folders, record books, markers, correction tape. |
| `printer_it_supplies` | Ink cartridges, printer supplies, flash drives. |
| `janitorial_cleaning` | Trash bags, bleach, disinfectant spray, bathroom tissue. |
| `equipment_appliance` | Aircon, refrigerator, chiller, furniture, appliances. |
| `electrical_hardware` | Electrical wire, batteries, outlets, chargers. |
| `clothing_personal` | T-shirts, uniforms, personal items. |
| `food_admin_other` | Food, tokens, plaques, tarpaulin, administrative items. |

## How To Use In The System

For each reviewed product, update the product master with:

| Field | Recommendation |
|---|---|
| `product_category` | Use a reviewed category such as `medicine`, `medical_supply`, `office_stationery`, `equipment`, or `admin_supply`. |
| `is_medicine` | Set `false` for non-medicine products. |
| `forecast_eligible` | Set `false` for products excluded from pharmaceutical demand forecasting. |
| `mapping_status` | Set `approved` only after review. |
| `review_notes` | Record why the product is excluded or retained. |

## Forecasting Rule

Do not include non-medical products in disease/weather pharmaceutical demand models unless the group explicitly approves a separate business-supplies model.

Use `docs/MEDICAL_DEMAND_CLEANING_WORKFLOW.md` for the complete pipeline order: standard sales cleaning, backward approximation, product classification, medical-only filtering, and exclusion audit.

Recommended split:

| Product type | Forecast use |
|---|---|
| Medicine/pharmaceutical product | Eligible for pharmaceutical demand forecasting after SKU mapping. |
| Medical supply or clinical consumable | Eligible only if included in the capstone scope. |
| Office, admin, equipment, IT, cleaning, personal items | Exclude from pharmaceutical disease/weather demand models. |
| Contract-name backward allocation rows | Use only if estimated rows are explicitly labeled and approved for exploratory analysis. |

## Acceptance Criteria

1. All A-class products have reviewed product categories.
2. Non-medical products are not mixed into pharmaceutical demand forecasts.
3. Disease/weather relationship analysis uses only relevant medicine or approved medical-supply categories.
4. Excluded products remain visible in reporting as business sales, but not in medical demand models.
5. Every exclusion is traceable through `product_category`, `is_medicine`, `forecast_eligible`, and `mapping_status`.
