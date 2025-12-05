package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"beautiful-minds/backend/project/internal/models"
	"beautiful-minds/backend/project/internal/repository"

	"github.com/gorilla/mux"
)

type MemberHandler struct {
	repo *repository.MemberRepository
}

func NewMemberHandler(repo *repository.MemberRepository) *MemberHandler {
	return &MemberHandler{repo: repo}
}

func (h *MemberHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	members, err := h.repo.GetAll()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(members)
}

func (h *MemberHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "ID invalide", http.StatusBadRequest)
		return
	}

	member, err := h.repo.GetByID(id)
	if err != nil {
		http.Error(w, "Membre non trouvé", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(member)
}

func (h *MemberHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Données invalides", http.StatusBadRequest)
		return
	}

	// Validate request
	if err := req.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	member, err := h.repo.Create(&req)
	if err != nil {
		// Check for duplicate email error
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") {
			http.Error(w, "Cet email est déjà utilisé", http.StatusConflict)
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(member)
}

// Delete removes a member
func (h *MemberHandler) Delete(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "ID invalide", http.StatusBadRequest)
		return
	}

	err = h.repo.Delete(id)
	if err != nil {
		http.Error(w, "Membre non trouvé", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Membre supprimé"})
}

// Search searches for members by name or email
func (h *MemberHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Paramètre 'q' requis pour la recherche", http.StatusBadRequest)
		return
	}

	members, err := h.repo.Search(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(members)
}

// Update updates a member
func (h *MemberHandler) Update(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "ID invalide", http.StatusBadRequest)
		return
	}

	var req models.CreateMemberRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Données invalides", http.StatusBadRequest)
		return
	}

	// Validate request
	if err := req.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	member, err := h.repo.Update(id, &req)
	if err != nil {
		// Check for duplicate email error
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") {
			http.Error(w, "Cet email est déjà utilisé", http.StatusConflict)
			return
		}
		http.Error(w, "Membre non trouvé", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(member)
}
