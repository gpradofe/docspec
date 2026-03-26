package com.example.controller;

import com.example.entity.Author;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for managing authors.
 */
@RestController
@RequestMapping("/api/authors")
public class AuthorController {

    /**
     * Lists all authors.
     *
     * @return the list of all authors
     */
    @GetMapping
    public List<Author> getAllAuthors() {
        return null;
    }

    /**
     * Retrieves an author by their identifier.
     *
     * @param id the author identifier
     * @return the author details
     */
    @GetMapping("/{id}")
    public Author getAuthorById(@PathVariable Long id) {
        return null;
    }

    /**
     * Creates a new author.
     *
     * @param author the author data to create
     * @return the created author with generated identifier
     */
    @PostMapping
    public Author createAuthor(@RequestBody Author author) {
        return null;
    }
}
