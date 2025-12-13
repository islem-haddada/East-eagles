package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
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
	categoryIDStr := r.FormValue("category_id")
	tagIDsStr := r.FormValue("tag_ids")
	expiryDateStr := r.FormValue("expiry_date")
	notes := r.FormValue("notes")

	athleteID, err := strconv.Atoi(athleteIDStr)
	if err != nil {
		http.Error(w, "Invalid athlete ID", http.StatusBadRequest)
		return
	}

	// Parse category ID if provided
	var categoryID *int
	if categoryIDStr != "" {
		catID, err := strconv.Atoi(categoryIDStr)
		if err != nil {
			http.Error(w, "Invalid category ID", http.StatusBadRequest)
			return
		}
		categoryID = &catID
	}

	// Parse tag IDs if provided
	var tagIDs []int
	if tagIDsStr != "" {
		tagIDStrings := strings.Split(tagIDsStr, ",")
		for _, tagIDStr := range tagIDStrings {
			tagID, err := strconv.Atoi(strings.TrimSpace(tagIDStr))
			if err != nil {
				http.Error(w, "Invalid tag ID: "+tagIDStr, http.StatusBadRequest)
				return
			}
			tagIDs = append(tagIDs, tagID)
		}
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
		CategoryID:       categoryID,
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

	// Load tag objects if tag IDs were provided
	if len(tagIDs) > 0 {
		for _, tagID := range tagIDs {
			doc.Tags = append(doc.Tags, models.Tag{ID: tagID})
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

// UploadBulk handles bulk document upload for multiple athletes
func (h *DocumentHandler) UploadBulk(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	// Max upload size: 50MB for bulk uploads
	r.ParseMultipartForm(50 << 20)

	// Get form fields
	docType := r.FormValue("document_type")
	categoryIDStr := r.FormValue("category_id")
	tagIDsStr := r.FormValue("tag_ids")
	expiryDateStr := r.FormValue("expiry_date")
	notes := r.FormValue("notes")

	// Get athlete IDs (comma separated)
	athleteIDsStr := r.FormValue("athlete_ids")
	if athleteIDsStr == "" {
		http.Error(w, "Athlete IDs are required", http.StatusBadRequest)
		return
	}

	// Parse category ID if provided
	var categoryID *int
	if categoryIDStr != "" {
		catID, err := strconv.Atoi(categoryIDStr)
		if err != nil {
			http.Error(w, "Invalid category ID", http.StatusBadRequest)
			return
		}
		categoryID = &catID
	}

	// Parse tag IDs if provided
	var tagIDs []int
	if tagIDsStr != "" {
		tagIDStrings := strings.Split(tagIDsStr, ",")
		for _, tagIDStr := range tagIDStrings {
			tagID, err := strconv.Atoi(strings.TrimSpace(tagIDStr))
			if err != nil {
				http.Error(w, "Invalid tag ID: "+tagIDStr, http.StatusBadRequest)
				return
			}
			tagIDs = append(tagIDs, tagID)
		}
	}

	// Parse athlete IDs
	athleteIDs := strings.Split(athleteIDsStr, ",")
	var athleteIDInts []int
	for _, idStr := range athleteIDs {
		id, err := strconv.Atoi(strings.TrimSpace(idStr))
		if err != nil {
			http.Error(w, "Invalid athlete ID: "+idStr, http.StatusBadRequest)
			return
		}
		athleteIDInts = append(athleteIDInts, id)
	}

	// Process each file
	type uploadResult struct {
		AthleteID int              `json:"athlete_id"`
		Document  *models.Document `json:"document,omitempty"`
		Error     string           `json:"error,omitempty"`
	}

	results := make([]uploadResult, len(athleteIDInts))

	// Process uploads concurrently
	var wg sync.WaitGroup
	wg.Add(len(athleteIDInts))

	for i, athleteID := range athleteIDInts {
		go func(index int, id int) {
			defer wg.Done()

			// Get file for this athlete
			fieldName := fmt.Sprintf("file_%d", id)
			file, handler, err := r.FormFile(fieldName)
			if err != nil {
				results[index] = uploadResult{
					AthleteID: id,
					Error:     "Error retrieving file: " + err.Error(),
				}
				return
			}
			defer file.Close()

			// Create unique filename
			safeFilename := handler.Filename
			if handler.Header.Get("Content-Type") == "application/pdf" || strings.HasSuffix(strings.ToLower(handler.Filename), ".pdf") {
				safeFilename += ".txt"
			}
			filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), safeFilename)
			folderPath := fmt.Sprintf("east-eagles/documents/athlete_%d", id)

			// Upload to Cloudinary
			fileURL, err := h.cloudinaryService.UploadDocument(file, filename, folderPath, "raw")
			if err != nil {
				results[index] = uploadResult{
					AthleteID: id,
					Error:     "Error uploading file to cloud storage: " + err.Error(),
				}
				return
			}

			// Create document record
			doc := &models.Document{
				AthleteID:        id,
				DocumentType:     docType,
				CategoryID:       categoryID,
				FileName:         handler.Filename,
				FilePath:         "",
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

			// Load tag objects if tag IDs were provided
			if len(tagIDs) > 0 {
				for _, tagID := range tagIDs {
					doc.Tags = append(doc.Tags, models.Tag{ID: tagID})
				}
			}

			if err := h.repo.Create(doc); err != nil {
				results[index] = uploadResult{
					AthleteID: id,
					Error:     err.Error(),
				}
				return
			}

			results[index] = uploadResult{
				AthleteID: id,
				Document:  doc,
			}
		}(i, athleteID)
	}

	wg.Wait()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
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

// GetExpiring returns documents expiring within 30 days (admin only)
func (h *DocumentHandler) GetExpiring(w http.ResponseWriter, r *http.Request) {
	docs, err := h.repo.GetExpiringDocuments()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(docs)
}

// GetExpired returns already expired documents (admin only)
func (h *DocumentHandler) GetExpired(w http.ResponseWriter, r *http.Request) {
	docs, err := h.repo.GetExpiredDocuments()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(docs)
}

// Search searches documents with filters
func (h *DocumentHandler) Search(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	filters := make(map[string]interface{})

	if athleteID := r.URL.Query().Get("athlete_id"); athleteID != "" {
		if id, err := strconv.Atoi(athleteID); err == nil {
			filters["athlete_id"] = id
		}
	}

	if docType := r.URL.Query().Get("document_type"); docType != "" {
		filters["document_type"] = docType
	}

	if categoryID := r.URL.Query().Get("category_id"); categoryID != "" {
		filters["category_id"] = categoryID
	}

	if status := r.URL.Query().Get("status"); status != "" {
		filters["status"] = status
	}

	if search := r.URL.Query().Get("search"); search != "" {
		filters["search"] = search
	}

	if tagIDs := r.URL.Query().Get("tag_ids"); tagIDs != "" {
		tagIDStrings := strings.Split(tagIDs, ",")
		var tagIDList []int
		for _, tagIDStr := range tagIDStrings {
			if id, err := strconv.Atoi(strings.TrimSpace(tagIDStr)); err == nil {
				tagIDList = append(tagIDList, id)
			}
		}
		if len(tagIDList) > 0 {
			filters["tag_ids"] = tagIDList
		}
	}

	if sort := r.URL.Query().Get("sort"); sort != "" {
		filters["sort"] = sort
	}

	if limit := r.URL.Query().Get("limit"); limit != "" {
		if lim, err := strconv.Atoi(limit); err == nil {
			filters["limit"] = lim
		}
	}

	docs, err := h.repo.SearchDocuments(filters)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(docs)
}

// GetCategories returns all document categories
func (h *DocumentHandler) GetCategories(w http.ResponseWriter, r *http.Request) {
	categories, err := h.repo.GetAllCategories()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

// GetTags returns all document tags
func (h *DocumentHandler) GetTags(w http.ResponseWriter, r *http.Request) {
	tags, err := h.repo.GetAllTags()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tags)
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
		fmt.Printf("ERROR Validating Document ID %d by Admin %d: %v\n", id, adminID, err)
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

// UploadVersion handles uploading a new version of a document
func (h *DocumentHandler) UploadVersion(w http.ResponseWriter, r *http.Request) {
	// Parse multipart form
	// Max upload size: 10MB
	r.ParseMultipartForm(10 << 20)

	vars := mux.Vars(r)
	documentID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid document ID", http.StatusBadRequest)
		return
	}

	file, handler, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Get other form fields
	notes := r.FormValue("notes")
	userID := r.Context().Value(middleware.UserIDKey).(int)

	// Get the latest version number and increment it
	latestVersion, err := h.repo.GetLatestVersionNumber(documentID)
	if err != nil {
		http.Error(w, "Error getting latest version number", http.StatusInternalServerError)
		return
	}

	newVersionNumber := latestVersion + 1

	// Create unique filename
	safeFilename := handler.Filename
	if handler.Header.Get("Content-Type") == "application/pdf" || strings.HasSuffix(strings.ToLower(handler.Filename), ".pdf") {
		safeFilename += ".txt"
	}
	filename := fmt.Sprintf("%d_v%d_%s", documentID, newVersionNumber, safeFilename)
	folderPath := fmt.Sprintf("east-eagles/documents/athlete_%d", documentID) // Simplified for demo

	// Upload to Cloudinary
	fileURL, err := h.cloudinaryService.UploadDocument(file, filename, folderPath, "raw")
	if err != nil {
		http.Error(w, "Error uploading file to cloud storage: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Create document version record
	version := &models.DocumentVersion{
		DocumentID:    documentID,
		VersionNumber: newVersionNumber,
		FileName:      handler.Filename,
		FilePath:      "", // No longer using local file path
		FileURL:       fileURL,
		FileSizeBytes: handler.Size,
		MimeType:      handler.Header.Get("Content-Type"),
		Notes:         notes,
		UploadedBy:    &userID,
	}

	if err := h.repo.CreateVersion(version); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(version)
}

// GetVersions returns all versions of a document
func (h *DocumentHandler) GetVersions(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	documentID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid document ID", http.StatusBadRequest)
		return
	}

	versions, err := h.repo.GetVersionsByDocument(documentID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(versions)
}

// ShareDocument shares a document with another user
func (h *DocumentHandler) ShareDocument(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	documentID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid document ID", http.StatusBadRequest)
		return
	}

	var req struct {
		SharedWith      int    `json:"shared_with"`
		PermissionLevel string `json:"permission_level"`
		Notes           string `json:"notes"`
		ExpiresAt       string `json:"expires_at"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	sharedBy, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Validate permission level
	if req.PermissionLevel != "view" && req.PermissionLevel != "edit" && req.PermissionLevel != "manage" {
		http.Error(w, "Invalid permission level", http.StatusBadRequest)
		return
	}

	// Parse expiration date if provided
	var expiresAt *time.Time
	if req.ExpiresAt != "" {
		exp, err := time.Parse("2006-01-02", req.ExpiresAt)
		if err != nil {
			http.Error(w, "Invalid expiration date format", http.StatusBadRequest)
			return
		}
		expiresAt = &exp
	}

	share := &models.DocumentShare{
		DocumentID:      documentID,
		SharedBy:        sharedBy,
		SharedWith:      req.SharedWith,
		PermissionLevel: req.PermissionLevel,
		Notes:           req.Notes,
		ExpiresAt:       expiresAt,
	}

	if err := h.repo.ShareDocument(share); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(share)
}

// GetShares returns all shares for a document
func (h *DocumentHandler) GetShares(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	documentID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid document ID", http.StatusBadRequest)
		return
	}

	shares, err := h.repo.GetSharesByDocument(documentID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(shares)
}

// UnshareDocument removes a document share
func (h *DocumentHandler) UnshareDocument(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	documentID, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid document ID", http.StatusBadRequest)
		return
	}

	var req struct {
		UserID int `json:"user_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.repo.UnshareDocument(documentID, req.UserID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Document unshared successfully"})
}

// GetSharedDocuments returns documents shared with the current user
func (h *DocumentHandler) GetSharedDocuments(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	shares, err := h.repo.GetSharedDocumentsForUser(userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(shares)
}
