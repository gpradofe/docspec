package com.example.service;

import com.example.entity.Author;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service layer for author operations.
 */
@Service
public class AuthorService {

    /**
     * Finds all authors.
     *
     * @return the list of all authors
     */
    public List<Author> findAll() {
        return null;
    }

    /**
     * Finds an author by their identifier.
     *
     * @param id the author identifier
     * @return the author, or null if not found
     */
    public Author findById(Long id) {
        return null;
    }

    /**
     * Saves a new or updated author.
     *
     * @param author the author to save
     * @return the persisted author
     */
    public Author save(Author author) {
        return null;
    }
}
