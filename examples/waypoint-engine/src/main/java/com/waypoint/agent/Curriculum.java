package com.waypoint.agent;

import io.docspec.annotation.DocInvariant;

import java.util.List;

/**
 * The generated curriculum, containing milestones and tasks.
 *
 * @param title       the curriculum title
 * @param milestones  the ordered list of milestone names
 * @param totalTasks  the total number of learning tasks across all milestones
 */
@DocInvariant(on = "Curriculum", rules = {"milestones.size > 0", "totalTasks >= milestones.size"})
public record Curriculum(String title, List<String> milestones, int totalTasks) {
}
