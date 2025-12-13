package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"east-eagles/backend/internal/models"
	"east-eagles/backend/internal/repository"

	"github.com/gorilla/mux"
)

type AnnouncementHandler struct {
	repo *repository.AnnouncementRepository
}

func NewAnnouncementHandler(repo *repository.AnnouncementRepository) *AnnouncementHandler {
	return &AnnouncementHandler{repo: repo}
}

func (h *AnnouncementHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	announcements, err := h.repo.GetAll()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(announcements)
}

func (h *AnnouncementHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "ID invalide", http.StatusBadRequest)
		return
	}

	announcement, err := h.repo.GetByID(id)
	if err != nil {
		http.Error(w, "Annonce non trouvée", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(announcement)
}

func (h *AnnouncementHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateAnnouncementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Données invalides", http.StatusBadRequest)
		return
	}

	announcement, err := h.repo.Create(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(announcement)
}

func (h *AnnouncementHandler) Update(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "ID invalide", http.StatusBadRequest)
		return
	}

	var req models.CreateAnnouncementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Données invalides", http.StatusBadRequest)
		return
	}

	announcement, err := h.repo.Update(id, &req)
	if err != nil {
		http.Error(w, "Annonce non trouvée", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(announcement)
}

func (h *AnnouncementHandler) Delete(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "ID invalide", http.StatusBadRequest)
		return
	}

	err = h.repo.Delete(id)
	if err != nil {
		http.Error(w, "Annonce non trouvée", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Annonce supprimée"})
}
