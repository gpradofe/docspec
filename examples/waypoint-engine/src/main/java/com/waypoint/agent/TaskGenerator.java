package com.waypoint.agent;

import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Generates concrete learning tasks for each milestone.
 *
 * <p>Uses AI to produce actionable, measurable learning tasks that
 * guide the learner through the curriculum milestones.</p>
 */
@Service
public class TaskGenerator {

    /**
     * Generates tasks for the given milestones.
     *
     * @param milestones the planned milestone names
     * @param goal       the original parsed goal for context
     * @return a list of generated task descriptions
     */
    public List<String> generate(List<String> milestones, ParsedGoal goal) {
        return null;
    }
}
