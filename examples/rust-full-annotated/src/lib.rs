//! Tier 2 DocSpec example: full annotations in Rust.
//!
//! Demonstrates every annotation category: module, flow, method, error, event,
//! PII, boundary, deterministic, context, uses, performance, sensitive, since,
//! and deprecated.

use docspec_macros::*;

// ---------------------------------------------------------------------------
// Data Models
// ---------------------------------------------------------------------------

/// A customer placing an order.
pub struct Customer {
    pub id: String,

    /// Full legal name of the customer.
    #[doc_pii(classification = "personal", retention = "3 years")]
    pub name: String,

    /// Customer email address.
    #[doc_pii(classification = "contact", retention = "3 years")]
    pub email: String,

    /// Billing address.
    #[doc_pii(classification = "personal", retention = "3 years")]
    pub address: String,
}

/// A single line item within an order.
pub struct OrderItem {
    pub sku: String,
    pub name: String,
    pub quantity: u32,
    pub unit_price: f64,
}

/// The lifecycle states of an order.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OrderStatus {
    Pending,
    Validated,
    Charged,
    Shipped,
    Delivered,
    Cancelled,
}

/// A placed order with its current processing state.
pub struct Order {
    pub id: String,
    pub customer: Customer,
    pub items: Vec<OrderItem>,
    pub total: f64,
    pub status: OrderStatus,
    pub created_at: u64,
    pub updated_at: u64,
}

/// Result of a payment charge operation.
pub struct PaymentResult {
    pub transaction_id: String,
    pub status: PaymentStatus,
    pub charged_amount: f64,
}

/// The outcome of a payment operation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PaymentStatus {
    Success,
    Declined,
    Error,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/// Errors that can occur during order processing.
#[derive(Debug)]
pub enum OrderError {
    /// Order failed validation — missing or invalid fields.
    #[doc_error(code = "ORDER_001", http_status = 400)]
    InvalidOrder(Vec<String>),

    /// Payment was declined or failed to process.
    #[doc_error(code = "ORDER_002", http_status = 402)]
    PaymentFailed(String),

    /// Order not found for the given ID.
    #[doc_error(code = "ORDER_003", http_status = 404)]
    NotFound(String),

