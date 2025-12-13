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

// GetAll returns all athletes with payment status
func (r *AthleteRepository) GetAll() ([]models.Athlete, error) {
	query := `
		SELECT a.id, a.first_name, a.last_name, a.email, a.phone, 
		       COALESCE(a.address, ''), COALESCE(a.city, ''), COALESCE(a.postal_code, ''),
		       a.registration_date, a.is_active, a.created_at,
		       a.birth_date, COALESCE(a.gender, ''), COALESCE(a.nationality, ''),
		       a.weight, COALESCE(a.weight_category, ''), COALESCE(a.belt_level, ''), COALESCE(a.skill_level, ''), a.experience_years,
		       COALESCE(a.emergency_contact_name, ''), COALESCE(a.emergency_contact_phone, ''), COALESCE(a.emergency_contact_relation, ''),
		       a.membership_status, a.approved_by, a.approved_at, COALESCE(a.rejection_reason, ''),
		       COALESCE(a.medical_conditions, ''), COALESCE(a.allergies, ''), COALESCE(a.blood_type, ''), COALESCE(a.photo_url, ''),
		       p.end_date AS payment_end_date,
		       CASE 
		           WHEN p.end_date IS NULL THEN false
		           WHEN p.end_date >= CURRENT_DATE THEN true
		           ELSE false
		       END AS payment_valid
		FROM athletes a
		LEFT JOIN LATERAL (
		    SELECT end_date
		    FROM payments
		    WHERE athlete_id = a.id
		    ORDER BY end_date DESC
		    LIMIT 1
		) p ON true
		ORDER BY a.created_at DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var athletes []models.Athlete
	for rows.Next() {
		var a models.Athlete
		var paymentEndDate sql.NullString
		var paymentValid sql.NullBool

		err := rows.Scan(
			&a.ID, &a.FirstName, &a.LastName, &a.Email, &a.Phone,
			&a.Address, &a.City, &a.PostalCode,
			&a.RegistrationDate, &a.IsActive, &a.CreatedAt,
			&a.DateOfBirth, &a.Gender, &a.Nationality,
			&a.WeightKG, &a.WeightCategory, &a.BeltLevel, &a.SkillLevel, &a.YearsOfExperience,
			&a.EmergencyContactName, &a.EmergencyContactPhone, &a.EmergencyContactRelation,
			&a.MembershipStatus, &a.ApprovedBy, &a.ApprovedAt, &a.RejectionReason,
			&a.MedicalConditions, &a.Allergies, &a.BloodType, &a.PhotoURL,
			&paymentEndDate, &paymentValid,
		)
		if err != nil {
			return nil, err
		}

		// Set payment fields
		if paymentEndDate.Valid {
			a.PaymentEndDate = &paymentEndDate.String
		}
		if paymentValid.Valid {
			a.PaymentValid = &paymentValid.Bool
		}

		athletes = append(athletes, a)
	}

	return athletes, nil
}

// GetPending returns athletes pending approval
func (r *AthleteRepository) GetPending() ([]models.Athlete, error) {
	query := `
		SELECT id, first_name, last_name, email, phone, 
		       COALESCE(address, ''), COALESCE(city, ''), COALESCE(postal_code, ''),
		       registration_date, is_active, created_at,
		       birth_date, COALESCE(gender, ''), COALESCE(nationality, ''),
		       weight, COALESCE(weight_category, ''), COALESCE(belt_level, ''), COALESCE(skill_level, ''), experience_years,
		       COALESCE(emergency_contact_name, ''), COALESCE(emergency_contact_phone, ''), COALESCE(emergency_contact_relation, ''),
		       membership_status, approved_by, approved_at, COALESCE(rejection_reason, ''),
		       COALESCE(medical_conditions, ''), COALESCE(allergies, ''), COALESCE(blood_type, ''), COALESCE(photo_url, '')
		FROM athletes
		WHERE membership_status = 'pending'
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
			&a.Address, &a.City, &a.PostalCode,
			&a.RegistrationDate, &a.IsActive, &a.CreatedAt,
			&a.DateOfBirth, &a.Gender, &a.Nationality,
			&a.WeightKG, &a.WeightCategory, &a.BeltLevel, &a.SkillLevel, &a.YearsOfExperience,
			&a.EmergencyContactName, &a.EmergencyContactPhone, &a.EmergencyContactRelation,
			&a.MembershipStatus, &a.ApprovedBy, &a.ApprovedAt, &a.RejectionReason,
			&a.MedicalConditions, &a.Allergies, &a.BloodType, &a.PhotoURL,
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
		SELECT id, first_name, last_name, email, phone, 
		       COALESCE(address, ''), COALESCE(city, ''), COALESCE(postal_code, ''),
		       registration_date, is_active, created_at,
		       birth_date, COALESCE(gender, ''), COALESCE(nationality, ''),
		       weight, COALESCE(weight_category, ''), COALESCE(belt_level, ''), COALESCE(skill_level, ''), experience_years,
		       COALESCE(emergency_contact_name, ''), COALESCE(emergency_contact_phone, ''), COALESCE(emergency_contact_relation, ''),
		       membership_status, approved_by, approved_at, COALESCE(rejection_reason, ''),
		       COALESCE(medical_conditions, ''), COALESCE(allergies, ''), COALESCE(blood_type, ''), COALESCE(photo_url, '')
		FROM athletes WHERE id = $1
	`

	var a models.Athlete
	err := r.db.QueryRow(query, id).Scan(
		&a.ID, &a.FirstName, &a.LastName, &a.Email, &a.Phone,
		&a.Address, &a.City, &a.PostalCode,
		&a.RegistrationDate, &a.IsActive, &a.CreatedAt,
		&a.DateOfBirth, &a.Gender, &a.Nationality,
		&a.WeightKG, &a.WeightCategory, &a.BeltLevel, &a.SkillLevel, &a.YearsOfExperience,
		&a.EmergencyContactName, &a.EmergencyContactPhone, &a.EmergencyContactRelation,
		&a.MembershipStatus, &a.ApprovedBy, &a.ApprovedAt, &a.RejectionReason,
		&a.MedicalConditions, &a.Allergies, &a.BloodType, &a.PhotoURL,
	)

	if err != nil {
		return nil, err
	}

	return &a, nil
}

// GetByEmail returns athlete by email
func (r *AthleteRepository) GetByEmail(email string) (*models.Athlete, error) {
	query := `
		SELECT id, first_name, last_name, email, phone, 
		       COALESCE(address, ''), COALESCE(city, ''), COALESCE(postal_code, ''),
		       registration_date, is_active, created_at,
		       birth_date, COALESCE(gender, ''), COALESCE(nationality, ''),
		       weight, COALESCE(weight_category, ''), COALESCE(belt_level, ''), COALESCE(skill_level, ''), experience_years,
		       COALESCE(emergency_contact_name, ''), COALESCE(emergency_contact_phone, ''), COALESCE(emergency_contact_relation, ''),
		       membership_status, approved_by, approved_at, COALESCE(rejection_reason, ''),
		       COALESCE(medical_conditions, ''), COALESCE(allergies, ''), COALESCE(blood_type, ''), COALESCE(photo_url, '')
		FROM athletes WHERE email = $1
	`

	var a models.Athlete
	err := r.db.QueryRow(query, email).Scan(
		&a.ID, &a.FirstName, &a.LastName, &a.Email, &a.Phone,
		&a.Address, &a.City, &a.PostalCode,
		&a.RegistrationDate, &a.IsActive, &a.CreatedAt,
		&a.DateOfBirth, &a.Gender, &a.Nationality,
		&a.WeightKG, &a.WeightCategory, &a.BeltLevel, &a.SkillLevel, &a.YearsOfExperience,
		&a.EmergencyContactName, &a.EmergencyContactPhone, &a.EmergencyContactRelation,
		&a.MembershipStatus, &a.ApprovedBy, &a.ApprovedAt, &a.RejectionReason,
		&a.MedicalConditions, &a.Allergies, &a.BloodType, &a.PhotoURL,
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
			address, city, postal_code,
			birth_date, gender, nationality,
			weight, weight_category, belt_level, skill_level, experience_years,
			emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
			medical_conditions, allergies, blood_type,
			membership_status, photo_url
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8, '')::date, NULLIF($9, ''), $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'pending', $22)
		RETURNING id, first_name, last_name, email, phone, 
		          address, city, postal_code,
		          registration_date, is_active, created_at,
		          membership_status, COALESCE(photo_url, '')
	`

	var a models.Athlete
	err := r.db.QueryRow(
		query,
		req.FirstName, req.LastName, req.Email, req.Phone,
		req.Address, req.City, req.PostalCode,
		req.DateOfBirth, req.Gender, req.Nationality,
		req.WeightKG, req.WeightCategory, req.BeltLevel, req.SkillLevel, req.YearsOfExperience,
		req.EmergencyContactName, req.EmergencyContactPhone, req.EmergencyContactRelation,
		req.MedicalConditions, req.Allergies, req.BloodType,
		req.PhotoURL,
	).Scan(
		&a.ID, &a.FirstName, &a.LastName, &a.Email, &a.Phone,
		&a.Address, &a.City, &a.PostalCode,
		&a.RegistrationDate, &a.IsActive, &a.CreatedAt, &a.MembershipStatus, &a.PhotoURL,
	)

	if err != nil {
		fmt.Printf("Error creating athlete: %v\n", err)
		return nil, err
	}

	return &a, nil
}

