package handlers

import (
	"east-eagles/backend/internal/middleware"
	"east-eagles/backend/internal/models"
	"east-eagles/backend/internal/repository"
	"east-eagles/backend/internal/services"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

type AthleteHandler struct {
	repo              *repository.AthleteRepository
	cloudinaryService *services.CloudinaryService
}

func NewAthleteHandler(repo *repository.AthleteRepository, cloudinaryService *services.CloudinaryService) *AthleteHandler {
	return &AthleteHandler{
		repo:              repo,
		cloudinaryService: cloudinaryService,
	}
}

// GetAll returns all athletes
func (h *AthleteHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	athletes, err := h.repo.GetAll()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(athletes)
}

// GetPending returns athletes pending approval (admin only)
func (h *AthleteHandler) GetPending(w http.ResponseWriter, r *http.Request) {
	athletes, err := h.repo.GetPending()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(athletes)
}

// GetByID returns athlete by ID
func (h *AthleteHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	athlete, err := h.repo.GetByID(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(athlete)
}

// Create creates new athlete
func (h *AthleteHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateAthleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	athlete, err := h.repo.Create(&req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(athlete)
}

// Update updates an athlete
func (h *AthleteHandler) Update(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var req models.CreateAthleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	athlete, err := h.repo.Update(id, &req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(athlete)
}

// Delete removes an athlete
func (h *AthleteHandler) Delete(w http.ResponseWriter, r *http.Request) {
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
	json.NewEncoder(w).Encode(map[string]string{"message": "Athlète supprimé"})
}

// Search searches athletes by query
func (h *AthleteHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	athletes, err := h.repo.Search(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(athletes)
}

// Approve approves an athlete (admin only)
func (h *AthleteHandler) Approve(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	// Get admin ID from context
	adminID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.repo.Approve(id, adminID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Athlète approuvé"})
}

// Reject rejects an athlete (admin only)
func (h *AthleteHandler) Reject(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var req models.ApprovalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Get admin ID from context
	adminID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.repo.Reject(id, adminID, req.Reason); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Athlète rejeté"})
}

// GetStats returns athlete statistics (admin only)
func (h *AthleteHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.repo.GetStats()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// GetProfile returns the profile of the authenticated athlete
func (h *AthleteHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	email, ok := r.Context().Value(middleware.UserEmailKey).(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	athlete, err := h.repo.GetByEmail(email)
	if err != nil {
		// If athlete doesn't exist, create a basic profile for them
		// This handles the case where a user exists but no athlete profile has been created yet
		fmt.Printf("Athlete with email %s not found, creating new profile\n", email)

		// Create a basic athlete profile
		createReq := &models.CreateAthleteRequest{
			FirstName:                "", // Will be updated by the user
			LastName:                 "", // Will be updated by the user
			Email:                    email,
			Phone:                    "",
			DateOfBirth:              "",
			WeightKG:                 0,
			Gender:                   "",
			Nationality:              "",
			Address:                  "",
			City:                     "",
			PostalCode:               "",
			BeltLevel:                "beginner",
			SkillLevel:               "beginner",
			YearsOfExperience:        0,
			WeightCategory:           "",
			EmergencyContactName:     "",
			EmergencyContactPhone:    "",
			EmergencyContactRelation: "",
			MedicalConditions:        "",
			Allergies:                "",
			BloodType:                "",
			PhotoURL:                 "",
		}

		athlete, err = h.repo.Create(createReq)
		if err != nil {
			fmt.Printf("Error creating athlete profile: %v\n", err)
			http.Error(w, "Error creating athlete profile", http.StatusInternalServerError)
			return
		}

		fmt.Printf("Created new athlete profile with ID: %d\n", athlete.ID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(athlete)
}

// UpdateProfile updates the profile of the authenticated athlete
func (h *AthleteHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	email, ok := r.Context().Value(middleware.UserEmailKey).(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	athlete, err := h.repo.GetByEmail(email)
	if err != nil {
		// If athlete doesn't exist, return an error
		// The GetProfile function should have created the profile already
		http.Error(w, "Athlete profile not found", http.StatusNotFound)
		return
	}

	var req models.CreateAthleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fmt.Printf("❌ UpdateProfile JSON Decode Error: %v\n", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Ensure critical fields are not changed or are consistent
	req.Email = email

	// Log the request for debugging
	fmt.Printf("📝 UpdateProfile Request Data: %+v\n", req)

	updatedAthlete, err := h.repo.Update(athlete.ID, &req)
	if err != nil {
		fmt.Printf("❌ UpdateProfile Repo Error: %v\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedAthlete)
}

// UploadProfileImage handles profile image upload
func (h *AthleteHandler) UploadProfileImage(w http.ResponseWriter, r *http.Request) {
	// 1. Parse multipart form (10MB max)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "Error parsing form", http.StatusBadRequest)
		return
	}

	// 2. Get file
	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// 3. Get user email from context
	email, ok := r.Context().Value(middleware.UserEmailKey).(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// 4. Get athlete to get ID
	athlete, err := h.repo.GetByEmail(email)
	if err != nil {
		http.Error(w, "Athlete not found", http.StatusNotFound)
		return
	}

	// 5. Upload to Cloudinary
	filename := fmt.Sprintf("profile_%d_%d_%s", athlete.ID, time.Now().Unix(), handler.Filename)
	folderPath := "east-eagles/profiles"

	imageURL, err := h.cloudinaryService.UploadDocument(file, filename, folderPath, "image")
	if err != nil {
		http.Error(w, "Error uploading to cloud: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 6. Update Athlete Record
	// We need to construct a full request or create a partial update method.
	// For now, let's fetch the current athlete, update the image, and save it back.
	// Ideally, we should have a specific UpdateProfileImage method in repo, but Update works if we fill all fields.

	// Prepare nullable fields safely
	var birthDateStr string
	if athlete.DateOfBirth != nil {
		birthDateStr = athlete.DateOfBirth.Format("2006-01-02")
	}

	var weight float64
	if athlete.WeightKG != nil {
		weight = *athlete.WeightKG
	}

	// Create request from existing athlete data
	req := &models.CreateAthleteRequest{
		FirstName:                athlete.FirstName,
		LastName:                 athlete.LastName,
		Email:                    athlete.Email,
		Phone:                    athlete.Phone,
		DateOfBirth:              birthDateStr,
		WeightKG:                 weight,
		Gender:                   athlete.Gender,
		Nationality:              athlete.Nationality,
		Address:                  athlete.Address,
		City:                     athlete.City,
		PostalCode:               athlete.PostalCode,
		BeltLevel:                athlete.BeltLevel,
		SkillLevel:               athlete.SkillLevel,
		YearsOfExperience:        athlete.YearsOfExperience,
		WeightCategory:           athlete.WeightCategory,
		EmergencyContactName:     athlete.EmergencyContactName,
		EmergencyContactPhone:    athlete.EmergencyContactPhone,
		EmergencyContactRelation: athlete.EmergencyContactRelation,
		MedicalConditions:        athlete.MedicalConditions,
		Allergies:                athlete.Allergies,
		BloodType:                athlete.BloodType,
		PhotoURL:                 imageURL, // The new image
	}

	updatedAthlete, err := h.repo.Update(athlete.ID, req)
	if err != nil {
		http.Error(w, "Error updating database: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedAthlete)
}
