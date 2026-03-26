package com.waypoint.agent;

import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Plans learning milestones from a skill graph.
 *
 * <p>Organizes skills into a linear sequence of achievable milestones,
 * respecting prerequisite ordering and balancing workload across weeks.</p>
 */
@Service
public class MilestonePlanner {

    /**
     * Plans milestones from the given skill graph.
     *
     * @param skillGraph the decomposed skill graph
     * @return an ordered list of milestone names
     */
    public List<String> plan(SkillGraph skillGraph) {
        return null;
    }
}
