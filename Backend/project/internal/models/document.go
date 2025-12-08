package models

import "time"

// Document represents an uploaded document for an athlete
type Document struct {
	ID               int               `json:"id"`
	AthleteID        int               `json:"athlete_id"`
	DocumentType     string            `json:"document_type"` // 'medical_certificate', 'photo', 'id_card', 'parental_consent', 'other'
	CategoryID       *int              `json:"category_id,omitempty"`
	Category         *Category         `json:"category,omitempty"`
	FileName         string            `json:"file_name"`
	FilePath         string            `json:"-"` // Internal path, not exposed in JSON
	FileURL          string            `json:"file_url"`
	FileSizeBytes    int64             `json:"file_size_bytes"`
	MimeType         string            `json:"mime_type"`
	ValidationStatus string            `json:"validation_status"` // 'pending', 'approved', 'rejected'
	ExpiryDate       *time.Time        `json:"expiry_date"`
	UploadedAt       time.Time         `json:"uploaded_at"`
	ValidatedBy      *int              `json:"validated_by"`
	ValidatedAt      *time.Time        `json:"validated_at"`
	RejectionReason  string            `json:"rejection_reason,omitempty"`
	Notes            string            `json:"notes"`
	Tags             []Tag             `json:"tags,omitempty"`
	Versions         []DocumentVersion `json:"versions,omitempty"` // Document versions
	Shares           []DocumentShare   `json:"shares,omitempty"`   // Document shares
}

// DocumentVersion represents a version of a document
type DocumentVersion struct {
	ID            int       `json:"id"`
	DocumentID    int       `json:"document_id"`
	VersionNumber int       `json:"version_number"`
	FileName      string    `json:"file_name"`
	FilePath      string    `json:"-"` // Internal path, not exposed in JSON
	FileURL       string    `json:"file_url"`
	FileSizeBytes int64     `json:"file_size_bytes"`
	MimeType      string    `json:"mime_type"`
	Notes         string    `json:"notes"`
	UploadedBy    *int      `json:"uploaded_by"`
	UploadedAt    time.Time `json:"uploaded_at"`
}

// DocumentShare represents a document shared with another user
type DocumentShare struct {
	ID              int        `json:"id"`
	DocumentID      int        `json:"document_id"`
	SharedBy        int        `json:"shared_by"`
	SharedWith      int        `json:"shared_with"`
	PermissionLevel string     `json:"permission_level"` // 'view', 'edit', 'manage'
	Notes           string     `json:"notes"`
	SharedAt        time.Time  `json:"shared_at"`
	ExpiresAt       *time.Time `json:"expires_at"`
}

// Category represents a document category
type Category struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Color       string    `json:"color"`
	CreatedAt   time.Time `json:"created_at"`
}

// Tag represents a document tag
type Tag struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"created_at"`
}

// UploadDocumentRequest for uploading documents
type UploadDocumentRequest struct {
	DocumentType string `json:"document_type"`
	CategoryID   *int   `json:"category_id,omitempty"`
	TagIDs       []int  `json:"tag_ids,omitempty"`
	Notes        string `json:"notes"`
	ExpiryDate   string `json:"expiry_date"` // YYYY-MM-DD
	// File will be handled separately via multipart/form-data
}
