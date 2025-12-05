package repository

import (
	"beautiful-minds/backend/project/internal/models"
	"database/sql"
	"fmt"
)

type AthleteRepository struct {
	db *sql.DB
}

func NewAthleteRepository(db *sql.DB) *AthleteRepository {
	return &AthleteRepository{db: db}
}

// GetAll returns all athletes
func (r *AthleteRepository) GetAll() ([]models.Athlete, error) {
	query := `
		SELECT id, first_name, last_name, email, phone, student_id, 
		       field_of_study, registration_date, is_active, created_at,
		       birth_date, weight, height, gender, address,
		       belt_level, experience_years, previous_martial_arts,
		       emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
		       approval_status, approved_by, approved_at, rejection_reason,
		       medical_conditions, allergies, blood_type
		FROM athletes
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var athletes []models.Athlete
	for rows.Next() {
		var a models.Athlete
		err := rows.Scan(
			&a.ID, &a.FirstName, &a.LastName, &a.Email, &a.Phone,
			&a.StudentID, &a.FieldOfStudy, &a.RegistrationDate,
			&a.IsActive, &a.CreatedAt,
			&a.BirthDate, &a.Weight, &a.Height, &a.Gender, &a.Address,
			&a.BeltLevel, &a.ExperienceYears, &a.PreviousMartialArts,
			&a.EmergencyContactName, &a.EmergencyContactPhone, &a.EmergencyContactRelation,
			&a.ApprovalStatus, &a.ApprovedBy, &a.ApprovedAt, &a.RejectionReason,
			&a.MedicalConditions, &a.Allergies, &a.BloodType,
		)
		if err != nil {
			return nil, err
		}
		athletes = append(athletes, a)
	}

	return athletes, nil
}

// GetPending returns athletes pending approval
func (r *AthleteRepository) GetPending() ([]models.Athlete, error) {
	query := `
		SELECT id, first_name, last_name, email, phone, student_id, 
		       field_of_study, registration_date, is_active, created_at,
		       birth_date, weight, height, gender, address,
		       belt_level, experience_years, previous_martial_arts,
		       emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
		       approval_status, approved_by, approved_at, rejection_reason,
		       medical_conditions, allergies, blood_type
		FROM athletes
		WHERE approval_status = 'pending'
		ORDER BY created_at ASC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var athletes []models.Athlete
	for rows.Next() {
		var a models.Athlete
		err := rows.Scan(
			&a.ID, &a.FirstName, &a.LastName, &a.Email, &a.Phone,
			&a.StudentID, &a.FieldOfStudy, &a.RegistrationDate,
			&a.IsActive, &a.CreatedAt,
			&a.BirthDate, &a.Weight, &a.Height, &a.Gender, &a.Address,
			&a.BeltLevel, &a.ExperienceYears, &a.PreviousMartialArts,
			&a.EmergencyContactName, &a.EmergencyContactPhone, &a.EmergencyContactRelation,
			&a.ApprovalStatus, &a.ApprovedBy, &a.ApprovedAt, &a.RejectionReason,
			&a.MedicalConditions, &a.Allergies, &a.BloodType,
		)
		if err != nil {
			return nil, err
		}
		athletes = append(athletes, a)
	}

	return athletes, nil
}

// GetByID returns athlete by ID
func (r *AthleteRepository) GetByID(id int) (*models.Athlete, error) {
	query := `
		SELECT id, first_name, last_name, email, phone, student_id,
		       field_of_study, registration_date, is_active, created_at,
		       birth_date, weight, height, gender, address,
		       belt_level, experience_years, previous_martial_arts,
		       emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
		       approval_status, approved_by, approved_at, rejection_reason,
		       medical_conditions, allergies, blood_type
		FROM athletes WHERE id = $1
	`

	var a models.Athlete
	err := r.db.QueryRow(query, id).Scan(
		&a.ID, &a.FirstName, &a.LastName, &a.Email, &a.Phone,
		&a.StudentID, &a.FieldOfStudy, &a.RegistrationDate,
		&a.IsActive, &a.CreatedAt,
		&a.BirthDate, &a.Weight, &a.Height, &a.Gender, &a.Address,
		&a.BeltLevel, &a.ExperienceYears, &a.PreviousMartialArts,
		&a.EmergencyContactName, &a.EmergencyContactPhone, &a.EmergencyContactRelation,
		&a.ApprovalStatus, &a.ApprovedBy, &a.ApprovedAt, &a.RejectionReason,
		&a.MedicalConditions, &a.Allergies, &a.BloodType,
	)

	if err != nil {
		return nil, err
	}

	return &a, nil
}

