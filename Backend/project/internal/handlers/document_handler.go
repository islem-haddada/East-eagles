package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"beautiful-minds/backend/project/internal/middleware"
	"beautiful-minds/backend/project/internal/models"
	"beautiful-minds/backend/project/internal/repository"

	"github.com/gorilla/mux"
)

type DocumentHandler struct {
	repo      *repository.DocumentRepository
	uploadDir string
}

func NewDocumentHandler(repo *repository.DocumentRepository, uploadDir string) *DocumentHandler {
	// Ensure upload directory exists
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		os.MkdirAll(uploadDir, 0755)
	}
	return &DocumentHandler{repo: repo, uploadDir: uploadDir}
}

// Upload handles document upload
func (h *DocumentHandler) Upload(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	// Max upload size: 10MB
	r.ParseMultipartForm(10 << 20)

	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Get other form fields
	athleteIDStr := r.FormValue("athlete_id")
	docType := r.FormValue("document_type")
	expiryDateStr := r.FormValue("expiry_date")
	notes := r.FormValue("notes")

	athleteID, err := strconv.Atoi(athleteIDStr)
	if err != nil {
		http.Error(w, "Invalid athlete ID", http.StatusBadRequest)
		return
	}

	// Create unique filename
	filename := strconv.FormatInt(time.Now().UnixNano(), 10) + filepath.Ext(handler.Filename)
	filePath := filepath.Join(h.uploadDir, filename)

	// Save file to disk
	dst, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Error saving file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "Error saving file", http.StatusInternalServerError)
		return
	}

	// Create document record
	doc := &models.Document{
		AthleteID:        athleteID,
		DocumentType:     docType,
		FileName:         handler.Filename,
		FilePath:         filePath,
		FileURL:          "/uploads/" + filename, // Assuming static file serving
		FileSizeBytes:    handler.Size,
		MimeType:         handler.Header.Get("Content-Type"),
		ValidationStatus: "pending",
		Notes:            notes,
	}

	if expiryDateStr != "" {
		expiryDate, err := time.Parse("2006-01-02", expiryDateStr)
		if err == nil {
			doc.ExpiryDate = &expiryDate
		}
	}

	if err := h.repo.Create(doc); err != nil {
		// Cleanup file if db insert fails
		os.Remove(filePath)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(doc)
}

// GetByAthlete returns documents for an athlete
func (h *DocumentHandler) GetByAthlete(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	athleteID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	// Check permissions: Admin, Coach, or the athlete themselves
	// userID := r.Context().Value(middleware.UserIDKey).(int)
	role := r.Context().Value(middleware.UserRoleKey).(models.UserRole)

	// TODO: If role is athlete, check if userID matches athleteID (need link between user and athlete tables)
	// For now, allow if role is admin/coach
	if role == models.RoleAthlete {
		// Placeholder check - in real app, check ownership
	}

	docs, err := h.repo.GetByAthlete(athleteID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(docs)
}

// GetPending returns pending documents (admin only)
func (h *DocumentHandler) GetPending(w http.ResponseWriter, r *http.Request) {
	docs, err := h.repo.GetPending()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(docs)
}

// Validate validates a document
func (h *DocumentHandler) Validate(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	adminID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := h.repo.Validate(id, adminID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Document validé"})
}

// Reject rejects a document
func (h *DocumentHandler) Reject(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

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
	json.NewEncoder(w).Encode(map[string]string{"message": "Document rejeté"})
}

// Download serves the document file
func (h *DocumentHandler) Download(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	doc, err := h.repo.GetByID(id)
	if err != nil {
		http.Error(w, "Document not found", http.StatusNotFound)
		return
	}

	// Check permissions (similar to GetByAthlete)

	w.Header().Set("Content-Disposition", "attachment; filename="+doc.FileName)
	w.Header().Set("Content-Type", doc.MimeType)
	http.ServeFile(w, r, doc.FilePath)
}
