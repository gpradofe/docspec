package services

import (
	"fmt"
	"sync"
	"time"
)

// User represents a user in the system.
type User struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	CreatedAt string `json:"created_at"`
}

// UserService manages user CRUD operations with in-memory storage.
type UserService struct {
	mu     sync.RWMutex
	users  map[string]User
	nextID int
}

// NewUserService creates a new UserService with an empty store.
func NewUserService() *UserService {
	return &UserService{
		users:  make(map[string]User),
		nextID: 1,
	}
}

// FindAll returns all users.
func (s *UserService) FindAll() []User {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]User, 0, len(s.users))
	for _, u := range s.users {
		result = append(result, u)
	}
	return result
}

// FindByID looks up a user by their unique identifier.
func (s *UserService) FindByID(id string) (User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	u, ok := s.users[id]
	return u, ok
}

// Create adds a new user and returns the created record.
func (s *UserService) Create(name, email string) User {
	s.mu.Lock()
	defer s.mu.Unlock()

	id := fmt.Sprintf("%d", s.nextID)
	s.nextID++

	u := User{
		ID:        id,
		Name:      name,
		Email:     email,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	s.users[id] = u
	return u
}

// Update modifies an existing user's fields. Returns false if the user does not exist.
func (s *UserService) Update(id, name, email string) (User, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	u, ok := s.users[id]
	if !ok {
		return User{}, false
	}
	u.Name = name
	u.Email = email
	s.users[id] = u
	return u, true
}

// Delete removes a user by ID. Returns true if the user existed.
func (s *UserService) Delete(id string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	_, ok := s.users[id]
	if ok {
		delete(s.users, id)
	}
	return ok
}
