import { describe, it, expect } from "vitest";
import { ISDCalculator } from "../isd-calculator.js";
import type { IntentSignals } from "../intent-graph.js";

describe("ISDCalculator", () => {
  const calculator = new ISDCalculator();

  it("scores > 0.8 for a method with all signals populated", () => {
    const signals: IntentSignals = {
      nameSemantics: { verb: "create", object: "Order", intent: "creation" },
      guardClauses: [
        { condition: "input != null", error: "IllegalArgumentException" },
        { condition: "input.items.size() > 0", error: "ValidationException" },
        { condition: "input.total >= 0", error: "ValidationException" },
      ],
      branches: [
        { condition: "isPremium", output: "applyDiscount" },
        { condition: "hasLoyaltyPoints", output: "redeemPoints" },
        { condition: "isInternational", output: "addShipping" },
        { condition: "requiresApproval", output: "queueForReview" },
      ],
      dataFlow: {
        reads: ["orderRepository", "productCatalog"],
        writes: ["orderRepository", "auditLog"],
      },
      loopProperties: { hasStreams: true, hasEnhancedFor: true, streamOps: ["map", "filter"] },
      errorHandling: { catchBlocks: 3, caughtTypes: ["DataAccessException", "PaymentException", "TimeoutException"] },
      constants: [
        { name: "MAX_ITEMS", value: "100", implies: "order size limit" },
        { name: "TAX_RATE", value: "0.08", implies: "sales tax" },
        { name: "MIN_ORDER", value: "10.00", implies: "minimum order amount" },
        { name: "CURRENCY", value: "USD", implies: "default currency" },
      ],
      nullChecks: 4,
      assertions: 3,
      logStatements: 3,
      dependencies: [
        "orderRepository",
        "productCatalog",
        "paymentGateway",
        "notificationService",
      ],
      validationAnnotations: 3,
    };

    const score = calculator.calculate(signals);

    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it("scores > 0 but < 0.3 for a method with only nameSemantics", () => {
    const signals: IntentSignals = {
      nameSemantics: { verb: "get", object: "User", intent: "query" },
    };

    const score = calculator.calculate(signals);

    // nameSemantics (0.15) + returnType bonus for "query" (0.05) = 0.20
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.3);
  });

  it("scores 0 for a method with no signals", () => {
    const signals: IntentSignals = {};

    const score = calculator.calculate(signals);

    expect(score).toBe(0);
  });

  it("always returns a score between 0 and 1", () => {
    // Test with deliberately oversized values to ensure clamping
    const signals: IntentSignals = {
      nameSemantics: { verb: "validate", object: "Everything", intent: "validation" },
      guardClauses: 100,
      branches: 100,
      dataFlow: {
        reads: ["a", "b", "c", "d", "e"],
        writes: ["x", "y", "z"],
      },
      loopProperties: { hasStreams: true, hasEnhancedFor: true },
      errorHandling: { catchBlocks: 50 },
      constants: Array.from({ length: 20 }, (_, i) => `CONST_${i}`),
      nullChecks: 50,
      assertions: 50,
      logStatements: 50,
      dependencies: Array.from({ length: 20 }, (_, i) => `dep${i}`),
      validationAnnotations: 50,
    };

    const score = calculator.calculate(signals);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it("scores 0 when nameSemantics intent is 'unknown'", () => {
    const signals: IntentSignals = {
      nameSemantics: { verb: "x", object: "y", intent: "unknown" },
    };

    const score = calculator.calculate(signals);

    expect(score).toBe(0);
  });

  it("gives partial data flow score for reads-only", () => {
    const signalsReadsOnly: IntentSignals = {
      dataFlow: { reads: ["repository"], writes: [] },
    };
    const signalsBoth: IntentSignals = {
      dataFlow: { reads: ["repository"], writes: ["audit"] },
    };

    const scoreReadsOnly = calculator.calculate(signalsReadsOnly);
    const scoreBoth = calculator.calculate(signalsBoth);

    expect(scoreReadsOnly).toBeGreaterThan(0);
    expect(scoreBoth).toBeGreaterThan(scoreReadsOnly);
  });

  it("scales guard clause score by count up to max weight", () => {
    const oneGuard: IntentSignals = { guardClauses: 1 };
    const threeGuards: IntentSignals = { guardClauses: 3 };

    const scoreOne = calculator.calculate(oneGuard);
    const scoreThree = calculator.calculate(threeGuards);

    expect(scoreThree).toBeGreaterThan(scoreOne);
    expect(scoreOne).toBeGreaterThan(0);
    // Max weight for guard clauses is 0.10 (W_GUARD_CLAUSES)
    expect(scoreThree).toBeLessThanOrEqual(0.10);
  });

  it("adds loop score for streams and enhanced-for separately", () => {
    const streamsOnly: IntentSignals = {
      loopProperties: { hasStreams: true, hasEnhancedFor: false },
    };
    const enhancedForOnly: IntentSignals = {
      loopProperties: { hasStreams: false, hasEnhancedFor: true },
    };
    const both: IntentSignals = {
      loopProperties: { hasStreams: true, hasEnhancedFor: true },
    };

    const scoreStreams = calculator.calculate(streamsOnly);
    const scoreFor = calculator.calculate(enhancedForOnly);
    const scoreBoth = calculator.calculate(both);

    expect(scoreStreams).toBeGreaterThan(0);
    expect(scoreFor).toBeGreaterThan(0);
    expect(scoreBoth).toBeGreaterThan(scoreStreams);
    expect(scoreBoth).toBeGreaterThan(scoreFor);
  });
});
