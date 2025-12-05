package repository

import (
	"beautiful-minds/backend/project/internal/models"
	"database/sql"
)

type MemberRepository struct {
	db *sql.DB
}

func NewMemberRepository(db *sql.DB) *MemberRepository {
	return &MemberRepository{db: db}
}

func (r *MemberRepository) GetAll() ([]models.Member, error) {
	query := `
		SELECT id, first_name, last_name, email, phone, student_id, 
		       field_of_study, registration_date, is_active, created_at
		FROM members
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []models.Member
	for rows.Next() {
		var m models.Member
		err := rows.Scan(
			&m.ID, &m.FirstName, &m.LastName, &m.Email, &m.Phone,
			&m.StudentID, &m.FieldOfStudy, &m.RegistrationDate,
			&m.IsActive, &m.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		members = append(members, m)
	}

	return members, nil
}

func (r *MemberRepository) GetByID(id int) (*models.Member, error) {
	query := `
		SELECT id, first_name, last_name, email, phone, student_id,
		       field_of_study, registration_date, is_active, created_at
		FROM members WHERE id = $1
	`

	var m models.Member
	err := r.db.QueryRow(query, id).Scan(
		&m.ID, &m.FirstName, &m.LastName, &m.Email, &m.Phone,
		&m.StudentID, &m.FieldOfStudy, &m.RegistrationDate,
		&m.IsActive, &m.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &m, nil
}

func (r *MemberRepository) Create(req *models.CreateMemberRequest) (*models.Member, error) {
	query := `
		INSERT INTO members (first_name, last_name, email, phone, student_id, field_of_study)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, first_name, last_name, email, phone, student_id, 
		          field_of_study, registration_date, is_active, created_at
	`

	var m models.Member
	err := r.db.QueryRow(
		query, req.FirstName, req.LastName, req.Email,
		req.Phone, req.StudentID, req.FieldOfStudy,
	).Scan(
		&m.ID, &m.FirstName, &m.LastName, &m.Email, &m.Phone,
		&m.StudentID, &m.FieldOfStudy, &m.RegistrationDate,
		&m.IsActive, &m.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &m, nil
}

// Delete removes a member by ID
func (r *MemberRepository) Delete(id int) error {
	query := `DELETE FROM members WHERE id = $1`
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

// Update updates a member
func (r *MemberRepository) Update(id int, req *models.CreateMemberRequest) (*models.Member, error) {
	query := `
		UPDATE members
		SET first_name = $1, last_name = $2, email = $3, phone = $4, 
		    student_id = $5, field_of_study = $6
		WHERE id = $7
		RETURNING id, first_name, last_name, email, phone, student_id, 
		          field_of_study, registration_date, is_active, created_at
	`

	var m models.Member
	err := r.db.QueryRow(
		query, req.FirstName, req.LastName, req.Email, req.Phone,
		req.StudentID, req.FieldOfStudy, id,
	).Scan(
		&m.ID, &m.FirstName, &m.LastName, &m.Email, &m.Phone,
		&m.StudentID, &m.FieldOfStudy, &m.RegistrationDate,
		&m.IsActive, &m.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &m, nil
}

// Search filters members by name or email
func (r *MemberRepository) Search(query string) ([]models.Member, error) {
	searchQuery := `
		SELECT id, first_name, last_name, email, phone, student_id, 
		       field_of_study, registration_date, is_active, created_at
		FROM members
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

	var members []models.Member
	for rows.Next() {
		var m models.Member
		err := rows.Scan(
			&m.ID, &m.FirstName, &m.LastName, &m.Email, &m.Phone,
			&m.StudentID, &m.FieldOfStudy, &m.RegistrationDate,
			&m.IsActive, &m.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		members = append(members, m)
	}

	return members, nil
}
