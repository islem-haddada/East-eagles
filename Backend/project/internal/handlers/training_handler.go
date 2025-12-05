package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"beautiful-minds/backend/project/internal/middleware"
	"beautiful-minds/backend/project/internal/models"
	"beautiful-minds/backend/project/internal/repository"

	"github.com/gorilla/mux"
)

type TrainingHandler struct {
	repo *repository.TrainingRepository
}

func NewTrainingHandler(repo *repository.TrainingRepository) *TrainingHandler {
	return &TrainingHandler{repo: repo}
}

// Create creates a new training session
func (h *TrainingHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateTrainingSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	coachID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	session, err := h.repo.Create(&req, coachID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(session)
}

// GetAll returns all training sessions
func (h *TrainingHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	sessions, err := h.repo.GetAll()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sessions)
}

// GetUpcoming returns upcoming training sessions
func (h *TrainingHandler) GetUpcoming(w http.ResponseWriter, r *http.Request) {
	sessions, err := h.repo.GetUpcoming()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sessions)
}

// GetByID returns a training session by ID
func (h *TrainingHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	session, err := h.repo.GetByID(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

// Update updates a training session
func (h *TrainingHandler) Update(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var req models.CreateTrainingSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	session, err := h.repo.Update(id, &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

// Delete deletes a training session
func (h *TrainingHandler) Delete(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	if err := h.repo.Delete(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Session supprimée"})
}

// MarkAttendance marks attendance for an athlete
func (h *TrainingHandler) MarkAttendance(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var req models.MarkAttendanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	req.TrainingSessionID = sessionID

	markedBy, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.repo.MarkAttendance(&req, markedBy); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Présence marquée"})
}

// GetAttendance returns attendance for a session
func (h *TrainingHandler) GetAttendance(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	attendance, err := h.repo.GetAttendance(sessionID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(attendance)
}
