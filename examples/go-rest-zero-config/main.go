package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/docspec/go-rest-zero-config/services"
)

var userService = services.NewUserService()

func main() {
	http.HandleFunc("/api/users", handleUsers)
	http.HandleFunc("/api/users/", handleUserByID)

	fmt.Println("Server listening on :8080")
	http.ListenAndServe(":8080", nil)
}

// handleUsers dispatches GET (list) and POST (create) for the /api/users collection.
func handleUsers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case http.MethodGet:
		users := userService.FindAll()
		json.NewEncoder(w).Encode(users)

	case http.MethodPost:
		var req struct {
			Name  string `json:"name"`
			Email string `json:"email"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
			return
		}
		user := userService.Create(req.Name, req.Email)
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(user)

	default:
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
	}
}

// handleUserByID dispatches GET for /api/users/{id}.
func handleUserByID(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	id := strings.TrimPrefix(r.URL.Path, "/api/users/")
	if id == "" {
		http.Error(w, `{"error":"missing id"}`, http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		user, ok := userService.FindByID(id)
		if !ok {
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(user)

	case http.MethodDelete:
		if !userService.Delete(id) {
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
	}
}
