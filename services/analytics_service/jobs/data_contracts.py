"""Data contracts for validating source data before model computations."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any


@dataclass
class SalesDataContract:
    """Contract for sales records entering model computation."""
    area: str
    date_delivered: date
    product: str
    quantity: float
    net_cost: float
    
    def __post_init__(self):
        if not self.area:
            raise ValueError("Sales data must have an area.")
        if not self.product:
            raise ValueError("Sales data must have a product.")
        if self.quantity < 0:
            raise ValueError(f"Sales quantity cannot be negative. Got {self.quantity}")


@dataclass
class DiseaseDataContract:
    """Contract for historical disease records."""
    area: str
    disease: str
    period_start: date
    cases: int
    is_historical: bool = True
    
    def __post_init__(self):
        if not self.is_historical:
            raise ValueError("Disease data must be purely historical per constraints.")
        if self.cases < 0:
            raise ValueError(f"Disease cases cannot be negative. Got {self.cases}")


@dataclass
class WeatherAPIDataContract:
    """Contract for weather data derived from APIs."""
    area: str
    period_start: date
    provider: str
    precipitation_mm: float
    temperature_c: float
    
    def __post_init__(self):
        if not self.provider:
            raise ValueError("Weather API data must specify a provider for provenance.")


@dataclass
class PAGASADataContract:
    """Contract for weather data derived from historical PAGASA records."""
    area: str
    period_start: date
    precipitation_mm: float
    temperature_c: float
    is_fallback: bool = True
    
    def __post_init__(self):
        if not self.is_fallback:
            raise ValueError("PAGASA data must be used as a fallback or reference.")


def validate_sales_records(records: list[dict[str, Any]]) -> list[SalesDataContract]:
    """Validates and parses raw dictionaries into SalesDataContract objects."""
    valid = []
    for r in records:
        try:
            dt = r.get("date_delivered")
            if isinstance(dt, str):
                dt = date.fromisoformat(dt[:10])
            elif not isinstance(dt, date):
                continue
            
            valid.append(SalesDataContract(
                area=str(r.get("area", "")),
                date_delivered=dt,
                product=str(r.get("product", "")),
                quantity=float(r.get("quantity") or 0.0),
                net_cost=float(r.get("net_cost") or 0.0)
            ))
        except (ValueError, TypeError):
            continue
    return valid