// Create creates new athlete
func (r *AthleteRepository) Create(req *models.CreateAthleteRequest) (*models.Athlete, error) {
	query := `
		INSERT INTO athletes (
			first_name, last_name, email, phone,
			birth_date, weight, height, gender, address,
			belt_level, experience_years, previous_martial_arts,
			emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
			medical_conditions, allergies, blood_type,
			approval_status
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'pending')
		RETURNING id, first_name, last_name, email, phone, student_id,
		          field_of_study, registration_date, is_active, created_at,
		          approval_status
	`

	var a models.Athlete
	err := r.db.QueryRow(
		query,
		req.FirstName, req.LastName, req.Email, req.Phone,
		req.BirthDate, req.Weight, req.Height, req.Gender, req.Address,
		req.BeltLevel, req.ExperienceYears, req.PreviousMartialArts,
		req.EmergencyContactName, req.EmergencyContactPhone, req.EmergencyContactRelation,
		req.MedicalConditions, req.Allergies, req.BloodType,
	).Scan(
		&a.ID, &a.FirstName, &a.LastName, &a.Email, &a.Phone,
		&a.StudentID, &a.FieldOfStudy, &a.RegistrationDate,
		&a.IsActive, &a.CreatedAt, &a.ApprovalStatus,
	)

	if err != nil {
		return nil, err
	}

	return &a, nil
}

// Approve approves an athlete
func (r *AthleteRepository) Approve(athleteID int, adminID int) error {
	query := `
		UPDATE athletes
		SET approval_status = 'approved',
		    approved_by = $1,
		    approved_at = NOW()
		WHERE id = $2
	`

	result, err := r.db.Exec(query, adminID, athleteID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("athlete not found")
	}

	return nil
}

// Reject rejects an athlete
func (r *AthleteRepository) Reject(athleteID int, adminID int, reason string) error {
	query := `
		UPDATE athletes
		SET approval_status = 'rejected',
		    approved_by = $1,
		    approved_at = NOW(),
		    rejection_reason = $2
		WHERE id = $3
	`

	result, err := r.db.Exec(query, adminID, reason, athleteID)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return fmt.Errorf("athlete not found")
	}

	return nil
}

// Delete removes an athlete by ID
func (r *AthleteRepository) Delete(id int) error {
	query := `DELETE FROM athletes WHERE id = $1`
	result, err := r.db.Exec(query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}

// Update updates an athlete
func (r *AthleteRepository) Update(id int, req *models.CreateAthleteRequest) (*models.Athlete, error) {
	query := `
		UPDATE athletes
		SET first_name = $1, last_name = $2, email = $3, phone = $4,
		    birth_date = $5, weight = $6, height = $7, gender = $8, address = $9,
		    belt_level = $10, experience_years = $11, previous_martial_arts = $12,
		    emergency_contact_name = $13, emergency_contact_phone = $14, emergency_contact_relation = $15,
		    medical_conditions = $16, allergies = $17, blood_type = $18
		WHERE id = $19
		RETURNING id, first_name, last_name, email, phone, registration_date, is_active, created_at
	`

	var a models.Athlete
	err := r.db.QueryRow(
		query,
		req.FirstName, req.LastName, req.Email, req.Phone,
		req.BirthDate, req.Weight, req.Height, req.Gender, req.Address,
		req.BeltLevel, req.ExperienceYears, req.PreviousMartialArts,
		req.EmergencyContactName, req.EmergencyContactPhone, req.EmergencyContactRelation,
		req.MedicalConditions, req.Allergies, req.BloodType,
		id,
	).Scan(
		&a.ID, &a.FirstName, &a.LastName, &a.Email, &a.Phone,
		&a.RegistrationDate, &a.IsActive, &a.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &a, nil
}

// Search filters athletes by name or email
func (r *AthleteRepository) Search(query string) ([]models.Athlete, error) {
	searchQuery := `
		SELECT id, first_name, last_name, email, phone, student_id,
		       field_of_study, registration_date, is_active, created_at,
		       approval_status
		FROM athletes
		WHERE LOWER(first_name) LIKE LOWER($1) 
		   OR LOWER(last_name) LIKE LOWER($1)
		   OR LOWER(email) LIKE LOWER($1)
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(searchQuery, "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var athletes []models.Athlete
	for rows.Next() {
		var a models.Athlete
		err := rows.Scan(
			&a.ID, &a.FirstName, &a.LastName, &a.Email, &a.Phone,
			&a.StudentID, &a.FieldOfStudy, &a.RegistrationDate,
			&a.IsActive, &a.CreatedAt, &a.ApprovalStatus,
		)
		if err != nil {
			return nil, err
		}
		athletes = append(athletes, a)
	}

	return athletes, nil
}

// GetStats returns statistics about athletes
func (r *AthleteRepository) GetStats() (*models.AthleteStats, error) {
	query := `
		SELECT 
			COUNT(*) as total,
			COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending,
			COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
			COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected,
			COUNT(CASE WHEN is_active = true AND approval_status = 'approved' THEN 1 END) as active
		FROM athletes
	`

	var stats models.AthleteStats
	err := r.db.QueryRow(query).Scan(
		&stats.TotalAthletes,
		&stats.PendingApprovals,
		&stats.ApprovedAthletes,
		&stats.RejectedAthletes,
		&stats.ActiveAthletes,
	)

	if err != nil {
		return nil, err
	}

	return &stats, nil
}
