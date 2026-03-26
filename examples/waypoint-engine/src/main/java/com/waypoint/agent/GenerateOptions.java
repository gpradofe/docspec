package com.waypoint.agent;

/**
 * Optional configuration for curriculum generation.
 *
 * @param maxMilestones  maximum number of milestones to generate
 * @param language       the preferred language for content generation
 * @param includeQuizzes whether to include quizzes in generated tasks
 */
public record GenerateOptions(int maxMilestones, String language, boolean includeQuizzes) {
}
