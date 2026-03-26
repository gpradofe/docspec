package com.example.repository;

import com.example.entity.Book;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for persisting and retrieving book entities.
 */
@Repository
public interface BookRepository {

    /**
     * Finds all books.
     *
     * @return the list of all books
     */
    List<Book> findAll();

    /**
     * Finds a book by its identifier.
     *
     * @param id the book identifier
     * @return the book, or null if not found
     */
    Book findById(Long id);

    /**
     * Saves a book entity.
     *
     * @param book the book to save
     * @return the persisted book
     */
    Book save(Book book);

    /**
     * Deletes a book by its identifier.
     *
     * @param id the book identifier
     */
    void deleteById(Long id);

    /**
     * Finds all books by a specific author.
     *
     * @param authorId the author identifier
     * @return the list of books by the author
     */
    List<Book> findByAuthorId(Long authorId);
}
