"""Tier 2 DocSpec example: full annotations in Python.

Demonstrates every annotation category: module, flow, method, error, event,
PII, boundary, deterministic, context, uses, performance, sensitive, since,
and deprecated.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional

from docspec_py import (
    doc_boundary,
    doc_context,
    doc_deprecated,
    doc_deterministic,
    doc_error,
    doc_event,
    doc_flow,
    doc_hidden,
    doc_method,
    doc_module,
    doc_performance,
    doc_pii,
    doc_sensitive,
    doc_uses,
)


# ---------------------------------------------------------------------------
# Data Models
# ---------------------------------------------------------------------------


class OrderStatus(Enum):
    """The lifecycle states of an order."""

    PENDING = "pending"
    VALIDATED = "validated"
    CHARGED = "charged"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


@dataclass
class Customer:
    """A customer placing an order."""

    id: str

    @doc_pii(classification="personal", retention="3 years")
    name: str = ""

    @doc_pii(classification="contact", retention="3 years")
    email: str = ""

    @doc_pii(classification="personal", retention="3 years")
    address: str = ""


@dataclass
class OrderItem:
    """A single line item within an order."""

    sku: str
    name: str
    quantity: int
    unit_price: float


@dataclass
class Order:
    """A placed order with its current processing state."""

    id: str
    customer: Customer
    items: list[OrderItem]
    total: float
    status: OrderStatus = OrderStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class PaymentResult:
    """Result of a payment charge operation."""

    transaction_id: str
    status: str  # "success" | "declined" | "error"
    charged_amount: float


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


@doc_error(code="ORDER_001", http_status=400, description="Order failed validation - missing or invalid fields")
class InvalidOrderError(Exception):
    """Raised when an order fails validation rules."""

    def __init__(self, violations: list[str]) -> None:
        self.violations = violations
        super().__init__(f"Invalid order: {', '.join(violations)}")


@doc_error(code="ORDER_002", http_status=402, description="Payment was declined or failed to process")
class PaymentFailedError(Exception):
    """Raised when a payment charge is declined or fails."""

    def __init__(self, reason: str) -> None:
        self.reason = reason
        super().__init__(f"Payment failed: {reason}")


@doc_error(code="ORDER_003", http_status=404, description="Order not found for the given ID")
class OrderNotFoundError(Exception):
    """Raised when an order cannot be found."""

    def __init__(self, order_id: str) -> None:
        self.order_id = order_id
        super().__init__(f"Order not found: {order_id}")


@doc_error(code="ORDER_004", http_status=409, description="Insufficient inventory to fulfill the order")
class InsufficientStockError(Exception):
    """Raised when stock is unavailable for one or more items."""

    def __init__(self, sku: str, available: int) -> None:
        self.sku = sku
        self.available = available
        super().__init__(f"Insufficient stock for {sku}: only {available} available")


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------


@doc_event(name="order.created", channel="orders", description="Fired after order validation and initial persistence")
@dataclass
class OrderCreatedEvent:
    """Emitted when a new order is successfully created."""

    order_id: str
    customer_id: str
    total: float
    timestamp: datetime = field(default_factory=datetime.now)


@doc_event(name="order.charged", channel="orders", description="Fired after successful payment processing")
@dataclass
class OrderChargedEvent:
    """Emitted when payment for an order is successfully charged."""

    order_id: str
    transaction_id: str
    amount: float
    timestamp: datetime = field(default_factory=datetime.now)


@doc_event(name="order.shipped", channel="orders", description="Fired when the order leaves the warehouse")
@dataclass
class OrderShippedEvent:
    """Emitted when an order is shipped to the customer."""

    order_id: str
    tracking_number: str
    timestamp: datetime = field(default_factory=datetime.now)


@doc_event(name="order.cancelled", channel="orders", description="Fired when an order is cancelled before shipment")
@dataclass
class OrderCancelledEvent:
    """Emitted when an order is cancelled."""

    order_id: str
    reason: str
    timestamp: datetime = field(default_factory=datetime.now)


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


@doc_module(
    id="order-service",
    name="Order Service",
    description="Handles order creation, payment processing, fulfillment, and cancellation",
)
@doc_flow(
    id="order-processing",
    name="Order Processing Flow",
    description="End-to-end order lifecycle from placement to delivery",
    trigger="POST /orders",
    steps=[
        {"id": "validate", "name": "Validate Order", "type": "process"},
        {"id": "persist", "name": "Save Order", "type": "storage"},
        {"id": "charge", "name": "Charge Payment", "type": "external"},
        {"id": "fulfill", "name": "Fulfill Order", "type": "process"},
        {"id": "notify", "name": "Notify Customer", "type": "external"},
    ],
)
@doc_flow(
    id="order-cancellation",
    name="Order Cancellation Flow",
    description="Cancels an order and reverses charges if applicable",
    trigger="DELETE /orders/:id",
    steps=[
        {"id": "lookup", "name": "Find Order", "type": "storage"},
        {"id": "refund", "name": "Issue Refund", "type": "external"},
        {"id": "release-stock", "name": "Release Stock", "type": "process"},
        {"id": "cancel-notify", "name": "Notify Cancellation", "type": "external"},
    ],
)
@doc_context(
    id="ecommerce",
    name="E-Commerce Bounded Context",
    description="All order-related operations within the e-commerce domain",
)
@doc_boundary("API entry point")
class OrderService:
    """Order Service - handles the full lifecycle of customer orders.

    This is a Tier 2 DocSpec example demonstrating every annotation category:
    module, flow, method, error, event, PII, boundary, deterministic,
    context, uses, performance, sensitive, since, and deprecated.
    """

    def __init__(self) -> None:
        self._orders: dict[str, Order] = {}

    # -------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------

    @doc_method(since="1.0.0")
    @doc_boundary("API entry point - POST /orders")
    @doc_uses(service="PaymentGateway", operation="charge", protocol="HTTPS")
    @doc_uses(service="InventoryService", operation="reserve", protocol="gRPC")
    @doc_performance(sla="500ms p99", throughput="200 req/s")
    def create_order(self, customer: Customer, items: list[OrderItem]) -> Order:
        """Create a new order for the given customer and items.

        Validates the order, persists it, processes payment, and emits an
        ``order.created`` event. This is the primary entry point for the
        order processing flow.

        Args:
            customer: The customer placing the order.
            items: The line items to include in the order.

        Returns:
            The newly created order.

        Raises:
            InvalidOrderError: If validation fails.
            InsufficientStockError: If items are out of stock.
            PaymentFailedError: If payment processing fails.
        """
        violations = self.validate_order(customer, items)
        if violations:
            raise InvalidOrderError(violations)

        total = self.calculate_total(items)
        order = Order(
            id=self._generate_order_id(),
            customer=customer,
            items=items,
            total=total,
            status=OrderStatus.VALIDATED,
        )

        self._orders[order.id] = order
        self._emit_event(OrderCreatedEvent(order.id, customer.id, total))
        return order

    @doc_method(since="1.0.0")
    @doc_boundary("API entry point - GET /orders/:id")
    def get_order(self, order_id: str) -> Order:
        """Retrieve an order by its ID.

        Args:
            order_id: The unique order identifier.

        Returns:
            The order if found.

        Raises:
            OrderNotFoundError: If no order exists with the given ID.
        """
        order = self._orders.get(order_id)
        if order is None:
            raise OrderNotFoundError(order_id)
        return order

    @doc_method(since="1.0.0")
    @doc_uses(service="PaymentGateway", operation="charge", protocol="HTTPS")
    @doc_performance(sla="2000ms p99", throughput="50 req/s")
    def charge_order(self, order_id: str) -> PaymentResult:
        """Process payment for an existing order.

        Charges the customer via the payment gateway and updates the order
        status to CHARGED. Emits an ``order.charged`` event on success.

        Args:
            order_id: The order to charge.

        Returns:
            The payment result.

        Raises:
            OrderNotFoundError: If the order does not exist.
            PaymentFailedError: If the charge is declined.
        """
        order = self.get_order(order_id)

        result = PaymentResult(
            transaction_id=f"txn_{id(order)}",
            status="success",
            charged_amount=order.total,
        )

        order.status = OrderStatus.CHARGED
        order.updated_at = datetime.now()
        self._emit_event(OrderChargedEvent(order_id, result.transaction_id, result.charged_amount))
        return result

    @doc_method(since="1.1.0")
    @doc_uses(service="ShippingProvider", operation="create_shipment", protocol="HTTPS")
    @doc_uses(service="NotificationService", operation="send_email", protocol="AMQP")
    def ship_order(self, order_id: str, tracking_number: str) -> Order:
        """Ship a charged order to the customer.

        Updates the order status to SHIPPED and emits an ``order.shipped`` event.

        Args:
            order_id: The order to ship.
            tracking_number: The carrier tracking number.

        Returns:
            The updated order.
        """
        order = self.get_order(order_id)
        order.status = OrderStatus.SHIPPED
        order.updated_at = datetime.now()
        self._emit_event(OrderShippedEvent(order_id, tracking_number))
        return order

    @doc_method(since="1.0.0")
    @doc_boundary("API entry point - DELETE /orders/:id")
    @doc_uses(service="PaymentGateway", operation="refund", protocol="HTTPS")
    def cancel_order(self, order_id: str, reason: str) -> Order:
        """Cancel an order that has not yet been shipped.

        Issues a refund if the order was already charged and emits an
        ``order.cancelled`` event.

        Args:
            order_id: The order to cancel.
            reason: A human-readable cancellation reason.

        Returns:
            The cancelled order.

        Raises:
            OrderNotFoundError: If the order does not exist.
        """
        order = self.get_order(order_id)
        order.status = OrderStatus.CANCELLED
        order.updated_at = datetime.now()
        self._emit_event(OrderCancelledEvent(order_id, reason))
        return order

    @doc_method(since="1.0.0")
    @doc_boundary("API entry point - GET /orders")
    def list_orders(self, status: Optional[OrderStatus] = None) -> list[Order]:
        """List all orders, optionally filtered by status.

        Args:
            status: If provided, only return orders with this status.

        Returns:
            A list of matching orders.
        """
        orders = list(self._orders.values())
        if status is not None:
            orders = [o for o in orders if o.status == status]
        return orders

    @doc_method(since="1.0.0")
    @doc_deprecated(since="2.0.0", replacement="list_orders")
    def get_orders_by_status(self, status: OrderStatus) -> list[Order]:
        """Retrieve orders filtered by status.

        .. deprecated:: 2.0.0
            Use :meth:`list_orders` with the ``status`` parameter instead.
            Will be removed in v3.0.

        Args:
            status: The status to filter by.

        Returns:
            A list of orders matching the given status.
        """
        return self.list_orders(status)

    # -------------------------------------------------------------------
    # Pure / Deterministic
    # -------------------------------------------------------------------

    @doc_deterministic
    def validate_order(self, customer: Customer, items: list[OrderItem]) -> list[str]:
        """Validate an order before processing.

        This is a pure function: given the same inputs it always returns the
        same list of violations with no side effects.

        Args:
            customer: The customer to validate.
            items: The order items to validate.

        Returns:
            A list of validation violation messages (empty if valid).
        """
        violations: list[str] = []

        if not customer.id:
            violations.append("Customer ID is required")
        if not customer.email:
            violations.append("Customer email is required")
        if not items:
            violations.append("Order must contain at least one item")

        for item in items:
            if item.quantity <= 0:
                violations.append(f"Invalid quantity for {item.sku}")
            if item.unit_price < 0:
                violations.append(f"Invalid price for {item.sku}")

        return violations

    @doc_deterministic
    def calculate_total(self, items: list[OrderItem]) -> float:
        """Calculate the total price for a list of order items.

        Args:
            items: The line items.

        Returns:
            The sum of (quantity * unit_price) for all items.
        """
        return sum(item.quantity * item.unit_price for item in items)

    # -------------------------------------------------------------------
    # Internal helpers
    # -------------------------------------------------------------------

    @doc_hidden()
    def _generate_order_id(self) -> str:
        """Generate a unique order identifier."""
        import uuid

        return f"ord_{uuid.uuid4().hex[:12]}"

    @doc_hidden()
    def _emit_event(self, event: object) -> None:
        """Publish a domain event (internal dispatch)."""
        print(f"[EVENT] {event}")
