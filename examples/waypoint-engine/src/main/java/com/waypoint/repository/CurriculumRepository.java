package com.waypoint.repository;

import com.waypoint.entity.CurriculumEntity;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for persisting and retrieving curriculum entities.
 */
@Repository
public interface CurriculumRepository {

    /**
     * Finds a curriculum by its unique identifier.
     *
     * @param id the curriculum identifier
     * @return the curriculum entity, or null if not found
     */
    CurriculumEntity findById(UUID id);

    /**
     * Finds all curricula belonging to a specific user.
     *
     * @param userId the user identifier
     * @return the list of curriculum entities for the user
     */
    List<CurriculumEntity> findByUserId(UUID userId);

    /**
     * Persists a curriculum entity.
     *
     * @param entity the curriculum entity to save
     * @return the persisted entity with generated identifiers
     */
    CurriculumEntity save(CurriculumEntity entity);

    /**
     * Deletes a curriculum by its identifier.
     *
     * @param id the curriculum identifier
     */
    void delete(UUID id);
}