// Approve approves an athlete
func (r *AthleteRepository) Approve(athleteID int, adminID int) error {
	query := `
		UPDATE athletes
		SET membership_status = 'approved',
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
		SET membership_status = 'rejected',
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
		    address = $5, city = $6, postal_code = $7,
		    birth_date = NULLIF($8, '')::date, 
		    gender = COALESCE(NULLIF($9, ''), gender),
		    nationality = $10,
		    weight = $11, weight_category = $12,
		    belt_level = NULLIF($13, ''), skill_level = NULLIF($14, ''), experience_years = $15,
		    emergency_contact_name = $16, emergency_contact_phone = $17, emergency_contact_relation = $18,
		    medical_conditions = NULLIF($19, ''), allergies = NULLIF($20, ''), blood_type = NULLIF($21, ''),
		    photo_url = COALESCE(NULLIF($23, ''), photo_url)
		WHERE id = $22
		RETURNING id, first_name, last_name, email, phone, 
		          COALESCE(address, ''), COALESCE(city, ''), COALESCE(postal_code, ''),
		          registration_date, is_active, created_at,
		          birth_date, COALESCE(gender, ''), COALESCE(nationality, ''),
		          weight, COALESCE(weight_category, ''), COALESCE(belt_level, ''), COALESCE(skill_level, ''), experience_years,
		          COALESCE(emergency_contact_name, ''), COALESCE(emergency_contact_phone, ''), COALESCE(emergency_contact_relation, ''),
		          membership_status, approved_by, approved_at, COALESCE(rejection_reason, ''),
		          COALESCE(medical_conditions, ''), COALESCE(allergies, ''), COALESCE(blood_type, ''), COALESCE(photo_url, '')
	`

	var a models.Athlete
	err := r.db.QueryRow(
		query,
		req.FirstName, req.LastName, req.Email, req.Phone,
		req.Address, req.City, req.PostalCode,
		req.DateOfBirth, req.Gender, req.Nationality,
		req.WeightKG, req.WeightCategory, req.BeltLevel, req.SkillLevel, req.YearsOfExperience,
		req.EmergencyContactName, req.EmergencyContactPhone, req.EmergencyContactRelation,
		req.MedicalConditions, req.Allergies, req.BloodType,
		id, req.PhotoURL,
	).Scan(
		&a.ID, &a.FirstName, &a.LastName, &a.Email, &a.Phone,
		&a.Address, &a.City, &a.PostalCode,
		&a.RegistrationDate, &a.IsActive, &a.CreatedAt,
		&a.DateOfBirth, &a.Gender, &a.Nationality,
		&a.WeightKG, &a.WeightCategory, &a.BeltLevel, &a.SkillLevel, &a.YearsOfExperience,
		&a.EmergencyContactName, &a.EmergencyContactPhone, &a.EmergencyContactRelation,
		&a.MembershipStatus, &a.ApprovedBy, &a.ApprovedAt, &a.RejectionReason,
		&a.MedicalConditions, &a.Allergies, &a.BloodType, &a.PhotoURL,
	)

	if err != nil {
		return nil, err
	}

	return &a, nil
}

// Search filters athletes by name or email
func (r *AthleteRepository) Search(query string) ([]models.Athlete, error) {
	searchQuery := `
		SELECT id, first_name, last_name, email, phone, 
		       COALESCE(address, ''), COALESCE(city, ''), COALESCE(postal_code, ''),
		       registration_date, is_active, created_at,
		       membership_status
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
			&a.Address, &a.City, &a.PostalCode,
			&a.RegistrationDate, &a.IsActive, &a.CreatedAt, &a.MembershipStatus,
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
			COUNT(CASE WHEN membership_status = 'pending' THEN 1 END) as pending,
			COUNT(CASE WHEN membership_status = 'approved' THEN 1 END) as approved,
			COUNT(CASE WHEN membership_status = 'rejected' THEN 1 END) as rejected,
			COUNT(CASE WHEN is_active = true AND membership_status = 'approved' THEN 1 END) as active
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
