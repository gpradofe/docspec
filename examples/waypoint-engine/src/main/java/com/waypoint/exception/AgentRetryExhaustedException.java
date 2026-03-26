package com.waypoint.exception;

import io.docspec.annotation.DocError;

/**
 * Thrown when all surgical retry attempts have been exhausted without
 * producing valid output from the AI generation steps.
 */
@DocError(
    code = "AGENT_RETRY_EXHAUSTED",
    httpStatus = 500,
    description = "All surgical retry attempts failed to produce valid output",
    causes = {"LLM provider timeout", "Schema too complex for model"},
    resolution = "Simplify the goal specification or increase MAX_RETRIES",
    since = "1.2.0"
)
public class AgentRetryExhaustedException extends RuntimeException {

    public AgentRetryExhaustedException(String message) {
        super(message);
    }
}
