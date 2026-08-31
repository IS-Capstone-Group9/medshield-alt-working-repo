"""Runtime configuration and controlled Unity Catalog identifiers."""

from __future__ import annotations

import re
from dataclasses import dataclass

_IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def validate_identifier(value: str, label: str) -> str:
    if not _IDENTIFIER_PATTERN.fullmatch(value):
        raise ValueError(f"{label} must be a simple Unity Catalog identifier: {value!r}")
    return value


@dataclass(frozen=True)
class PipelineConfig:
    catalog: str = "workspace"
    bronze_schema: str = "medshield_bronze"
    silver_schema: str = "medshield_silver"
    audit_schema: str = "medshield_audit"
    gold_schema: str = "medshield_gold"
    raw_volume: str = "raw_files"
    raw_subdirectory: str = "sales"
    year_min: int = 2017
    year_max: int = 2025
    financial_tolerance: float = 0.02

    def __post_init__(self) -> None:
        for label, value in (
            ("catalog", self.catalog),
            ("bronze_schema", self.bronze_schema),
            ("silver_schema", self.silver_schema),
            ("audit_schema", self.audit_schema),
            ("gold_schema", self.gold_schema),
            ("raw_volume", self.raw_volume),
        ):
            validate_identifier(value, label)
        if self.year_min > self.year_max:
            raise ValueError("year_min cannot be greater than year_max")
        if self.financial_tolerance < 0:
            raise ValueError("financial_tolerance must be non-negative")
        if (
            not self.raw_subdirectory
            or self.raw_subdirectory.startswith("/")
            or any(part in self.raw_subdirectory for part in ("..", "\\"))
            or not re.fullmatch(r"[A-Za-z0-9_/-]+", self.raw_subdirectory)
        ):
            raise ValueError("raw_subdirectory must be a safe relative volume directory")

    @property
    def schemas(self) -> tuple[str, ...]:
        return (
            self.bronze_schema,
            self.silver_schema,
            self.audit_schema,
            self.gold_schema,
        )

    @property
    def volume_name(self) -> str:
        return f"{self.catalog}.{self.bronze_schema}.{self.raw_volume}"

    @property
    def input_directory(self) -> str:
        return f"/Volumes/{self.catalog}/{self.bronze_schema}/{self.raw_volume}/{self.raw_subdirectory}"

    @property
    def input_glob(self) -> str:
        return f"{self.input_directory}/medshield_data_*.csv"

    @property
    def expected_years(self) -> set[int]:
        return set(range(self.year_min, self.year_max + 1))

    def table(self, layer: str, table_name: str) -> str:
        schema_by_layer = {
            "bronze": self.bronze_schema,
            "silver": self.silver_schema,
            "audit": self.audit_schema,
            "gold": self.gold_schema,
        }
        if layer not in schema_by_layer:
            raise ValueError(f"Unknown layer: {layer}")
        validate_identifier(table_name, "table_name")
        return f"{self.catalog}.{schema_by_layer[layer]}.{table_name}"
