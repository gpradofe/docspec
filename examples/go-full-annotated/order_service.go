// Package fullannotated provides a Tier 2 DocSpec example in Go.
//
// Go does not support annotations or decorators, so DocSpec uses structured
// comments to convey documentation metadata. The processor scans for
// //docspec:<directive> comments attached to types and functions.
//
// This example demonstrates every annotation category: module, flow, method,
// error, event, PII, boundary, deterministic, context, uses, performance,
// sensitive, since, and deprecated.
package fullannotated

import (
	"errors"
	"fmt"
	"sync"
	"time"
)

//docspec:module id=order-service name="Order Service" description="Handles order creation, payment processing, fulfillment, and cancellation"

//docspec:flow id=order-processing name="Order Processing Flow" description="End-to-end order lifecycle from placement to delivery" trigger="POST /orders"
//docspec:flow:step id=validate name="Validate Order" type=process
//docspec:flow:step id=persist name="Save Order" type=storage
//docspec:flow:step id=charge name="Charge Payment" type=external
//docspec:flow:step id=fulfill name="Fulfill Order" type=process
//docspec:flow:step id=notify name="Notify Customer" type=external

//docspec:flow id=order-cancellation name="Order Cancellation Flow" description="Cancels an order and reverses charges if applicable" trigger="DELETE /orders/:id"
//docspec:flow:step id=lookup name="Find Order" type=storage
//docspec:flow:step id=refund name="Issue Refund" type=external
//docspec:flow:step id=release-stock name="Release Stock" type=process
//docspec:flow:step id=cancel-notify name="Notify Cancellation" type=external

//docspec:context id=ecommerce name="E-Commerce Bounded Context" description="All order-related operations within the e-commerce domain"

// ---------------------------------------------------------------------------
// Data Models
// ---------------------------------------------------------------------------

// Customer represents a customer placing an order.
type Customer struct {
	ID string

	//docspec:pii classification=personal retention="3 years"
	// Name is the full legal name of the customer.
	Name string

	//docspec:pii classification=contact retention="3 years"
	// Email is the customer's email address.
	Email string

	//docspec:pii classification=personal retention="3 years"
	// Address is the billing address.
	Address string
}

// OrderItem is a single line item within an order.
type OrderItem struct {
	SKU       string
	Name      string
	Quantity  int
	UnitPrice float64
}

// OrderStatus represents the lifecycle states of an order.
type OrderStatus string

const (
	StatusPending   OrderStatus = "pending"
	StatusValidated OrderStatus = "validated"
	StatusCharged   OrderStatus = "charged"
	StatusShipped   OrderStatus = "shipped"
	StatusDelivered OrderStatus = "delivered"
	StatusCancelled OrderStatus = "cancelled"
)

// Order is a placed order with its current processing state.
type Order struct {
	ID        string
	Customer  Customer
	Items     []OrderItem
	Total     float64
	Status    OrderStatus
	CreatedAt time.Time
	UpdatedAt time.Time
}

