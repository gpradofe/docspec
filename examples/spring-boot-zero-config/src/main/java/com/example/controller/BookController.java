package com.example.controller;

import com.example.dto.BookDto;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for managing books in the catalog.
 */
@RestController
@RequestMapping("/api/books")
public class BookController {

    /** Lists all books in the catalog. */
    @GetMapping
    public List<BookDto> getAllBooks() {
        return null;
    }

    /**
     * Retrieves a book by its identifier.
     *
     * @param id the book identifier
     * @return the book details
     */
    @GetMapping("/{id}")
    public BookDto getBookById(@PathVariable Long id) {
        return null;
    }

    /**
     * Creates a new book in the catalog.
     *
     * @param book the book data to create
     * @return the created book with generated identifier
     */
    @PostMapping
    public BookDto createBook(@RequestBody BookDto book) {
        return null;
    }

    /**
     * Deletes a book from the catalog.
     *
     * @param id the book identifier to delete
     */
    @DeleteMapping("/{id}")
    public void deleteBook(@PathVariable Long id) {
    }
}
