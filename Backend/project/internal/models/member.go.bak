package models

import (
	"fmt"
	"regexp"
	"strings"
	"time"
)

type Member struct {
	ID               int       `json:"id"`
	FirstName        string    `json:"first_name"`
	LastName         string    `json:"last_name"`
	Email            string    `json:"email"`
	Phone            string    `json:"phone"`
	StudentID        string    `json:"student_id"`
	FieldOfStudy     string    `json:"field_of_study"`
	RegistrationDate time.Time `json:"registration_date"`
	IsActive         bool      `json:"is_active"`
	CreatedAt        time.Time `json:"created_at"`
}

type CreateMemberRequest struct {
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Email        string `json:"email"`
	Phone        string `json:"phone"`
	StudentID    string `json:"student_id"`
	FieldOfStudy string `json:"field_of_study"`
}

// Validate checks all required fields and formats
func (r *CreateMemberRequest) Validate() error {
	// Trim whitespace
	r.FirstName = strings.TrimSpace(r.FirstName)
	r.LastName = strings.TrimSpace(r.LastName)
	r.Email = strings.TrimSpace(r.Email)
	r.Phone = strings.TrimSpace(r.Phone)
	r.StudentID = strings.TrimSpace(r.StudentID)
	r.FieldOfStudy = strings.TrimSpace(r.FieldOfStudy)

	// Check required fields
	if r.FirstName == "" {
		return fmt.Errorf("prénom est obligatoire")
	}
	if r.LastName == "" {
		return fmt.Errorf("nom est obligatoire")
	}
	if r.Email == "" {
		return fmt.Errorf("email est obligatoire")
	}

	// Validate email format
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(r.Email) {
		return fmt.Errorf("format d'email invalide")
	}

	// Validate phone format if provided
	if r.Phone != "" {
		phoneRegex := regexp.MustCompile(`^\+?[\d\s\-\(\)]{7,}$`)
		if !phoneRegex.MatchString(r.Phone) {
			return fmt.Errorf("format de téléphone invalide")
		}
	}

	// Check length constraints
	if len(r.FirstName) > 100 {
		return fmt.Errorf("prénom trop long (max 100 caractères)")
	}
	if len(r.LastName) > 100 {
		return fmt.Errorf("nom trop long (max 100 caractères)")
	}
	if len(r.Email) > 120 {
		return fmt.Errorf("email trop long (max 120 caractères)")
	}

	return nil
}
