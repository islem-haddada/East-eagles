package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"beautiful-minds/backend/project/internal/middleware"
	"beautiful-minds/backend/project/internal/models"
	"beautiful-minds/backend/project/internal/repository"
	"beautiful-minds/backend/project/internal/services"

	"github.com/gorilla/mux"
)

type DocumentHandler struct {
	repo              *repository.DocumentRepository
	cloudinaryService *services.CloudinaryService
}

func NewDocumentHandler(repo *repository.DocumentRepository, cloudinaryService *services.CloudinaryService) *DocumentHandler {
	return &DocumentHandler{
		repo:              repo,
		cloudinaryService: cloudinaryService,
	}
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
	// Append .txt to PDFs to bypass Cloudinary's "PDF as Image" restriction which causes 401 errors
	// The backend Download handler will serve it with the correct Content-Type and Filename.
	safeFilename := handler.Filename
	if handler.Header.Get("Content-Type") == "application/pdf" || strings.HasSuffix(strings.ToLower(handler.Filename), ".pdf") {
		safeFilename += ".txt"
	}
	filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), safeFilename)
	folderPath := fmt.Sprintf("east-eagles/documents/athlete_%d", athleteID)

	// Upload to Cloudinary
	// Use "raw" resource type to avoid issues with PDFs being treated as images (double extension, 401 errors)
	fileURL, err := h.cloudinaryService.UploadDocument(file, filename, folderPath, "raw")
	if err != nil {
		http.Error(w, "Error uploading file to cloud storage: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Create document record
	doc := &models.Document{
		AthleteID:        athleteID,
		DocumentType:     docType,
		FileName:         handler.Filename,
		FilePath:         "", // No longer using local file path
		FileURL:          fileURL,
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

// GetMyDocuments returns documents for the currently authenticated athlete
func (h *DocumentHandler) GetMyDocuments(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// For athletes, user ID equals athlete ID since they share the same ID
	// (based on the database schema where users table has user data)
	athleteID := userID

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

// Download serves the document file by redirecting to Cloudinary URL
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

	// Proxy the file download
	// Fetch from Cloudinary (which might be a .txt file to bypass restrictions)
	resp, err := http.Get(doc.FileURL)
	if err != nil {
		http.Error(w, "Error fetching document", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Set headers
	w.Header().Set("Content-Type", doc.MimeType)
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", doc.FileName))
	w.Header().Set("Content-Length", strconv.FormatInt(resp.ContentLength, 10))

	// Stream body
	if _, err := io.Copy(w, resp.Body); err != nil {
		// Can't send error header if body started writing, but log it
		fmt.Printf("Error streaming file: %v\n", err)
	}
}
