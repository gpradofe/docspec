import {
  DocModule,
  DocFlow,
  DocMethod,
  DocError,
  DocEvent,
  DocPII,
  DocBoundary,
  DocDeterministic,
  DocContext,
  DocUses,
  DocPerformance,
  DocSensitive,
  DocHidden,
  DocSince,
  DocDeprecated,
} from "@docspec/ts";

// ---------------------------------------------------------------------------
// Data Models
// ---------------------------------------------------------------------------

/** Represents a customer placing an order. */
export interface Customer {
  id: string;

  /** Full legal name of the customer. */
  @DocPII({ classification: "personal", retention: "3 years" })
  name: string;

  /** Customer email address — used for order confirmations. */
  @DocPII({ classification: "contact", retention: "3 years" })
  email: string;

  /** Billing address. */
  @DocPII({ classification: "personal", retention: "3 years" })
  address: string;
}

/** A single line item within an order. */
export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

/** A placed order with its current processing state. */
export interface Order {
  id: string;
  customer: Customer;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = "pending" | "validated" | "charged" | "shipped" | "delivered" | "cancelled";

/** Payment details for charging an order. */
export interface PaymentResult {
  transactionId: string;
  status: "success" | "declined" | "error";
  chargedAmount: number;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Thrown when an order fails validation rules. */
@DocError({ code: "ORDER_001", httpStatus: 400, description: "Order failed validation — missing or invalid fields" })
export class InvalidOrderError extends Error {
  constructor(public readonly violations: string[]) {
    super(`Invalid order: ${violations.join(", ")}`);
    this.name = "InvalidOrderError";
  }
}

/** Thrown when a payment charge is declined or fails. */
@DocError({ code: "ORDER_002", httpStatus: 402, description: "Payment was declined or failed to process" })
export class PaymentFailedError extends Error {
  constructor(public readonly reason: string) {
    super(`Payment failed: ${reason}`);
    this.name = "PaymentFailedError";
  }
}

/** Thrown when an order is not found. */
@DocError({ code: "ORDER_003", httpStatus: 404, description: "Order not found for the given ID" })
export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`Order not found: ${orderId}`);
    this.name = "OrderNotFoundError";
  }
}

