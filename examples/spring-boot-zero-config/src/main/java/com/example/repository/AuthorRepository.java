package com.example.repository;

import com.example.entity.Author;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for persisting and retrieving author entities.
 */
@Repository
public interface AuthorRepository {

    /**
     * Finds all authors.
     *
     * @return the list of all authors
     */
    List<Author> findAll();

    /**
     * Finds an author by their identifier.
     *
     * @param id the author identifier
     * @return the author, or null if not found
     */
    Author findById(Long id);

    /**
     * Saves an author entity.
     *
     * @param author the author to save
     * @return the persisted author
     */
    Author save(Author author);
}