// PaymentResult holds the outcome of a payment charge operation.
type PaymentResult struct {
	TransactionID string
	Status        string // "success", "declined", "error"
	ChargedAmount float64
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

//docspec:error code=ORDER_001 http_status=400 description="Order failed validation - missing or invalid fields"

// ErrInvalidOrder indicates that an order failed validation.
var ErrInvalidOrder = errors.New("invalid order")

//docspec:error code=ORDER_002 http_status=402 description="Payment was declined or failed to process"

// ErrPaymentFailed indicates that a payment charge was declined.
var ErrPaymentFailed = errors.New("payment failed")

//docspec:error code=ORDER_003 http_status=404 description="Order not found for the given ID"

// ErrOrderNotFound indicates that the requested order does not exist.
var ErrOrderNotFound = errors.New("order not found")

//docspec:error code=ORDER_004 http_status=409 description="Insufficient inventory to fulfill the order"

// ErrInsufficientStock indicates that inventory is unavailable.
var ErrInsufficientStock = errors.New("insufficient stock")

// InvalidOrderError wraps ErrInvalidOrder with specific violations.
type InvalidOrderError struct {
	Violations []string
}

func (e *InvalidOrderError) Error() string {
	return fmt.Sprintf("invalid order: %v", e.Violations)
}

func (e *InvalidOrderError) Unwrap() error {
	return ErrInvalidOrder
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

//docspec:event name=order.created channel=orders description="Fired after order validation and initial persistence"

// OrderCreatedEvent is emitted when a new order is successfully created.
type OrderCreatedEvent struct {
	OrderID    string
	CustomerID string
	Total      float64
	Timestamp  time.Time
}

//docspec:event name=order.charged channel=orders description="Fired after successful payment processing"

// OrderChargedEvent is emitted when payment is successfully charged.
type OrderChargedEvent struct {
	OrderID       string
	TransactionID string
	Amount        float64
	Timestamp     time.Time
}

//docspec:event name=order.shipped channel=orders description="Fired when the order leaves the warehouse"

// OrderShippedEvent is emitted when an order is shipped.
type OrderShippedEvent struct {
	OrderID        string
	TrackingNumber string
	Timestamp      time.Time
}

//docspec:event name=order.cancelled channel=orders description="Fired when an order is cancelled before shipment"

// OrderCancelledEvent is emitted when an order is cancelled.
type OrderCancelledEvent struct {
	OrderID   string
	Reason    string
	Timestamp time.Time
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

// OrderService handles the full lifecycle of customer orders.
type OrderService struct {
	mu     sync.RWMutex
	orders map[string]*Order
	nextID int
}

// NewOrderService creates a new, empty OrderService.
func NewOrderService() *OrderService {
	return &OrderService{
		orders: make(map[string]*Order),
		nextID: 1,
	}
}

// CreateOrder creates a new order for the given customer and items.
//
// Validates the order, persists it, processes payment, and emits an
// order.created event. This is the primary entry point for the
// order processing flow.
//
//docspec:method since=1.0.0
//docspec:boundary "API entry point - POST /orders"
//docspec:uses service=PaymentGateway operation=charge protocol=HTTPS
//docspec:uses service=InventoryService operation=reserve protocol=gRPC
//docspec:performance sla="500ms p99" throughput="200 req/s"
func (s *OrderService) CreateOrder(customer Customer, items []OrderItem) (*Order, error) {
	violations := ValidateOrder(customer, items)
	if len(violations) > 0 {
		return nil, &InvalidOrderError{Violations: violations}
	}

	total := CalculateTotal(items)

	s.mu.Lock()
	defer s.mu.Unlock()

	id := s.generateOrderID()
	now := time.Now()

	order := &Order{
		ID:        id,
		Customer:  customer,
		Items:     items,
		Total:     total,
		Status:    StatusValidated,
		CreatedAt: now,
		UpdatedAt: now,
	}

	s.orders[id] = order
	s.emitEvent(OrderCreatedEvent{OrderID: id, CustomerID: customer.ID, Total: total, Timestamp: now})
	return order, nil
}

// GetOrder retrieves an order by its ID.
//
//docspec:method since=1.0.0
//docspec:boundary "API entry point - GET /orders/:id"
func (s *OrderService) GetOrder(orderID string) (*Order, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	order, ok := s.orders[orderID]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrOrderNotFound, orderID)
	}
	return order, nil
}

// ChargeOrder processes payment for an existing order.
//
// Charges the customer via the payment gateway and updates the order
// status to "charged". Emits an order.charged event on success.
//
//docspec:method since=1.0.0
//docspec:uses service=PaymentGateway operation=charge protocol=HTTPS
//docspec:performance sla="2000ms p99" throughput="50 req/s"
func (s *OrderService) ChargeOrder(orderID string) (*PaymentResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	order, ok := s.orders[orderID]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrOrderNotFound, orderID)
	}

	result := &PaymentResult{
		TransactionID: fmt.Sprintf("txn_%d", time.Now().UnixMilli()),
		Status:        "success",
		ChargedAmount: order.Total,
	}

	order.Status = StatusCharged
	order.UpdatedAt = time.Now()
	s.emitEvent(OrderChargedEvent{OrderID: orderID, TransactionID: result.TransactionID, Amount: result.ChargedAmount, Timestamp: time.Now()})
	return result, nil
}

