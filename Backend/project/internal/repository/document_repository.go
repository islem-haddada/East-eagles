package repository

import (
	"database/sql"

	"beautiful-minds/backend/project/internal/models"
)

type DocumentRepository struct {
	db *sql.DB
}

func NewDocumentRepository(db *sql.DB) *DocumentRepository {
	return &DocumentRepository{db: db}
}

// Create creates a new document record
func (r *DocumentRepository) Create(doc *models.Document) error {
	query := `
		INSERT INTO documents (
			athlete_id, document_type, file_name, file_path, file_url, 
			file_size_bytes, mime_type, validation_status, expiry_date, notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, uploaded_at
	`
	return r.db.QueryRow(
		query,
		doc.AthleteID,
		doc.DocumentType,
		doc.FileName,
		doc.FilePath,
		doc.FileURL,
		doc.FileSizeBytes,
		doc.MimeType,
		doc.ValidationStatus,
		doc.ExpiryDate,
		doc.Notes,
	).Scan(&doc.ID, &doc.UploadedAt)
}

// GetByAthlete returns documents for an athlete
func (r *DocumentRepository) GetByAthlete(athleteID int) ([]*models.Document, error) {
	query := `
		SELECT id, athlete_id, document_type, file_name, file_path, file_url,
		       validation_status, expiry_date, uploaded_at, notes, rejection_reason
		FROM documents
		WHERE athlete_id = $1
		ORDER BY uploaded_at DESC
	`
	rows, err := r.db.Query(query, athleteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []*models.Document
	for rows.Next() {
		d := &models.Document{}
		var notes, rejectionReason sql.NullString

		if err := rows.Scan(
			&d.ID, &d.AthleteID, &d.DocumentType, &d.FileName, &d.FilePath, &d.FileURL,
			&d.ValidationStatus, &d.ExpiryDate, &d.UploadedAt, &notes, &rejectionReason,
		); err != nil {
			return nil, err
		}

		if notes.Valid {
			d.Notes = notes.String
		}
		if rejectionReason.Valid {
			d.RejectionReason = rejectionReason.String
		}

		docs = append(docs, d)
	}
	return docs, nil
}

// GetPending returns documents pending validation
func (r *DocumentRepository) GetPending() ([]*models.Document, error) {
	query := `
		SELECT id, athlete_id, document_type, file_name, file_path, file_url,
		       validation_status, expiry_date, uploaded_at, notes
		FROM documents
		WHERE validation_status = 'pending'
		ORDER BY uploaded_at ASC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []*models.Document
	for rows.Next() {
		d := &models.Document{}
		var notes sql.NullString

		if err := rows.Scan(
			&d.ID, &d.AthleteID, &d.DocumentType, &d.FileName, &d.FilePath, &d.FileURL,
			&d.ValidationStatus, &d.ExpiryDate, &d.UploadedAt, &notes,
		); err != nil {
			return nil, err
		}

		if notes.Valid {
			d.Notes = notes.String
		}

		docs = append(docs, d)
	}
	return docs, nil
}

// GetByID returns a document by ID
func (r *DocumentRepository) GetByID(id int) (*models.Document, error) {
	d := &models.Document{}
	query := `
		SELECT id, athlete_id, document_type, file_name, file_path, file_url,
		       validation_status, expiry_date, uploaded_at, notes, mime_type
		FROM documents
		WHERE id = $1
	`
	var notes sql.NullString

	err := r.db.QueryRow(query, id).Scan(
		&d.ID, &d.AthleteID, &d.DocumentType, &d.FileName, &d.FilePath, &d.FileURL,
		&d.ValidationStatus, &d.ExpiryDate, &d.UploadedAt, &notes, &d.MimeType,
	)
	if err != nil {
		return nil, err
	}

	if notes.Valid {
		d.Notes = notes.String
	}

	return d, nil
}

// Validate approves a document
func (r *DocumentRepository) Validate(id, adminID int) error {
	query := `
		UPDATE documents
		SET validation_status = 'approved', validated_by = $1, validated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`
	_, err := r.db.Exec(query, adminID, id)
	return err
}

// Reject rejects a document
func (r *DocumentRepository) Reject(id, adminID int, reason string) error {
	query := `
		UPDATE documents
		SET validation_status = 'rejected', validated_by = $1, validated_at = CURRENT_TIMESTAMP,
		    rejection_reason = $2
		WHERE id = $3
	`
	_, err := r.db.Exec(query, adminID, reason, id)
	return err
}
