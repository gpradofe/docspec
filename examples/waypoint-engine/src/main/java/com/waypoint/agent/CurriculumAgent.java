package com.waypoint.agent;

import io.docspec.annotation.DocFlow;
import io.docspec.annotation.DocMethod;
import io.docspec.annotation.DocModule;
import io.docspec.annotation.DocOptional;
import io.docspec.annotation.DocPerformance;
import io.docspec.annotation.DocPreserves;
import io.docspec.annotation.DocTags;
import io.docspec.annotation.Step;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

/**
 * LangGraph-based agent orchestrating the full curriculum generation pipeline.
 *
 * <p>This is the main entry point for AI-powered curriculum generation. It
 * coordinates goal parsing, skill decomposition, milestone planning, task
 * generation, and persistence through a multi-step flow.</p>
 */
@DocModule(id = "curriculum-agent", name = "Curriculum Agent",
    description = "LangGraph-based agent for AI curriculum generation", since = "1.0.0")
@DocTags({"ai", "core"})
@DocFlow(id = "curriculum-generation", name = "Curriculum Generation Pipeline",
    description = "End-to-end AI curriculum generation from goal specification to persisted curriculum",
    trigger = "POST /v1/curricula/generate",
    steps = {
        @Step(id = "parse-goal", name = "Parse Goal", actor = "GoalParser",
            actorQualified = "com.waypoint.agent.GoalParser",
            description = "Validates and normalizes the GoalSpec input",
            type = "process", inputs = {"GoalSpec"}, outputs = {"ParsedGoal"}),
        @Step(id = "decompose-skills", name = "Decompose Skills", actor = "SkillDecomposer",
            actorQualified = "com.waypoint.agent.SkillDecomposer",
            description = "AI-powered skill decomposition from goal",
            type = "process", ai = true, inputs = {"ParsedGoal"}, outputs = {"SkillGraph"}),
        @Step(id = "plan-milestones", name = "Plan Milestones", actor = "MilestonePlanner",
            description = "Plans learning milestones from skill graph",
            type = "process", ai = true, inputs = {"SkillGraph"}, outputs = {"MilestonePlan"}),
        @Step(id = "generate-tasks", name = "Generate Tasks", actor = "TaskGenerator",
            description = "Generates concrete learning tasks",
            type = "process", ai = true, inputs = {"MilestonePlan"}, outputs = {"TaskSet"}),
        @Step(id = "retry", name = "Surgical Retry", actor = "SurgicalRetrySystem",
            actorQualified = "com.waypoint.agent.SurgicalRetrySystem",
            description = "Retries failed steps with targeted fixes",
            type = "retry", retryTarget = "generate-tasks"),
        @Step(id = "persist", name = "Save Curriculum", actor = "CurriculumRepository",
            actorQualified = "com.waypoint.repository.CurriculumRepository",
            description = "Persists the generated curriculum",
            type = "storage", inputs = {"Curriculum"}, outputs = {"CurriculumEntity"})
    })
@Service
public class CurriculumAgent {

    @Value("${curriculum.max-retries:5}")
    private int maxRetries;

    @Value("${curriculum.timeout-seconds:30}")
    private int timeoutSeconds;

    /** Generates a complete curriculum from a goal specification. */
    @DocMethod(since = "1.0.0")
    @DocPerformance(expectedLatency = "< 6s at p99", bottleneck = "AI skill decomposition")
    @DocPreserves(fields = {"goal.title", "goal.targetAudience"})
    public Curriculum generate(GoalSpec goal, @DocOptional GenerateOptions options) {
        return null;
    }

    /** Generates a curriculum asynchronously. */
    @DocMethod(since = "2.0.0")
    public CompletableFuture<Curriculum> generateAsync(GoalSpec goal) {
        return null;
    }
}