    /// Insufficient inventory to fulfill the order.
    #[doc_error(code = "ORDER_004", http_status = 409)]
    InsufficientStock { sku: String, available: u32 },
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/// Emitted when a new order is successfully created and persisted.
#[doc_event(name = "order.created", channel = "orders", description = "Fired after order validation and initial persistence")]
pub struct OrderCreatedEvent {
    pub order_id: String,
    pub customer_id: String,
    pub total: f64,
    pub timestamp: u64,
}

/// Emitted when payment for an order is successfully charged.
#[doc_event(name = "order.charged", channel = "orders", description = "Fired after successful payment processing")]
pub struct OrderChargedEvent {
    pub order_id: String,
    pub transaction_id: String,
    pub amount: f64,
    pub timestamp: u64,
}

/// Emitted when an order is shipped to the customer.
#[doc_event(name = "order.shipped", channel = "orders", description = "Fired when the order leaves the warehouse")]
pub struct OrderShippedEvent {
    pub order_id: String,
    pub tracking_number: String,
    pub timestamp: u64,
}

/// Emitted when an order is cancelled.
#[doc_event(name = "order.cancelled", channel = "orders", description = "Fired when an order is cancelled before shipment")]
pub struct OrderCancelledEvent {
    pub order_id: String,
    pub reason: String,
    pub timestamp: u64,
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/// Order Service — handles the full lifecycle of customer orders.
///
/// This is a Tier 2 DocSpec example demonstrating every annotation category:
/// module, flow, method, error, event, PII, boundary, deterministic,
/// context, uses, performance, sensitive, since, and deprecated.
#[doc_module(
    id = "order-service",
    name = "Order Service",
    description = "Handles order creation, payment processing, fulfillment, and cancellation"
)]
#[doc_flow(
    id = "order-processing",
    name = "Order Processing Flow",
    description = "End-to-end order lifecycle from placement to delivery",
    trigger = "POST /orders",
    steps = [
        { id = "validate", name = "Validate Order", r#type = "process" },
        { id = "persist", name = "Save Order", r#type = "storage" },
        { id = "charge", name = "Charge Payment", r#type = "external" },
        { id = "fulfill", name = "Fulfill Order", r#type = "process" },
        { id = "notify", name = "Notify Customer", r#type = "external" },
    ]
)]
#[doc_flow(
    id = "order-cancellation",
    name = "Order Cancellation Flow",
    description = "Cancels an order and reverses charges if applicable",
    trigger = "DELETE /orders/:id",
    steps = [
        { id = "lookup", name = "Find Order", r#type = "storage" },
        { id = "refund", name = "Issue Refund", r#type = "external" },
        { id = "release-stock", name = "Release Stock", r#type = "process" },
        { id = "cancel-notify", name = "Notify Cancellation", r#type = "external" },
    ]
)]
#[doc_context(
    id = "ecommerce",
    name = "E-Commerce Bounded Context",
    description = "All order-related operations within the e-commerce domain"
)]
pub struct OrderService {
    orders: std::collections::HashMap<String, Order>,
    next_id: u64,
}

impl OrderService {
    /// Create a new, empty OrderService.
    pub fn new() -> Self {
        Self {
            orders: std::collections::HashMap::new(),
            next_id: 1,
        }
    }

    // -------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------

    /// Create a new order for the given customer and items.
    ///
    /// Validates the order, persists it, processes payment, and emits an
    /// `order.created` event. This is the primary entry point for the
    /// order processing flow.
    ///
    /// # Arguments
    ///
    /// * `customer` - The customer placing the order.
    /// * `items` - The line items to include in the order.
    ///
    /// # Errors
    ///
    /// Returns `OrderError::InvalidOrder` if validation fails,
    /// `OrderError::InsufficientStock` if items are out of stock, or
    /// `OrderError::PaymentFailed` if payment processing fails.
    #[doc_method(since = "1.0.0")]
    #[doc_boundary("API entry point - POST /orders")]
    #[doc_uses(service = "PaymentGateway", operation = "charge", protocol = "HTTPS")]
    #[doc_uses(service = "InventoryService", operation = "reserve", protocol = "gRPC")]
    #[doc_performance(sla = "500ms p99", throughput = "200 req/s")]
    pub fn create_order(
        &mut self,
        customer: Customer,
        items: Vec<OrderItem>,
    ) -> Result<&Order, OrderError> {
        let violations = Self::validate_order(&customer, &items);
        if !violations.is_empty() {
            return Err(OrderError::InvalidOrder(violations));
        }

        let total = Self::calculate_total(&items);
        let id = self.generate_order_id();

        let order = Order {
            id: id.clone(),
            customer,
            items,
            total,
            status: OrderStatus::Validated,
            created_at: Self::now(),
            updated_at: Self::now(),
        };

        self.orders.insert(id.clone(), order);
        self.emit_event("order.created");
        Ok(self.orders.get(&id).unwrap())
    }

    /// Retrieve an order by its ID.
    ///
    /// # Arguments
    ///
    /// * `order_id` - The unique order identifier.
    ///
    /// # Errors
    ///
    /// Returns `OrderError::NotFound` if no order exists with the given ID.
    #[doc_method(since = "1.0.0")]
    #[doc_boundary("API entry point - GET /orders/:id")]
    pub fn get_order(&self, order_id: &str) -> Result<&Order, OrderError> {
        self.orders
            .get(order_id)
            .ok_or_else(|| OrderError::NotFound(order_id.to_string()))
    }

    /// Process payment for an existing order.
    ///
    /// Charges the customer via the payment gateway and updates the order
    /// status to `Charged`. Emits an `order.charged` event on success.
    ///
    /// # Arguments
    ///
    /// * `order_id` - The order to charge.
    ///
    /// # Errors
    ///
    /// Returns `OrderError::NotFound` if the order does not exist, or
    /// `OrderError::PaymentFailed` if the charge is declined.
    #[doc_method(since = "1.0.0")]
    #[doc_uses(service = "PaymentGateway", operation = "charge", protocol = "HTTPS")]
    #[doc_performance(sla = "2000ms p99", throughput = "50 req/s")]
    pub fn charge_order(&mut self, order_id: &str) -> Result<PaymentResult, OrderError> {
        let order = self
            .orders
            .get_mut(order_id)
            .ok_or_else(|| OrderError::NotFound(order_id.to_string()))?;

        let result = PaymentResult {
            transaction_id: format!("txn_{}", Self::now()),
            status: PaymentStatus::Success,
            charged_amount: order.total,
        };

        order.status = OrderStatus::Charged;
        order.updated_at = Self::now();
        self.emit_event("order.charged");
        Ok(result)
    }

    /// Ship a charged order to the customer.
    ///
    /// Updates the order status to `Shipped` and emits an `order.shipped` event.
    ///
    /// # Arguments
    ///
    /// * `order_id` - The order to ship.
    /// * `tracking_number` - The carrier tracking number.
    #[doc_method(since = "1.1.0")]
    #[doc_uses(service = "ShippingProvider", operation = "create_shipment", protocol = "HTTPS")]
    #[doc_uses(service = "NotificationService", operation = "send_email", protocol = "AMQP")]
    pub fn ship_order(
        &mut self,
        order_id: &str,
        tracking_number: &str,
    ) -> Result<&Order, OrderError> {
        let order = self
            .orders
            .get_mut(order_id)
            .ok_or_else(|| OrderError::NotFound(order_id.to_string()))?;

        order.status = OrderStatus::Shipped;
        order.updated_at = Self::now();
        self.emit_event("order.shipped");
        Ok(self.orders.get(order_id).unwrap())
    }

    /// Cancel an order that has not yet been shipped.
    ///
    /// Issues a refund if the order was already charged and emits an
    /// `order.cancelled` event.
    ///
    /// # Arguments
    ///
    /// * `order_id` - The order to cancel.
    /// * `reason` - A human-readable cancellation reason.
    ///
    /// # Errors
    ///
    /// Returns `OrderError::NotFound` if the order does not exist.
    #[doc_method(since = "1.0.0")]
    #[doc_boundary("API entry point - DELETE /orders/:id")]
    #[doc_uses(service = "PaymentGateway", operation = "refund", protocol = "HTTPS")]
    pub fn cancel_order(
        &mut self,
        order_id: &str,
        reason: &str,
    ) -> Result<&Order, OrderError> {
        let order = self
            .orders
            .get_mut(order_id)
            .ok_or_else(|| OrderError::NotFound(order_id.to_string()))?;

        order.status = OrderStatus::Cancelled;
        order.updated_at = Self::now();
        self.emit_event("order.cancelled");
        Ok(self.orders.get(order_id).unwrap())
    }

    /// List all orders, optionally filtered by status.
    ///
    /// # Arguments
    ///
    /// * `status` - If `Some`, only return orders with this status.
    #[doc_method(since = "1.0.0")]
    #[doc_boundary("API entry point - GET /orders")]
    pub fn list_orders(&self, status: Option<OrderStatus>) -> Vec<&Order> {
        self.orders
            .values()
            .filter(|o| status.map_or(true, |s| o.status == s))
            .collect()
    }

    /// Retrieve orders filtered by status.
    ///
    /// # Deprecated
    ///
    /// Use [`list_orders`](Self::list_orders) with the `status` parameter instead.
    /// Will be removed in v3.0.
    #[doc_method(since = "1.0.0")]
    #[doc_deprecated(since = "2.0.0", replacement = "list_orders")]
    #[deprecated(since = "2.0.0", note = "Use list_orders(Some(status)) instead")]
    pub fn get_orders_by_status(&self, status: OrderStatus) -> Vec<&Order> {
        self.list_orders(Some(status))
    }

    // -------------------------------------------------------------------
    // Pure / Deterministic
    // -------------------------------------------------------------------

    /// Validate an order before processing.
    ///
    /// This is a pure function: given the same inputs it always returns the
    /// same list of violations with no side effects.
    ///
    /// # Arguments
    ///
    /// * `customer` - The customer to validate.
    /// * `items` - The order items to validate.
    ///
    /// # Returns
    ///
    /// A vector of validation violation messages (empty if valid).
    #[doc_deterministic]
    pub fn validate_order(customer: &Customer, items: &[OrderItem]) -> Vec<String> {
        let mut violations = Vec::new();

        if customer.id.is_empty() {
            violations.push("Customer ID is required".to_string());
        }
        if customer.email.is_empty() {
            violations.push("Customer email is required".to_string());
        }
        if items.is_empty() {
            violations.push("Order must contain at least one item".to_string());
        }

        for item in items {
            if item.quantity == 0 {
                violations.push(format!("Invalid quantity for {}", item.sku));
            }
            if item.unit_price < 0.0 {
                violations.push(format!("Invalid price for {}", item.sku));
            }
        }

        violations
    }

    /// Calculate the total price for a list of order items.
    ///
    /// # Arguments
    ///
    /// * `items` - The line items.
    ///
    /// # Returns
    ///
    /// The sum of (quantity * unit_price) for all items.
    #[doc_deterministic]
    pub fn calculate_total(items: &[OrderItem]) -> f64 {
        items
            .iter()
            .map(|item| item.quantity as f64 * item.unit_price)
            .sum()
    }

    // -------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------

    #[doc_hidden]
    fn generate_order_id(&mut self) -> String {
        let id = format!("ord_{:012}", self.next_id);
        self.next_id += 1;
        id
    }

    #[doc_hidden]
    fn emit_event(&self, event_name: &str) {
        eprintln!("[EVENT] {event_name}");
    }

    #[doc_hidden]
    fn now() -> u64 {
        0 // placeholder — would use std::time in real code
    }
}

impl Default for OrderService {
    fn default() -> Self {
        Self::new()
    }
}
