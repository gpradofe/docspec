package com.waypoint.agent;

import java.util.List;
import java.util.Map;

/**
 * A directed acyclic graph of skills and their prerequisite relationships.
 *
 * @param skills       the list of skill identifiers
 * @param edges        adjacency list mapping each skill to its prerequisites
 * @param rootSkills   skills with no prerequisites (entry points)
 */
public record SkillGraph(List<String> skills, Map<String, List<String>> edges, List<String> rootSkills) {
}
