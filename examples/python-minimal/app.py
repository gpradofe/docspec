"""Tier 1 DocSpec example: minimal annotations in Python.

Demonstrates @doc_module for grouping and @doc_hidden for excluding internals.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from docspec_py import doc_module, doc_hidden


@doc_module(id="py-minimal", name="Inventory Service", description="Manages product inventory and stock levels")
class InventoryService:
    """Service responsible for tracking product quantities and stock movements."""

    def __init__(self) -> None:
        self._stock: dict[str, int] = {}

    def add_stock(self, sku: str, quantity: int) -> StockEntry:
        """Add stock for a given SKU.

        Args:
            sku: The product stock-keeping unit identifier.
            quantity: Number of units to add (must be positive).

        Returns:
            A StockEntry reflecting the updated inventory level.

        Raises:
            ValueError: If quantity is not positive.
        """
        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        current = self._stock.get(sku, 0)
        self._stock[sku] = current + quantity
        return StockEntry(sku=sku, quantity=self._stock[sku], updated_at=datetime.now())

    def remove_stock(self, sku: str, quantity: int) -> StockEntry:
        """Remove stock for a given SKU.

        Args:
            sku: The product stock-keeping unit identifier.
            quantity: Number of units to remove (must be positive).

        Returns:
            A StockEntry reflecting the updated inventory level.

        Raises:
            ValueError: If quantity is not positive or exceeds current stock.
        """
        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        current = self._stock.get(sku, 0)
        if quantity > current:
            raise ValueError(f"Insufficient stock for {sku}: have {current}, requested {quantity}")

        self._stock[sku] = current - quantity
        return StockEntry(sku=sku, quantity=self._stock[sku], updated_at=datetime.now())

    def get_stock(self, sku: str) -> int:
        """Get the current stock level for a SKU.

        Args:
            sku: The product stock-keeping unit identifier.

        Returns:
            The current quantity in stock (0 if unknown SKU).
        """
        return self._stock.get(sku, 0)

    def check_availability(self, sku: str, required: int) -> bool:
        """Check whether the requested quantity is available.

        Args:
            sku: The product stock-keeping unit identifier.
            required: The number of units needed.

        Returns:
            True if the current stock meets or exceeds the required quantity.
        """
        return self.get_stock(sku) >= required

    def list_low_stock(self, threshold: int = 10) -> list[StockEntry]:
        """List all SKUs with stock at or below the given threshold.

        Args:
            threshold: The stock level below which a product is considered low.

        Returns:
            A list of StockEntry objects for products at or below the threshold.
        """
        return [
            StockEntry(sku=sku, quantity=qty, updated_at=datetime.now())
            for sku, qty in self._stock.items()
            if qty <= threshold
        ]

    @doc_hidden()
    def _reindex(self) -> None:
        """Rebuild internal indices — not part of the public API."""
        pass

    @doc_hidden()
    def _emit_stock_event(self, sku: str, delta: int) -> None:
        """Fire an internal stock-change event — implementation detail."""
        pass

    @doc_hidden()
    def _validate_sku_format(self, sku: str) -> bool:
        """Check SKU format against internal rules — not exposed."""
        return bool(sku) and len(sku) <= 32


@dataclass
class StockEntry:
    """Represents a snapshot of inventory for a single product."""

    sku: str
    quantity: int
    updated_at: datetime
