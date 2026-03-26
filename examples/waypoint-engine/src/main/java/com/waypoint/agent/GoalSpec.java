package com.waypoint.agent;

/**
 * Specification of a learning goal submitted by the user.
 *
 * @param title       the title or subject of the learning goal
 * @param skillLevel  the current skill level of the learner (e.g. "beginner", "intermediate")
 * @param weeklyHours the number of hours per week the learner can commit
 */
public record GoalSpec(String title, String skillLevel, int weeklyHours) {
}
