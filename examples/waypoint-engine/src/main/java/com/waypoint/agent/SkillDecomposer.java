package com.waypoint.agent;

import io.docspec.annotation.DocMethod;
import org.springframework.stereotype.Service;

/**
 * AI-powered skill decomposition engine.
 *
 * <p>Takes a parsed goal and uses large language models to decompose it
 * into a directed acyclic graph of prerequisite skills and learning
 * objectives.</p>
 */
@Service
public class SkillDecomposer {

    /**
     * Decomposes a parsed goal into a skill graph.
     *
     * @param goal the validated parsed goal
     * @return a graph of skills and their prerequisites
     */
    @DocMethod(since = "1.0.0")
    public SkillGraph decompose(ParsedGoal goal) {
        return null;
    }
}
