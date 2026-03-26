package com.waypoint.event;

import io.docspec.annotation.DocEvent;

/**
 * Event payload fired when a curriculum has been successfully generated
 * and persisted.
 */
@DocEvent(
    name = "curriculum.generated",
    description = "Fired when a curriculum is successfully generated",
    trigger = "CurriculumAgent.generate() completes successfully",
    channel = "webhook",
    deliveryGuarantee = "at-least-once",
    retryPolicy = "exponential-backoff",
    since = "2.0.0"
)
public class CurriculumGeneratedEvent {

    /** The unique identifier of the generated curriculum. */
    public String curriculumId;

    /** The identifier of the goal that triggered generation. */
    public String goalId;

    /** The number of milestones in the generated curriculum. */
    public int milestoneCount;
}
