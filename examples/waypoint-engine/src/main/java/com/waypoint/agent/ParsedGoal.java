package com.waypoint.agent;

/**
 * A validated and normalized goal, ready for downstream processing.
 *
 * @param title           the normalized title
 * @param skillLevel      the validated skill level
 * @param weeklyHours     the weekly time commitment in hours
 * @param estimatedWeeks  the estimated number of weeks to complete
 */
public record ParsedGoal(String title, String skillLevel, int weeklyHours, int estimatedWeeks) {
}