/** Thrown when insufficient stock is available for one or more items. */
@DocError({ code: "ORDER_004", httpStatus: 409, description: "Insufficient inventory to fulfill the order" })
export class InsufficientStockError extends Error {
  constructor(public readonly sku: string, public readonly available: number) {
    super(`Insufficient stock for ${sku}: only ${available} available`);
    this.name = "InsufficientStockError";
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Emitted when a new order is successfully created and persisted. */
@DocEvent({ name: "order.created", channel: "orders", description: "Fired after order validation and initial persistence" })
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly total: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}

/** Emitted when payment for an order is successfully charged. */
@DocEvent({ name: "order.charged", channel: "orders", description: "Fired after successful payment processing" })
export class OrderChargedEvent {
  constructor(
    public readonly orderId: string,
    public readonly transactionId: string,
    public readonly amount: number,
    public readonly timestamp: Date = new Date(),
  ) {}
}

/** Emitted when an order is shipped to the customer. */
@DocEvent({ name: "order.shipped", channel: "orders", description: "Fired when the order leaves the warehouse" })
export class OrderShippedEvent {
  constructor(
    public readonly orderId: string,
    public readonly trackingNumber: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

/** Emitted when an order is cancelled. */
@DocEvent({ name: "order.cancelled", channel: "orders", description: "Fired when an order is cancelled before shipment" })
export class OrderCancelledEvent {
  constructor(
    public readonly orderId: string,
    public readonly reason: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Order Service — handles the full lifecycle of customer orders.
 *
 * This is a Tier 2 DocSpec example demonstrating every annotation category:
 * module, flow, method, error, event, PII, boundary, deterministic,
 * context, uses, performance, sensitive, since, and deprecated.
 */
@DocModule({
  id: "order-service",
  name: "Order Service",
  description: "Handles order creation, payment processing, fulfillment, and cancellation",
})
@DocFlow({
  id: "order-processing",
  name: "Order Processing Flow",
  description: "End-to-end order lifecycle from placement to delivery",
  trigger: "POST /orders",
  steps: [
    { id: "validate", name: "Validate Order", type: "process", description: "Check item availability and validate customer data" },
    { id: "persist", name: "Save Order", type: "storage", description: "Persist the order to the database" },
    { id: "charge", name: "Charge Payment", type: "external", description: "Process payment via the payment gateway" },
    { id: "fulfill", name: "Fulfill Order", type: "process", description: "Reserve inventory and initiate shipment" },
    { id: "notify", name: "Notify Customer", type: "external", description: "Send order confirmation email" },
  ],
})
@DocFlow({
  id: "order-cancellation",
  name: "Order Cancellation Flow",
  description: "Cancels an order and reverses charges if applicable",
  trigger: "DELETE /orders/:id",
  steps: [
    { id: "lookup", name: "Find Order", type: "storage", description: "Load the order from the database" },
    { id: "refund", name: "Issue Refund", type: "external", description: "Reverse the payment charge" },
    { id: "release-stock", name: "Release Stock", type: "process", description: "Return reserved inventory" },
    { id: "cancel-notify", name: "Notify Cancellation", type: "external", description: "Send cancellation email" },
  ],
})
@DocContext({
  id: "ecommerce",
  name: "E-Commerce Bounded Context",
  description: "All order-related operations within the e-commerce domain",
})
export class OrderService {
  private orders: Map<string, Order> = new Map();

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Create a new order for the given customer and items.
   *
   * Validates the order, persists it, processes payment, and emits an
   * `order.created` event. This is the primary entry point for the
   * order processing flow.
   *
   * @param customer - The customer placing the order.
   * @param items - The line items to include in the order.
   * @returns The newly created order.
   * @throws InvalidOrderError if validation fails.
   * @throws InsufficientStockError if items are out of stock.
   * @throws PaymentFailedError if payment processing fails.
   */
  @DocMethod({ since: "1.0.0" })
  @DocBoundary("API entry point — POST /orders")
  @DocUses({ service: "PaymentGateway", operation: "charge", protocol: "HTTPS" })
  @DocUses({ service: "InventoryService", operation: "reserve", protocol: "gRPC" })
  @DocPerformance({ sla: "500ms p99", throughput: "200 req/s" })
  createOrder(customer: Customer, items: OrderItem[]): Order {
    const violations = this.validateOrder(customer, items);
    if (violations.length > 0) {
      throw new InvalidOrderError(violations);
    }

    const total = this.calculateTotal(items);
    const order: Order = {
      id: this.generateOrderId(),
      customer,
      items,
      total,
      status: "validated",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.set(order.id, order);
    this.emitEvent(new OrderCreatedEvent(order.id, customer.id, total));
    return order;
  }

  /**
   * Retrieve an order by its ID.
   *
   * @param orderId - The unique order identifier.
   * @returns The order if found.
   * @throws OrderNotFoundError if no order exists with the given ID.
   */
  @DocMethod({ since: "1.0.0" })
  @DocBoundary("API entry point — GET /orders/:id")
  getOrder(orderId: string): Order {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new OrderNotFoundError(orderId);
    }
    return order;
  }

  /**
   * Process payment for an existing order.
   *
   * Charges the customer via the payment gateway and updates the order
   * status to "charged". Emits an `order.charged` event on success.
   *
   * @param orderId - The order to charge.
   * @returns The payment result.
   * @throws OrderNotFoundError if the order does not exist.
   * @throws PaymentFailedError if the charge is declined.
   */
  @DocMethod({ since: "1.0.0" })
  @DocUses({ service: "PaymentGateway", operation: "charge", protocol: "HTTPS" })
  @DocPerformance({ sla: "2000ms p99", throughput: "50 req/s" })
  chargeOrder(orderId: string): PaymentResult {
    const order = this.getOrder(orderId);

    const result: PaymentResult = {
      transactionId: `txn_${Date.now()}`,
      status: "success",
      chargedAmount: order.total,
    };

    order.status = "charged";
    order.updatedAt = new Date();
    this.emitEvent(new OrderChargedEvent(orderId, result.transactionId, result.chargedAmount));
    return result;
  }

  /**
   * Ship a charged order to the customer.
   *
   * Updates the order status to "shipped" and emits an `order.shipped` event.
   *
   * @param orderId - The order to ship.
   * @param trackingNumber - The carrier tracking number.
   * @returns The updated order.
   */
  @DocMethod({ since: "1.1.0" })
  @DocUses({ service: "ShippingProvider", operation: "createShipment", protocol: "HTTPS" })
  @DocUses({ service: "NotificationService", operation: "sendEmail", protocol: "AMQP" })
  shipOrder(orderId: string, trackingNumber: string): Order {
    const order = this.getOrder(orderId);
    order.status = "shipped";
    order.updatedAt = new Date();
    this.emitEvent(new OrderShippedEvent(orderId, trackingNumber));
    return order;
  }

  /**
   * Cancel an order that has not yet been shipped.
   *
   * Issues a refund if the order was already charged and emits an
   * `order.cancelled` event.
   *
   * @param orderId - The order to cancel.
   * @param reason - A human-readable cancellation reason.
   * @returns The cancelled order.
   * @throws OrderNotFoundError if the order does not exist.
   */
  @DocMethod({ since: "1.0.0" })
  @DocBoundary("API entry point — DELETE /orders/:id")
  @DocUses({ service: "PaymentGateway", operation: "refund", protocol: "HTTPS" })
  cancelOrder(orderId: string, reason: string): Order {
    const order = this.getOrder(orderId);
    order.status = "cancelled";
    order.updatedAt = new Date();
    this.emitEvent(new OrderCancelledEvent(orderId, reason));
    return order;
  }

  /**
   * List all orders, optionally filtered by status.
   *
   * @param status - If provided, only return orders with this status.
   * @returns An array of matching orders.
   */
  @DocMethod({ since: "1.0.0" })
  @DocBoundary("API entry point — GET /orders")
  listOrders(status?: OrderStatus): Order[] {
    const all = Array.from(this.orders.values());
    if (status) {
      return all.filter((o) => o.status === status);
    }
    return all;
  }

  /**
   * @deprecated Use `listOrders(status)` instead. Will be removed in v3.0.
   */
  @DocMethod({ since: "1.0.0" })
  @DocDeprecated({ since: "2.0.0", replacement: "listOrders" })
  getOrdersByStatus(status: OrderStatus): Order[] {
    return this.listOrders(status);
  }

  // -----------------------------------------------------------------------
  // Pure / Deterministic
  // -----------------------------------------------------------------------

  /**
   * Validate an order before processing.
   *
   * This is a pure function: given the same inputs it always returns the
   * same list of violations with no side effects.
   *
   * @param customer - The customer to validate.
   * @param items - The order items to validate.
   * @returns An array of validation violation messages (empty if valid).
   */
  @DocDeterministic()
  validateOrder(customer: Customer, items: OrderItem[]): string[] {
    const violations: string[] = [];

    if (!customer.id) violations.push("Customer ID is required");
    if (!customer.email) violations.push("Customer email is required");
    if (!items || items.length === 0) violations.push("Order must contain at least one item");

    for (const item of items ?? []) {
      if (item.quantity <= 0) violations.push(`Invalid quantity for ${item.sku}`);
      if (item.unitPrice < 0) violations.push(`Invalid price for ${item.sku}`);
    }

    return violations;
  }

  /**
   * Calculate the total price for a list of order items.
   *
   * @param items - The line items.
   * @returns The sum of (quantity * unitPrice) for all items.
   */
  @DocDeterministic()
  calculateTotal(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  @DocHidden()
  private generateOrderId(): string {
    return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  @DocHidden()
  private emitEvent(event: OrderCreatedEvent | OrderChargedEvent | OrderShippedEvent | OrderCancelledEvent): void {
    console.log(`[EVENT] ${JSON.stringify(event)}`);
  }
}
