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

	// Trim and validate required fields
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	if req.FirstName == "" || req.LastName == "" {
		http.Error(w, "Le prénom et le nom sont requis", http.StatusBadRequest)
		return
	}

	member, err := h.repo.Create(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(member)
}
