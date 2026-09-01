"""Versioned dataset contracts shared by the Databricks pipeline and tests."""

from __future__ import annotations

BUSINESS_COLUMNS: tuple[str, ...] = (
    "area",
    "dr_number",
    "date_delivered",
    "product",
    "quantity",
    "contract_price_unit",
    "gross_contract_value",
    "discount_rate",
    "discount_amount",
    "net_contract_value",
    "transfer_price_unit",
    "total_transfer_price",
    "gross_margin_amount",
    "gross_margin_pct",
)
QUALITY_AND_LINEAGE_COLUMNS: tuple[str, ...] = (
    "area_type",
    "year",
    "quality_status",
    "quality_notes",
    "duplicate",
    "standardization_applied",
    "input_stage",
    "data_source_year",
    "in_analysis_range",
    "source_workbook",
    "source_sheet",
    "source_row_number",
    "source_hash",
    "business_hash",
)

CANONICAL_COLUMNS: tuple[str, ...] = BUSINESS_COLUMNS + QUALITY_AND_LINEAGE_COLUMNS

TECHNICAL_COLUMNS: tuple[str, ...] = (
    "import_batch_id",
    "quality_rule_codes",
    "ingested_at",
)

SOURCE_LAYOUTS: dict[int, dict[str, int | None]] = {
    2017: {
        "dr_number_raw": 0,
        "date_delivered_raw": 1,
        "area_raw": 2,
        "product_raw": 3,
        "quantity_primary_raw": 4,
        "contract_price_unit_raw": 5,
        "gross_contract_value_raw": 6,
        "discount_rate_raw": 7,
        "discount_amount_raw": 8,
        "quantity_secondary_raw": 9,
        "transfer_price_unit_raw": 10,
        "total_transfer_price_raw": 11,
        "gross_margin_amount_raw": 12,
        "gross_margin_pct_raw": None,
        "net_contract_value_raw": None,
    },
    2018: {
        "dr_number_raw": 0,
        "date_delivered_raw": 1,
        "area_raw": 2,
        "product_raw": 3,
        "quantity_primary_raw": 4,
        "contract_price_unit_raw": 5,
        "gross_contract_value_raw": 6,
        "discount_rate_raw": None,
        "discount_amount_raw": 7,
        "quantity_secondary_raw": None,
        "net_contract_value_raw": 8,
        "transfer_price_unit_raw": 9,
        "total_transfer_price_raw": 10,
        "gross_margin_amount_raw": 11,
        "gross_margin_pct_raw": None,
    },
    2019: {
        "dr_number_raw": 0,
        "date_delivered_raw": 1,
        "area_raw": 2,
        "product_raw": 3,
        "quantity_primary_raw": 4,
        "contract_price_unit_raw": 5,
        "gross_contract_value_raw": 6,
        "discount_rate_raw": None,
        "discount_amount_raw": 7,
        "quantity_secondary_raw": None,
        "net_contract_value_raw": 8,
        "transfer_price_unit_raw": 9,
        "total_transfer_price_raw": 10,
        "gross_margin_amount_raw": 11,
        "gross_margin_pct_raw": None,
    },
}

SHARED_2020_PLUS_LAYOUT: dict[str, int | None] = {
    "area_raw": 0,
    "dr_number_raw": 1,
    "date_delivered_raw": 2,
    "product_raw": 3,
    "quantity_primary_raw": 4,
    "quantity_secondary_raw": None,
    "contract_price_unit_raw": 5,
    "gross_contract_value_raw": 6,
    "discount_rate_raw": None,
    "discount_amount_raw": 7,
    "net_contract_value_raw": 8,
    "transfer_price_unit_raw": 9,
    "total_transfer_price_raw": 10,
    "gross_margin_amount_raw": 11,
    "gross_margin_pct_raw": 12,
}

for _year in range(2020, 2026):
    SOURCE_LAYOUTS[_year] = {
        **SHARED_2020_PLUS_LAYOUT,
        "gross_margin_pct_raw": 12 if _year >= 2021 else None,
    }

AREA_ALIASES: dict[str, str] = {
    "CAM NORTE": "Camarines Norte",
    "CAMARINES NORTE": "Camarines Norte",
    "CAM SUR": "Camarines Sur",
    "CAMARINES SUR": "Camarines Sur",
    "METRO MANILA": "Metro Manila",
    "NCR": "Metro Manila",
    "QUEZON PROVINCE": "Quezon",
    "EASTERN QUEZON": "Quezon",
    "QUEZON PROVINCE (EASTERN)": "Quezon",
    "BATNGAS": "Batangas",
    "LAGUMA": "Laguna",
    "HOPITAL": "Hospital",
    "LAGASPI": "Legaspi",
    "LEGAZPI": "Legaspi",
    "LOWER CAVITE": "Cavite",
    "SUPPLLIES": "Supplies",
    "EASTERN": "East",
}

GEOGRAPHIC_AREAS: frozenset[str] = frozenset(
    {
        "Albay",
        "Batangas",
        "Bicol",
        "Camarines Norte",
        "Camarines Sur",
        "Cavite",
        "East",
        "Laguna",
        "Legaspi",
        "Lucena",
        "Marinduque",
        "Metro Manila",
        "Mindoro",
        "Quezon",
        "Rizal",
    }
)

NON_GEOGRAPHIC_AREAS: frozenset[str] = frozenset(
    {
        "Admin",
        "Equipment",
        "Government",
        "Hospital",
        "Losses",
        "Personal",
        "Pharma",
        "Rakkk",
        "Supplies",
    }
)

INVALID_TEXT_TOKENS: frozenset[str] = frozenset(
    {
        "#DIV/0!",
        "#N/A",
        "#NAME?",
        "#NULL!",
        "#REF!",
        "#VALUE!",
        "NAN",
        "NONE",
        "NULL",
    }
)
