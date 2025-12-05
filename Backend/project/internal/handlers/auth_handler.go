package handlers

import (
	"encoding/json"
	"net/http"

	"beautiful-minds/backend/project/internal/middleware"
	"beautiful-minds/backend/project/internal/models"
	"beautiful-minds/backend/project/internal/services"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Register handles user registration
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Basic validation
	if req.Email == "" || req.Password == "" || req.FirstName == "" || req.LastName == "" {
		http.Error(w, "All fields are required", http.StatusBadRequest)
		return
	}

	// Default role if not specified (security precaution)
	if req.Role == "" {
		req.Role = models.RoleAthlete
	}

	user, err := h.authService.Register(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

// Login handles user login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	token, user, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	response := models.LoginResponse{
		Token: token,
		User:  user,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Me returns the current authenticated user
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	// User is already authenticated by middleware, so we can trust the context
	// In a real app, we might want to fetch fresh data from DB, but for now let's just return what we have
	// or fetch from DB using the ID in context

	// For now, let's just return a success message or the claims info
	// Ideally, we should fetch the full user from DB using the ID

	userID := r.Context().Value(middleware.UserIDKey).(int)
	// We would need access to userRepo here to fetch full user, or we can just return the ID
	// Since AuthHandler only has AuthService, let's add a GetUserByID method to AuthService or just return ID

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":    userID,
		"role":  r.Context().Value(middleware.UserRoleKey),
		"email": r.Context().Value(middleware.UserEmailKey),
	})
}
