using DocSpec.Annotations;

namespace DocSpec.Examples.CSharpFullAnnotated;

/// <summary>
/// Tier 2 DocSpec example: full annotations in C#.
/// Demonstrates every annotation category: module, flow, method, error, event,
/// PII, boundary, deterministic, context, uses, performance, sensitive, since,
/// and deprecated.
/// </summary>

// ---------------------------------------------------------------------------
// Data Models
// ---------------------------------------------------------------------------

/// <summary>Represents a customer placing an order.</summary>
public class Customer
{
    public required string Id { get; set; }

    /// <summary>Full legal name of the customer.</summary>
    [DocPII(Classification = "personal", Retention = "3 years")]
    public required string Name { get; set; }

    /// <summary>Customer email address.</summary>
    [DocPII(Classification = "contact", Retention = "3 years")]
    public required string Email { get; set; }

    /// <summary>Billing address.</summary>
    [DocPII(Classification = "personal", Retention = "3 years")]
    public string? Address { get; set; }
}

/// <summary>A single line item within an order.</summary>
public class OrderItem
{
    public required string Sku { get; set; }
    public required string Name { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

/// <summary>The lifecycle states of an order.</summary>
public enum OrderStatus
{
    Pending,
    Validated,
    Charged,
    Shipped,
    Delivered,
    Cancelled
}

/// <summary>A placed order with its current processing state.</summary>
public class Order
{
    public required string Id { get; set; }
    public required Customer Customer { get; set; }
    public required List<OrderItem> Items { get; set; }
    public decimal Total { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Result of a payment charge operation.</summary>
public class PaymentResult
{
    public required string TransactionId { get; set; }
    public required string Status { get; set; }
    public decimal ChargedAmount { get; set; }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/// <summary>Thrown when an order fails validation rules.</summary>
[DocError(Code = "ORDER_001", HttpStatus = 400, Description = "Order failed validation - missing or invalid fields")]
public class InvalidOrderException : Exception
{
    public IReadOnlyList<string> Violations { get; }

    public InvalidOrderException(IReadOnlyList<string> violations)
        : base($"Invalid order: {string.Join(", ", violations)}")
    {
        Violations = violations;
    }
}

/// <summary>Thrown when a payment charge is declined or fails.</summary>
[DocError(Code = "ORDER_002", HttpStatus = 402, Description = "Payment was declined or failed to process")]
public class PaymentFailedException : Exception
{
    public string Reason { get; }

    public PaymentFailedException(string reason)
        : base($"Payment failed: {reason}")
    {
        Reason = reason;
    }
}

/// <summary>Thrown when an order is not found.</summary>
[DocError(Code = "ORDER_003", HttpStatus = 404, Description = "Order not found for the given ID")]
public class OrderNotFoundException : Exception
{
    public string OrderId { get; }

    public OrderNotFoundException(string orderId)
        : base($"Order not found: {orderId}")
    {
        OrderId = orderId;
    }
}

/// <summary>Thrown when insufficient stock is available for one or more items.</summary>
[DocError(Code = "ORDER_004", HttpStatus = 409, Description = "Insufficient inventory to fulfill the order")]
public class InsufficientStockException : Exception
{
    public string Sku { get; }
    public int Available { get; }

    public InsufficientStockException(string sku, int available)
        : base($"Insufficient stock for {sku}: only {available} available")
    {
        Sku = sku;
        Available = available;
    }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/// <summary>Emitted when a new order is successfully created and persisted.</summary>
[DocEvent(Name = "order.created", Channel = "orders", Description = "Fired after order validation and initial persistence")]
public record OrderCreatedEvent(string OrderId, string CustomerId, decimal Total, DateTime Timestamp);

/// <summary>Emitted when payment for an order is successfully charged.</summary>
[DocEvent(Name = "order.charged", Channel = "orders", Description = "Fired after successful payment processing")]
public record OrderChargedEvent(string OrderId, string TransactionId, decimal Amount, DateTime Timestamp);

/// <summary>Emitted when an order is shipped to the customer.</summary>
[DocEvent(Name = "order.shipped", Channel = "orders", Description = "Fired when the order leaves the warehouse")]
public record OrderShippedEvent(string OrderId, string TrackingNumber, DateTime Timestamp);

/// <summary>Emitted when an order is cancelled.</summary>
[DocEvent(Name = "order.cancelled", Channel = "orders", Description = "Fired when an order is cancelled before shipment")]
public record OrderCancelledEvent(string OrderId, string Reason, DateTime Timestamp);

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/// <summary>
/// Order Service — handles the full lifecycle of customer orders.
///
/// This is a Tier 2 DocSpec example demonstrating every annotation category:
/// module, flow, method, error, event, PII, boundary, deterministic,
/// context, uses, performance, sensitive, since, and deprecated.
/// </summary>
[DocModule("order-service", Name = "Order Service", Description = "Handles order creation, payment processing, fulfillment, and cancellation")]
[DocFlow(
    Id = "order-processing",
    Name = "Order Processing Flow",
    Description = "End-to-end order lifecycle from placement to delivery",
    Trigger = "POST /orders",
    Steps = new[] {
        "validate:Validate Order:process",
        "persist:Save Order:storage",
        "charge:Charge Payment:external",
        "fulfill:Fulfill Order:process",
        "notify:Notify Customer:external"
    }
)]
[DocFlow(
    Id = "order-cancellation",
    Name = "Order Cancellation Flow",
    Description = "Cancels an order and reverses charges if applicable",
    Trigger = "DELETE /orders/:id",
    Steps = new[] {
        "lookup:Find Order:storage",
        "refund:Issue Refund:external",
        "release-stock:Release Stock:process",
        "cancel-notify:Notify Cancellation:external"
    }
)]
[DocContext(Id = "ecommerce", Name = "E-Commerce Bounded Context", Description = "All order-related operations within the e-commerce domain")]
public class OrderService
{
    private readonly Dictionary<string, Order> _orders = new();
    private int _nextId = 1;

    // -------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------

    /// <summary>
    /// Create a new order for the given customer and items.
    ///
    /// Validates the order, persists it, processes payment, and emits an
    /// <c>order.created</c> event. This is the primary entry point for the
    /// order processing flow.
    /// </summary>
    /// <param name="customer">The customer placing the order.</param>
    /// <param name="items">The line items to include in the order.</param>
    /// <returns>The newly created order.</returns>
    /// <exception cref="InvalidOrderException">Thrown when validation fails.</exception>
    /// <exception cref="InsufficientStockException">Thrown when items are out of stock.</exception>
    /// <exception cref="PaymentFailedException">Thrown when payment processing fails.</exception>
    [DocMethod(Since = "1.0.0")]
    [DocBoundary("API entry point - POST /orders")]
    [DocUses(Service = "PaymentGateway", Operation = "charge", Protocol = "HTTPS")]
    [DocUses(Service = "InventoryService", Operation = "reserve", Protocol = "gRPC")]
    [DocPerformance(Sla = "500ms p99", Throughput = "200 req/s")]
    public Order CreateOrder(Customer customer, List<OrderItem> items)
    {
        var violations = ValidateOrder(customer, items);
        if (violations.Count > 0)
            throw new InvalidOrderException(violations);

        var total = CalculateTotal(items);
        var order = new Order
        {
            Id = GenerateOrderId(),
            Customer = customer,
            Items = items,
            Total = total,
            Status = OrderStatus.Validated,
        };

        _orders[order.Id] = order;
        EmitEvent(new OrderCreatedEvent(order.Id, customer.Id, total, DateTime.UtcNow));
        return order;
    }

    /// <summary>
    /// Retrieve an order by its ID.
    /// </summary>
    /// <param name="orderId">The unique order identifier.</param>
    /// <returns>The order if found.</returns>
    /// <exception cref="OrderNotFoundException">Thrown when no order exists with the given ID.</exception>
    [DocMethod(Since = "1.0.0")]
    [DocBoundary("API entry point - GET /orders/:id")]
    public Order GetOrder(string orderId)
    {
        if (!_orders.TryGetValue(orderId, out var order))
            throw new OrderNotFoundException(orderId);
        return order;
    }

    /// <summary>
    /// Process payment for an existing order.
    ///
    /// Charges the customer via the payment gateway and updates the order
    /// status to Charged. Emits an <c>order.charged</c> event on success.
    /// </summary>
    /// <param name="orderId">The order to charge.</param>
    /// <returns>The payment result.</returns>
    /// <exception cref="OrderNotFoundException">Thrown when the order does not exist.</exception>
    /// <exception cref="PaymentFailedException">Thrown when the charge is declined.</exception>
    [DocMethod(Since = "1.0.0")]
    [DocUses(Service = "PaymentGateway", Operation = "charge", Protocol = "HTTPS")]
    [DocPerformance(Sla = "2000ms p99", Throughput = "50 req/s")]
    public PaymentResult ChargeOrder(string orderId)
    {
        var order = GetOrder(orderId);

        var result = new PaymentResult
        {
            TransactionId = $"txn_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            Status = "success",
            ChargedAmount = order.Total,
        };

        order.Status = OrderStatus.Charged;
        order.UpdatedAt = DateTime.UtcNow;
        EmitEvent(new OrderChargedEvent(orderId, result.TransactionId, result.ChargedAmount, DateTime.UtcNow));
        return result;
    }

    /// <summary>
    /// Ship a charged order to the customer.
    ///
    /// Updates the order status to Shipped and emits an <c>order.shipped</c> event.
    /// </summary>
    /// <param name="orderId">The order to ship.</param>
    /// <param name="trackingNumber">The carrier tracking number.</param>
    /// <returns>The updated order.</returns>
    [DocMethod(Since = "1.1.0")]
    [DocUses(Service = "ShippingProvider", Operation = "CreateShipment", Protocol = "HTTPS")]
    [DocUses(Service = "NotificationService", Operation = "SendEmail", Protocol = "AMQP")]
    public Order ShipOrder(string orderId, string trackingNumber)
    {
        var order = GetOrder(orderId);
        order.Status = OrderStatus.Shipped;
        order.UpdatedAt = DateTime.UtcNow;
        EmitEvent(new OrderShippedEvent(orderId, trackingNumber, DateTime.UtcNow));
        return order;
    }

    /// <summary>
    /// Cancel an order that has not yet been shipped.
    ///
    /// Issues a refund if the order was already charged and emits an
    /// <c>order.cancelled</c> event.
    /// </summary>
    /// <param name="orderId">The order to cancel.</param>
    /// <param name="reason">A human-readable cancellation reason.</param>
    /// <returns>The cancelled order.</returns>
    /// <exception cref="OrderNotFoundException">Thrown when the order does not exist.</exception>
    [DocMethod(Since = "1.0.0")]
    [DocBoundary("API entry point - DELETE /orders/:id")]
    [DocUses(Service = "PaymentGateway", Operation = "refund", Protocol = "HTTPS")]
    public Order CancelOrder(string orderId, string reason)
    {
        var order = GetOrder(orderId);
        order.Status = OrderStatus.Cancelled;
        order.UpdatedAt = DateTime.UtcNow;
        EmitEvent(new OrderCancelledEvent(orderId, reason, DateTime.UtcNow));
        return order;
    }

    /// <summary>
    /// List all orders, optionally filtered by status.
    /// </summary>
    /// <param name="status">If provided, only return orders with this status.</param>
    /// <returns>A list of matching orders.</returns>
    [DocMethod(Since = "1.0.0")]
    [DocBoundary("API entry point - GET /orders")]
    public List<Order> ListOrders(OrderStatus? status = null)
    {
        var orders = _orders.Values.AsEnumerable();
        if (status.HasValue)
            orders = orders.Where(o => o.Status == status.Value);
        return orders.ToList();
    }

    /// <summary>
    /// Retrieve orders filtered by status.
    /// </summary>
    /// <param name="status">The status to filter by.</param>
    /// <returns>A list of orders matching the given status.</returns>
    [Obsolete("Use ListOrders(status) instead. Will be removed in v3.0.")]
    [DocMethod(Since = "1.0.0")]
    [DocDeprecated(Since = "2.0.0", Replacement = "ListOrders")]
    public List<Order> GetOrdersByStatus(OrderStatus status) => ListOrders(status);

    // -------------------------------------------------------------------
    // Pure / Deterministic
    // -------------------------------------------------------------------

    /// <summary>
    /// Validate an order before processing.
    ///
    /// This is a pure function: given the same inputs it always returns the
    /// same list of violations with no side effects.
    /// </summary>
    /// <param name="customer">The customer to validate.</param>
    /// <param name="items">The order items to validate.</param>
    /// <returns>A list of validation violation messages (empty if valid).</returns>
    [DocDeterministic]
    public static List<string> ValidateOrder(Customer customer, List<OrderItem> items)
    {
        var violations = new List<string>();

        if (string.IsNullOrEmpty(customer.Id))
            violations.Add("Customer ID is required");
        if (string.IsNullOrEmpty(customer.Email))
            violations.Add("Customer email is required");
        if (items is null || items.Count == 0)
            violations.Add("Order must contain at least one item");

        foreach (var item in items ?? Enumerable.Empty<OrderItem>())
        {
            if (item.Quantity <= 0)
                violations.Add($"Invalid quantity for {item.Sku}");
            if (item.UnitPrice < 0)
                violations.Add($"Invalid price for {item.Sku}");
        }

        return violations;
    }

    /// <summary>
    /// Calculate the total price for a list of order items.
    /// </summary>
    /// <param name="items">The line items.</param>
    /// <returns>The sum of (Quantity * UnitPrice) for all items.</returns>
    [DocDeterministic]
    public static decimal CalculateTotal(List<OrderItem> items) =>
        items.Sum(item => item.Quantity * item.UnitPrice);

    // -------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------

    [DocHidden]
    private string GenerateOrderId() => $"ord_{_nextId++:D12}";

    [DocHidden]
    private void EmitEvent(object evt) =>
        Console.WriteLine($"[EVENT] {evt}");
}
