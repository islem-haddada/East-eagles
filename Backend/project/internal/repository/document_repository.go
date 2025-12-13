package repository

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"beautiful-minds/backend/project/internal/models"

	"github.com/lib/pq"
)

type DocumentRepository struct {
	db *sql.DB
}

func NewDocumentRepository(db *sql.DB) *DocumentRepository {
	return &DocumentRepository{db: db}
}

// Create creates a new document record
func (r *DocumentRepository) Create(doc *models.Document) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Insert document
	query := `
		INSERT INTO documents (
			athlete_id, document_type, category_id, file_name, file_path, file_url, 
			file_size_bytes, mime_type, validation_status, expiry_date, notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, uploaded_at
	`
	err = tx.QueryRow(
		query,
		doc.AthleteID,
		doc.DocumentType,
		doc.CategoryID,
		doc.FileName,
		doc.FilePath,
		doc.FileURL,
		doc.FileSizeBytes,
		doc.MimeType,
		doc.ValidationStatus,
		doc.ExpiryDate,
		doc.Notes,
	).Scan(&doc.ID, &doc.UploadedAt)

	if err != nil {
		return err
	}

	// Insert tag relations if any
	if len(doc.Tags) > 0 {
		tagQuery := `
			INSERT INTO document_tag_relations (document_id, tag_id)
			VALUES ($1, $2)
		`
		for _, tag := range doc.Tags {
			_, err = tx.Exec(tagQuery, doc.ID, tag.ID)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

// CreateVersion creates a new version of a document
func (r *DocumentRepository) CreateVersion(version *models.DocumentVersion) error {
	query := `
        INSERT INTO document_versions (
            document_id, version_number, file_name, file_path, file_url,
            file_size_bytes, mime_type, notes, uploaded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, uploaded_at
    `
	return r.db.QueryRow(
		query,
		version.DocumentID,
		version.VersionNumber,
		version.FileName,
		version.FilePath,
		version.FileURL,
		version.FileSizeBytes,
		version.MimeType,
		version.Notes,
		version.UploadedBy,
	).Scan(&version.ID, &version.UploadedAt)
}

// GetVersionsByDocument returns all versions of a document
func (r *DocumentRepository) GetVersionsByDocument(documentID int) ([]*models.DocumentVersion, error) {
	query := `
        SELECT id, document_id, version_number, file_name, file_path, file_url,
               file_size_bytes, mime_type, notes, uploaded_by, uploaded_at
        FROM document_versions
        WHERE document_id = $1
        ORDER BY version_number DESC
    `

	rows, err := r.db.Query(query, documentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var versions []*models.DocumentVersion
	for rows.Next() {
		v := &models.DocumentVersion{}
		if err := rows.Scan(
			&v.ID, &v.DocumentID, &v.VersionNumber, &v.FileName, &v.FilePath, &v.FileURL,
			&v.FileSizeBytes, &v.MimeType, &v.Notes, &v.UploadedBy, &v.UploadedAt,
		); err != nil {
			return nil, err
		}
		versions = append(versions, v)
	}

	return versions, nil
}

// GetLatestVersionNumber returns the highest version number for a document
func (r *DocumentRepository) GetLatestVersionNumber(documentID int) (int, error) {
	query := `
        SELECT COALESCE(MAX(version_number), 0)
        FROM document_versions
        WHERE document_id = $1
    `

	var versionNumber int
	err := r.db.QueryRow(query, documentID).Scan(&versionNumber)
	if err != nil {
		return 0, err
	}

	return versionNumber, nil
}

// GetByAthlete returns documents for an athlete with categories and tags
func (r *DocumentRepository) GetByAthlete(athleteID int) ([]*models.Document, error) {
	query := `
		SELECT d.id, d.athlete_id, d.document_type, d.category_id, d.file_name, d.file_path, d.file_url,
		       d.validation_status, d.expiry_date, d.uploaded_at, d.notes, d.rejection_reason, d.mime_type,
			   c.id, c.name, c.description, c.color, c.created_at
		FROM documents d
		LEFT JOIN document_categories c ON d.category_id = c.id
		WHERE d.athlete_id = $1
		ORDER BY d.uploaded_at DESC
	`
	rows, err := r.db.Query(query, athleteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []*models.Document
	docMap := make(map[int]*models.Document)

	for rows.Next() {
		var doc models.Document
		var notes, rejectionReason, mimeType sql.NullString
		var categoryID sql.NullInt64
		var categoryName, categoryDescription, categoryColor sql.NullString
		var categoryCreatedAt sql.NullTime

		if err := rows.Scan(
			&doc.ID, &doc.AthleteID, &doc.DocumentType, &categoryID, &doc.FileName, &doc.FilePath, &doc.FileURL,
			&doc.ValidationStatus, &doc.ExpiryDate, &doc.UploadedAt, &notes, &rejectionReason, &mimeType,
			&categoryID, &categoryName, &categoryDescription, &categoryColor, &categoryCreatedAt,
		); err != nil {
			return nil, err
		}

		if notes.Valid {
			doc.Notes = notes.String
		}
		if rejectionReason.Valid {
			doc.RejectionReason = rejectionReason.String
		}
		if mimeType.Valid {
			doc.MimeType = mimeType.String
		}

		// Set category if exists
		if categoryID.Valid {
			doc.Category = &models.Category{
				ID:          int(categoryID.Int64),
				Name:        categoryName.String,
				Description: categoryDescription.String,
				Color:       categoryColor.String,
				CreatedAt:   categoryCreatedAt.Time,
			}
		}

		docs = append(docs, &doc)
		docMap[doc.ID] = &doc
	}

	// Load tags for all documents
	if len(docs) > 0 {
		docIDs := make([]int, 0, len(docs))
		for _, doc := range docs {
			docIDs = append(docIDs, doc.ID)
		}

		tags, err := r.GetTagsForDocuments(docIDs)
		if err != nil {
			return nil, err
		}

		for docID, docTags := range tags {
			if doc, exists := docMap[docID]; exists {
				doc.Tags = docTags
			}
		}
	}

	return docs, nil
}

// GetPending returns documents pending validation with categories and tags
func (r *DocumentRepository) GetPending() ([]*models.Document, error) {
	query := `
		SELECT d.id, d.athlete_id, d.document_type, d.category_id, d.file_name, d.file_path, d.file_url,
		       d.validation_status, d.expiry_date, d.uploaded_at, d.notes,
			   c.id, c.name, c.description, c.color, c.created_at
		FROM documents d
		LEFT JOIN document_categories c ON d.category_id = c.id
		WHERE d.validation_status = 'pending'
		ORDER BY d.uploaded_at ASC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []*models.Document
	docMap := make(map[int]*models.Document)

	for rows.Next() {
		var doc models.Document
		var notes sql.NullString
		var categoryID sql.NullInt64
		var categoryName, categoryDescription, categoryColor sql.NullString
		var categoryCreatedAt sql.NullTime

		if err := rows.Scan(
			&doc.ID, &doc.AthleteID, &doc.DocumentType, &categoryID, &doc.FileName, &doc.FilePath, &doc.FileURL,
			&doc.ValidationStatus, &doc.ExpiryDate, &doc.UploadedAt, &notes,
			&categoryID, &categoryName, &categoryDescription, &categoryColor, &categoryCreatedAt,
		); err != nil {
			return nil, err
		}

		if notes.Valid {
			doc.Notes = notes.String
		}

		// Set category if exists
		if categoryID.Valid {
			doc.Category = &models.Category{
				ID:          int(categoryID.Int64),
				Name:        categoryName.String,
				Description: categoryDescription.String,
				Color:       categoryColor.String,
				CreatedAt:   categoryCreatedAt.Time,
			}
		}

		docs = append(docs, &doc)
		docMap[doc.ID] = &doc
	}

	// Load tags for all documents
	if len(docs) > 0 {
		docIDs := make([]int, 0, len(docs))
		for _, doc := range docs {
			docIDs = append(docIDs, doc.ID)
		}

		tags, err := r.GetTagsForDocuments(docIDs)
		if err != nil {
			return nil, err
		}

		for docID, docTags := range tags {
			if doc, exists := docMap[docID]; exists {
				doc.Tags = docTags
			}
		}
	}

	return docs, nil
}

// GetExpiringDocuments returns documents that are expiring within the next 30 days
func (r *DocumentRepository) GetExpiringDocuments() ([]*models.Document, error) {
	query := `
		SELECT d.id, d.athlete_id, d.document_type, d.category_id, d.file_name, d.file_path, d.file_url,
		       d.validation_status, d.expiry_date, d.uploaded_at, d.notes, d.rejection_reason,
			   c.id, c.name, c.description, c.color, c.created_at
		FROM documents d
		LEFT JOIN document_categories c ON d.category_id = c.id
		WHERE d.expiry_date IS NOT NULL 
		AND d.expiry_date <= $1 
		AND d.expiry_date >= $2
		ORDER BY d.expiry_date ASC
	`

	now := time.Now()
	thirtyDaysFromNow := now.AddDate(0, 0, 30)

	rows, err := r.db.Query(query, thirtyDaysFromNow, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []*models.Document
	docMap := make(map[int]*models.Document)

	for rows.Next() {
		var doc models.Document
		var notes, rejectionReason sql.NullString
		var categoryID sql.NullInt64
		var categoryName, categoryDescription, categoryColor sql.NullString
		var categoryCreatedAt sql.NullTime

		if err := rows.Scan(
			&doc.ID, &doc.AthleteID, &doc.DocumentType, &categoryID, &doc.FileName, &doc.FilePath, &doc.FileURL,
			&doc.ValidationStatus, &doc.ExpiryDate, &doc.UploadedAt, &notes, &rejectionReason,
			&categoryID, &categoryName, &categoryDescription, &categoryColor, &categoryCreatedAt,
		); err != nil {
			return nil, err
		}

		if notes.Valid {
			doc.Notes = notes.String
		}
		if rejectionReason.Valid {
			doc.RejectionReason = rejectionReason.String
		}

		// Set category if exists
		if categoryID.Valid {
			doc.Category = &models.Category{
				ID:          int(categoryID.Int64),
				Name:        categoryName.String,
				Description: categoryDescription.String,
				Color:       categoryColor.String,
				CreatedAt:   categoryCreatedAt.Time,
			}
		}

		docs = append(docs, &doc)
		docMap[doc.ID] = &doc
	}

	// Load tags for all documents
	if len(docs) > 0 {
		docIDs := make([]int, 0, len(docs))
		for _, doc := range docs {
			docIDs = append(docIDs, doc.ID)
		}

		tags, err := r.GetTagsForDocuments(docIDs)
		if err != nil {
			return nil, err
		}

		for docID, docTags := range tags {
			if doc, exists := docMap[docID]; exists {
				doc.Tags = docTags
			}
		}
	}

	return docs, nil
}

// GetExpiredDocuments returns documents that have already expired
func (r *DocumentRepository) GetExpiredDocuments() ([]*models.Document, error) {
	query := `
		SELECT d.id, d.athlete_id, d.document_type, d.category_id, d.file_name, d.file_path, d.file_url,
		       d.validation_status, d.expiry_date, d.uploaded_at, d.notes, d.rejection_reason,
			   c.id, c.name, c.description, c.color, c.created_at
		FROM documents d
		LEFT JOIN document_categories c ON d.category_id = c.id
		WHERE d.expiry_date IS NOT NULL 
		AND d.expiry_date < $1
		ORDER BY d.expiry_date ASC
	`

	now := time.Now()

	rows, err := r.db.Query(query, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []*models.Document
	docMap := make(map[int]*models.Document)

	for rows.Next() {
		var doc models.Document
		var notes, rejectionReason sql.NullString
		var categoryID sql.NullInt64
		var categoryName, categoryDescription, categoryColor sql.NullString
		var categoryCreatedAt sql.NullTime

		if err := rows.Scan(
			&doc.ID, &doc.AthleteID, &doc.DocumentType, &categoryID, &doc.FileName, &doc.FilePath, &doc.FileURL,
			&doc.ValidationStatus, &doc.ExpiryDate, &doc.UploadedAt, &notes, &rejectionReason,
			&categoryID, &categoryName, &categoryDescription, &categoryColor, &categoryCreatedAt,
		); err != nil {
			return nil, err
		}

		if notes.Valid {
			doc.Notes = notes.String
		}
		if rejectionReason.Valid {
			doc.RejectionReason = rejectionReason.String
		}

		// Set category if exists
		if categoryID.Valid {
			doc.Category = &models.Category{
				ID:          int(categoryID.Int64),
				Name:        categoryName.String,
				Description: categoryDescription.String,
				Color:       categoryColor.String,
				CreatedAt:   categoryCreatedAt.Time,
			}
		}

		docs = append(docs, &doc)
		docMap[doc.ID] = &doc
	}

	// Load tags for all documents
	if len(docs) > 0 {
		docIDs := make([]int, 0, len(docs))
		for _, doc := range docs {
			docIDs = append(docIDs, doc.ID)
		}

		tags, err := r.GetTagsForDocuments(docIDs)
		if err != nil {
			return nil, err
		}

		for docID, docTags := range tags {
			if doc, exists := docMap[docID]; exists {
				doc.Tags = docTags
			}
		}
	}

	return docs, nil
}

// GetByID returns a document by ID with categories and tags
func (r *DocumentRepository) GetByID(id int) (*models.Document, error) {
	d := &models.Document{}
	query := `
		SELECT d.id, d.athlete_id, d.document_type, d.category_id, d.file_name, d.file_path, d.file_url,
		       d.validation_status, d.expiry_date, d.uploaded_at, d.notes, d.mime_type,
			   c.id, c.name, c.description, c.color, c.created_at
		FROM documents d
		LEFT JOIN document_categories c ON d.category_id = c.id
		WHERE d.id = $1
	`
	var notes sql.NullString
	var categoryID sql.NullInt64
	var categoryName, categoryDescription, categoryColor sql.NullString
	var categoryCreatedAt sql.NullTime

	err := r.db.QueryRow(query, id).Scan(
		&d.ID, &d.AthleteID, &d.DocumentType, &categoryID, &d.FileName, &d.FilePath, &d.FileURL,
		&d.ValidationStatus, &d.ExpiryDate, &d.UploadedAt, &notes, &d.MimeType,
		&categoryID, &categoryName, &categoryDescription, &categoryColor, &categoryCreatedAt,
	)
	if err != nil {
		return nil, err
	}

	if notes.Valid {
		d.Notes = notes.String
	}

	// Set category if exists
	if categoryID.Valid {
		d.Category = &models.Category{
			ID:          int(categoryID.Int64),
			Name:        categoryName.String,
			Description: categoryDescription.String,
			Color:       categoryColor.String,
			CreatedAt:   categoryCreatedAt.Time,
		}
	}

	// Load tags
	tags, err := r.GetTagsForDocument(id)
	if err != nil {
		return nil, err
	}
	d.Tags = tags

	return d, nil
}

// Delete removes a document by ID
func (r *DocumentRepository) Delete(id int) error {
	// First delete any shares
	_, err := r.db.Exec("DELETE FROM document_shares WHERE document_id = $1", id)
	if err != nil {
		// Ignore if table doesn't exist
	}

	// Delete any versions
	_, err = r.db.Exec("DELETE FROM document_versions WHERE document_id = $1", id)
	if err != nil {
		// Ignore if table doesn't exist
	}

	// Delete document tags
	_, err = r.db.Exec("DELETE FROM document_tags WHERE document_id = $1", id)
	if err != nil {
		// Ignore if table doesn't exist
	}

	// Finally delete the document
	result, err := r.db.Exec("DELETE FROM documents WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to delete document: %v", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("document not found")
	}

	return nil
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

// ShareDocument shares a document with another user
func (r *DocumentRepository) ShareDocument(share *models.DocumentShare) error {
	query := `
        INSERT INTO document_shares (
            document_id, shared_by, shared_with, permission_level, notes, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (document_id, shared_with) 
        DO UPDATE SET permission_level = $4, notes = $5, expires_at = $6
        RETURNING id, shared_at
    `
	return r.db.QueryRow(
		query,
		share.DocumentID,
		share.SharedBy,
		share.SharedWith,
		share.PermissionLevel,
		share.Notes,
		share.ExpiresAt,
	).Scan(&share.ID, &share.SharedAt)
}

// GetTagsForDocument returns all tags for a specific document
func (r *DocumentRepository) GetTagsForDocument(documentID int) ([]models.Tag, error) {
	query := `
		SELECT t.id, t.name, t.color, t.created_at
		FROM document_tags t
		JOIN document_tag_relations dtr ON t.id = dtr.tag_id
		WHERE dtr.document_id = $1
		ORDER BY t.name
	`

	rows, err := r.db.Query(query, documentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []models.Tag
	for rows.Next() {
		var tag models.Tag
		if err := rows.Scan(&tag.ID, &tag.Name, &tag.Color, &tag.CreatedAt); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}

	return tags, nil
}

// GetTagsForDocuments returns all tags for multiple documents
func (r *DocumentRepository) GetTagsForDocuments(documentIDs []int) (map[int][]models.Tag, error) {
	if len(documentIDs) == 0 {
		return make(map[int][]models.Tag), nil
	}

	query := `
		SELECT dtr.document_id, t.id, t.name, t.color, t.created_at
		FROM document_tags t
		JOIN document_tag_relations dtr ON t.id = dtr.tag_id
		WHERE dtr.document_id = ANY($1)
		ORDER BY t.name
	`

	rows, err := r.db.Query(query, pq.Array(documentIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[int][]models.Tag)
	for rows.Next() {
		var docID int
		var tag models.Tag
		if err := rows.Scan(&docID, &tag.ID, &tag.Name, &tag.Color, &tag.CreatedAt); err != nil {
			return nil, err
		}

		result[docID] = append(result[docID], tag)
	}

	return result, nil
}

// GetSharesByDocument returns all shares for a document
func (r *DocumentRepository) GetSharesByDocument(documentID int) ([]*models.DocumentShare, error) {
	query := `
        SELECT id, document_id, shared_by, shared_with, permission_level, notes, shared_at, expires_at
        FROM document_shares
        WHERE document_id = $1
        ORDER BY shared_at DESC
    `

	rows, err := r.db.Query(query, documentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shares []*models.DocumentShare
	for rows.Next() {
		s := &models.DocumentShare{}
		var notes sql.NullString
		var expiresAt sql.NullTime

		if err := rows.Scan(
			&s.ID, &s.DocumentID, &s.SharedBy, &s.SharedWith, &s.PermissionLevel,
			&notes, &s.SharedAt, &expiresAt,
		); err != nil {
			return nil, err
		}

		if notes.Valid {
			s.Notes = notes.String
		}

		if expiresAt.Valid {
			s.ExpiresAt = &expiresAt.Time
		}

		shares = append(shares, s)
	}

	return shares, nil
}

// GetSharedDocumentsForUser returns documents shared with a specific user
func (r *DocumentRepository) GetSharedDocumentsForUser(userID int) ([]*models.Document, error) {
	query := `
        SELECT d.id, d.athlete_id, d.document_type, d.category_id, d.file_name, d.file_path, d.file_url,
               d.validation_status, d.expiry_date, d.uploaded_at, d.notes, d.rejection_reason,
               c.id, c.name, c.description, c.color, c.created_at,
               ds.permission_level
        FROM documents d
        JOIN document_shares ds ON d.id = ds.document_id
        LEFT JOIN document_categories c ON d.category_id = c.id
        WHERE ds.shared_with = $1
        ORDER BY ds.shared_at DESC
    `

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []*models.Document
	docMap := make(map[int]*models.Document)

	for rows.Next() {
		var doc models.Document
		var notes, rejectionReason sql.NullString
		var categoryID sql.NullInt64
		var categoryName, categoryDescription, categoryColor sql.NullString
		var categoryCreatedAt sql.NullTime
		var permissionLevel sql.NullString

		if err := rows.Scan(
			&doc.ID, &doc.AthleteID, &doc.DocumentType, &categoryID, &doc.FileName, &doc.FilePath, &doc.FileURL,
			&doc.ValidationStatus, &doc.ExpiryDate, &doc.UploadedAt, &notes, &rejectionReason,
			&categoryID, &categoryName, &categoryDescription, &categoryColor, &categoryCreatedAt,
			&permissionLevel,
		); err != nil {
			return nil, err
		}

		if notes.Valid {
			doc.Notes = notes.String
		}
		if rejectionReason.Valid {
			doc.RejectionReason = rejectionReason.String
		}

		// Set category if exists
		if categoryID.Valid {
			doc.Category = &models.Category{
				ID:          int(categoryID.Int64),
				Name:        categoryName.String,
				Description: categoryDescription.String,
				Color:       categoryColor.String,
				CreatedAt:   categoryCreatedAt.Time,
			}
		}

		docs = append(docs, &doc)
		docMap[doc.ID] = &doc
	}

	// Load tags for all documents
	if len(docs) > 0 {
		docIDs := make([]int, 0, len(docs))
		for _, doc := range docs {
			docIDs = append(docIDs, doc.ID)
		}

		tags, err := r.GetTagsForDocuments(docIDs)
		if err != nil {
			return nil, err
		}

		for docID, docTags := range tags {
			if doc, exists := docMap[docID]; exists {
				doc.Tags = docTags
			}
		}
	}

	return docs, nil
}

// UnshareDocument removes a document share
func (r *DocumentRepository) UnshareDocument(documentID, userID int) error {
	query := `
        DELETE FROM document_shares
        WHERE document_id = $1 AND shared_with = $2
    `
	_, err := r.db.Exec(query, documentID, userID)
	return err
}

// GetAllCategories returns all document categories
func (r *DocumentRepository) GetAllCategories() ([]*models.Category, error) {
	query := `
		SELECT id, name, description, color, created_at
		FROM document_categories
		ORDER BY name
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []*models.Category
	for rows.Next() {
		var category models.Category
		if err := rows.Scan(&category.ID, &category.Name, &category.Description, &category.Color, &category.CreatedAt); err != nil {
			return nil, err
		}
		categories = append(categories, &category)
	}

	return categories, nil
}

// GetAllTags returns all document tags
func (r *DocumentRepository) GetAllTags() ([]*models.Tag, error) {
	query := `
		SELECT id, name, color, created_at
		FROM document_tags
		ORDER BY name
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []*models.Tag
	for rows.Next() {
		var tag models.Tag
		if err := rows.Scan(&tag.ID, &tag.Name, &tag.Color, &tag.CreatedAt); err != nil {
			return nil, err
		}
		tags = append(tags, &tag)
	}

	return tags, nil
}

// SearchDocuments searches documents with advanced filters
func (r *DocumentRepository) SearchDocuments(filters map[string]interface{}) ([]*models.Document, error) {
	// Build dynamic query based on filters
	query := `
        SELECT d.id, d.athlete_id, d.document_type, d.category_id, d.file_name, d.file_path, d.file_url,
               d.validation_status, d.expiry_date, d.uploaded_at, d.notes, d.rejection_reason,
               c.id, c.name, c.description, c.color, c.created_at
        FROM documents d
        LEFT JOIN document_categories c ON d.category_id = c.id
    `

	whereClauses := []string{}
	args := []interface{}{}
	argIndex := 1

	// Add filters
	if athleteID, ok := filters["athlete_id"]; ok {
		whereClauses = append(whereClauses, fmt.Sprintf("d.athlete_id = $%d", argIndex))
		args = append(args, athleteID)
		argIndex++
	}

	if docType, ok := filters["document_type"]; ok {
		whereClauses = append(whereClauses, fmt.Sprintf("d.document_type = $%d", argIndex))
		args = append(args, docType)
		argIndex++
	}

	if categoryID, ok := filters["category_id"]; ok && categoryID != "all" {
		whereClauses = append(whereClauses, fmt.Sprintf("d.category_id = $%d", argIndex))
		args = append(args, categoryID)
		argIndex++
	}

	if status, ok := filters["status"]; ok && status != "all" {
		whereClauses = append(whereClauses, fmt.Sprintf("d.validation_status = $%d", argIndex))
		args = append(args, status)
		argIndex++
	}

	if search, ok := filters["search"]; ok && search != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("(d.file_name ILIKE $%d OR d.notes ILIKE $%d)", argIndex, argIndex))
		args = append(args, "%"+search.(string)+"%")
		argIndex++
	}

	if tagIDs, ok := filters["tag_ids"]; ok {
		if tagIDList, ok := tagIDs.([]int); ok && len(tagIDList) > 0 {
			// Create placeholders for tag IDs
			placeholders := make([]string, len(tagIDList))
			for i, tagID := range tagIDList {
				placeholders[i] = fmt.Sprintf("$%d", argIndex+i)
				args = append(args, tagID)
			}
			argIndex += len(tagIDList)

			// Join with tag relations to find documents with ANY of the specified tags
			query += " LEFT JOIN document_tag_relations dtr ON d.id = dtr.document_id"
			whereClauses = append(whereClauses, fmt.Sprintf("dtr.tag_id IN (%s)", strings.Join(placeholders, ",")))
		}
	}

	// Add WHERE clause if we have conditions
	if len(whereClauses) > 0 {
		query += " WHERE " + strings.Join(whereClauses, " AND ")
	}

	// Add ordering
	orderBy := "d.uploaded_at DESC"
	if sort, ok := filters["sort"]; ok {
		switch sort {
		case "name_asc":
			orderBy = "d.file_name ASC"
		case "name_desc":
			orderBy = "d.file_name DESC"
		case "date_asc":
			orderBy = "d.uploaded_at ASC"
		case "date_desc":
			orderBy = "d.uploaded_at DESC"
		case "expiry_asc":
			orderBy = "d.expiry_date ASC NULLS LAST"
		case "expiry_desc":
			orderBy = "d.expiry_date DESC NULLS LAST"
		}
	}
	query += " ORDER BY " + orderBy

	// Add limit if specified
	if limit, ok := filters["limit"]; ok {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []*models.Document
	docMap := make(map[int]*models.Document)

	for rows.Next() {
		var doc models.Document
		var notes, rejectionReason sql.NullString
		var categoryID sql.NullInt64
		var categoryName, categoryDescription, categoryColor sql.NullString
		var categoryCreatedAt sql.NullTime

		if err := rows.Scan(
			&doc.ID, &doc.AthleteID, &doc.DocumentType, &categoryID, &doc.FileName, &doc.FilePath, &doc.FileURL,
			&doc.ValidationStatus, &doc.ExpiryDate, &doc.UploadedAt, &notes, &rejectionReason,
			&categoryID, &categoryName, &categoryDescription, &categoryColor, &categoryCreatedAt,
		); err != nil {
			return nil, err
		}

		if notes.Valid {
			doc.Notes = notes.String
		}
		if rejectionReason.Valid {
			doc.RejectionReason = rejectionReason.String
		}

		// Set category if exists
		if categoryID.Valid {
			doc.Category = &models.Category{
				ID:          int(categoryID.Int64),
				Name:        categoryName.String,
				Description: categoryDescription.String,
				Color:       categoryColor.String,
				CreatedAt:   categoryCreatedAt.Time,
			}
		}

		docs = append(docs, &doc)
		docMap[doc.ID] = &doc
	}

	// Load tags for all documents
	if len(docs) > 0 {
		docIDs := make([]int, 0, len(docs))
		for _, doc := range docs {
			docIDs = append(docIDs, doc.ID)
		}

		tags, err := r.GetTagsForDocuments(docIDs)
		if err != nil {
			return nil, err
		}

		for docID, docTags := range tags {
			if doc, exists := docMap[docID]; exists {
				doc.Tags = docTags
			}
		}
	}

	return docs, nil
}
