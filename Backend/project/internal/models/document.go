package models

import "time"

// Document represents an uploaded document for an athlete
type Document struct {
	ID               int        `json:"id"`
	AthleteID        int        `json:"athlete_id"`
	DocumentType     string     `json:"document_type"` // 'medical_certificate', 'photo', 'id_card', 'parental_consent', 'other'
	FileName         string     `json:"file_name"`
	FilePath         string     `json:"-"` // Internal path, not exposed in JSON
	FileURL          string     `json:"file_url"`
	FileSizeBytes    int64      `json:"file_size_bytes"`
	MimeType         string     `json:"mime_type"`
	ValidationStatus string     `json:"validation_status"` // 'pending', 'approved', 'rejected'
	ExpiryDate       *time.Time `json:"expiry_date"`
	UploadedAt       time.Time  `json:"uploaded_at"`
	ValidatedBy      *int       `json:"validated_by"`
	ValidatedAt      *time.Time `json:"validated_at"`
	RejectionReason  string     `json:"rejection_reason,omitempty"`
	Notes            string     `json:"notes"`
}

// UploadDocumentRequest for uploading documents
type UploadDocumentRequest struct {
	DocumentType string `json:"document_type"`
	Notes        string `json:"notes"`
	ExpiryDate   string `json:"expiry_date"` // YYYY-MM-DD
	// File will be handled separately via multipart/form-data
}
