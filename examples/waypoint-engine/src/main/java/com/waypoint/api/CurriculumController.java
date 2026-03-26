package com.waypoint.api;

import com.waypoint.agent.Curriculum;
import com.waypoint.agent.GoalSpec;
import com.waypoint.entity.CurriculumEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * REST controller exposing curriculum generation and retrieval endpoints.
 */
@RestController
@RequestMapping("/v1/curricula")
public class CurriculumController {

    /**
     * Generates a new curriculum from the given goal specification.
     *
     * @param goal the goal specification
     * @return the generated curriculum
     */
    @PostMapping("/generate")
    public ResponseEntity<Curriculum> generate(@RequestBody GoalSpec goal) {
        return null;
    }

    /**
     * Retrieves a curriculum by its unique identifier.
     *
     * @param id the curriculum identifier
     * @return the curriculum entity
     */
    @GetMapping("/{id}")
    public ResponseEntity<CurriculumEntity> getById(@PathVariable UUID id) {
        return null;
    }

    /**
     * Lists all curricula belonging to a specific user.
     *
     * @param userId the user identifier
     * @return the list of curriculum entities
     */
    @GetMapping
    public ResponseEntity<List<CurriculumEntity>> listByUser(@RequestParam UUID userId) {
        return null;
    }
}