// ShipOrder ships a charged order to the customer.
//
// Updates the order status to "shipped" and emits an order.shipped event.
//
//docspec:method since=1.1.0
//docspec:uses service=ShippingProvider operation=createShipment protocol=HTTPS
//docspec:uses service=NotificationService operation=sendEmail protocol=AMQP
func (s *OrderService) ShipOrder(orderID string, trackingNumber string) (*Order, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	order, ok := s.orders[orderID]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrOrderNotFound, orderID)
	}

	order.Status = StatusShipped
	order.UpdatedAt = time.Now()
	s.emitEvent(OrderShippedEvent{OrderID: orderID, TrackingNumber: trackingNumber, Timestamp: time.Now()})
	return order, nil
}

// CancelOrder cancels an order that has not yet been shipped.
//
// Issues a refund if the order was already charged and emits an
// order.cancelled event.
//
//docspec:method since=1.0.0
//docspec:boundary "API entry point - DELETE /orders/:id"
//docspec:uses service=PaymentGateway operation=refund protocol=HTTPS
func (s *OrderService) CancelOrder(orderID string, reason string) (*Order, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	order, ok := s.orders[orderID]
	if !ok {
		return nil, fmt.Errorf("%w: %s", ErrOrderNotFound, orderID)
	}

	order.Status = StatusCancelled
	order.UpdatedAt = time.Now()
	s.emitEvent(OrderCancelledEvent{OrderID: orderID, Reason: reason, Timestamp: time.Now()})
	return order, nil
}

// ListOrders lists all orders, optionally filtered by status.
// Pass an empty string for status to list all orders.
//
//docspec:method since=1.0.0
//docspec:boundary "API entry point - GET /orders"
func (s *OrderService) ListOrders(status OrderStatus) []*Order {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*Order
	for _, order := range s.orders {
		if status == "" || order.Status == status {
			result = append(result, order)
		}
	}
	return result
}

// GetOrdersByStatus retrieves orders filtered by status.
//
// Deprecated: Use ListOrders(status) instead. Will be removed in v3.0.
//
//docspec:method since=1.0.0
//docspec:deprecated since=2.0.0 replacement=ListOrders
func (s *OrderService) GetOrdersByStatus(status OrderStatus) []*Order {
	return s.ListOrders(status)
}

// ---------------------------------------------------------------------------
// Pure / Deterministic
// ---------------------------------------------------------------------------

// ValidateOrder validates an order before processing.
//
// This is a pure function: given the same inputs it always returns the
// same list of violations with no side effects.
//
//docspec:deterministic
func ValidateOrder(customer Customer, items []OrderItem) []string {
	var violations []string

	if customer.ID == "" {
		violations = append(violations, "Customer ID is required")
	}
	if customer.Email == "" {
		violations = append(violations, "Customer email is required")
	}
	if len(items) == 0 {
		violations = append(violations, "Order must contain at least one item")
	}

	for _, item := range items {
		if item.Quantity <= 0 {
			violations = append(violations, fmt.Sprintf("Invalid quantity for %s", item.SKU))
		}
		if item.UnitPrice < 0 {
			violations = append(violations, fmt.Sprintf("Invalid price for %s", item.SKU))
		}
	}

	return violations
}

// CalculateTotal computes the total price for a list of order items.
//
//docspec:deterministic
func CalculateTotal(items []OrderItem) float64 {
	total := 0.0
	for _, item := range items {
		total += float64(item.Quantity) * item.UnitPrice
	}
	return total
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

//docspec:hidden

func (s *OrderService) generateOrderID() string {
	id := fmt.Sprintf("ord_%012d", s.nextID)
	s.nextID++
	return id
}

//docspec:hidden

func (s *OrderService) emitEvent(event interface{}) {
	fmt.Printf("[EVENT] %+v\n", event)
}
