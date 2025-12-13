package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"east-eagles/backend/internal/models"
	"east-eagles/backend/internal/repository"

	"log"

	"github.com/gorilla/mux"
)

type ScheduleHandler struct {
	repo *repository.ScheduleRepository
}

func NewScheduleHandler(repo *repository.ScheduleRepository) *ScheduleHandler {
	return &ScheduleHandler{repo: repo}
}

// Create creates a new schedule slot
func (h *ScheduleHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateScheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	schedule, err := h.repo.Create(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(schedule)
}

// GetAll returns all schedule slots
func (h *ScheduleHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	schedules, err := h.repo.GetAll()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Debug log to see what we're sending
	log.Printf("📤 Sending %d schedules", len(schedules))
	for i, s := range schedules {
		log.Printf("   Schedule %d: ID=%d, Day=%s, Time=%s, Duration=%d",
			i, s.ID, s.DayOfWeek, s.StartTime, s.DurationMinutes)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(schedules)
}

// Delete deletes a schedule slot
func (h *ScheduleHandler) Delete(w http.ResponseWriter, r *http.Request) {
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
	json.NewEncoder(w).Encode(map[string]string{"message": "Schedule deleted"})
}

// Update updates a schedule slot
func (h *ScheduleHandler) Update(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var req models.CreateScheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	schedule, err := h.repo.Update(id, &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(schedule)
}
