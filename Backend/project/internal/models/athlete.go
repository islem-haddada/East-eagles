package models

import "time"

// Athlete represents an athlete/member of the Sanda club
type Athlete struct {
	ID               int       `json:"id"`
	FirstName        string    `json:"first_name"`
	LastName         string    `json:"last_name"`
	Email            string    `json:"email"`
	Phone            string    `json:"phone"`
	StudentID        string    `json:"student_id"`
	FieldOfStudy     string    `json:"field_of_study"` // Kept for backwards compatibility
	RegistrationDate time.Time `json:"registration_date"`
	IsActive         bool      `json:"is_active"`
	CreatedAt        time.Time `json:"created_at"`
	ProfileImage     string    `json:"profile_image"`

	// Personal & Physical Info
	BirthDate *time.Time `json:"birth_date"`
	Weight    *float64   `json:"weight"` // kg
	Height    *float64   `json:"height"` // cm
	Gender    string     `json:"gender"`
	Address   string     `json:"address"`

	// Sport-Specific Info
	BeltLevel           string `json:"belt_level"`
	ExperienceYears     int    `json:"experience_years"`
	PreviousMartialArts string `json:"previous_martial_arts"`

	// Emergency Contact
	EmergencyContactName     string `json:"emergency_contact_name"`
	EmergencyContactPhone    string `json:"emergency_contact_phone"`
	EmergencyContactRelation string `json:"emergency_contact_relation"`

	// Approval Workflow
	ApprovalStatus  string     `json:"approval_status"` // 'pending', 'approved', 'rejected'
	ApprovedBy      *int       `json:"approved_by"`
	ApprovedAt      *time.Time `json:"approved_at"`
	RejectionReason string     `json:"rejection_reason"`

	// Medical Info
	MedicalConditions string `json:"medical_conditions"`
	Allergies         string `json:"allergies"`
	BloodType         string `json:"blood_type"`

	// Payment Status (computed from payments table)
	PaymentEndDate *string `json:"payment_end_date,omitempty"` // Last payment end date
	PaymentValid   *bool   `json:"payment_valid,omitempty"`    // Whether payment is currently valid
}

// CreateAthleteRequest for registration
type CreateAthleteRequest struct {
	// Basic Info
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Email        string `json:"email"`
	Phone        string `json:"phone"`
	ProfileImage string `json:"profile_image"`

	// Personal Info
	BirthDate string  `json:"birth_date"` // Format: YYYY-MM-DD
	Weight    float64 `json:"weight"`
	Height    float64 `json:"height"`
	Gender    string  `json:"gender"`
	Address   string  `json:"address"`

	// Sport Info
	BeltLevel           string `json:"belt_level"`
	ExperienceYears     int    `json:"experience_years"`
	PreviousMartialArts string `json:"previous_martial_arts"`

	// Emergency Contact
	EmergencyContactName     string `json:"emergency_contact_name"`
	EmergencyContactPhone    string `json:"emergency_contact_phone"`
	EmergencyContactRelation string `json:"emergency_contact_relation"`

	// Medical Info
	MedicalConditions string `json:"medical_conditions"`
	Allergies         string `json:"allergies"`
	BloodType         string `json:"blood_type"`
}

// ApprovalRequest for admin actions
type ApprovalRequest struct {
	Approved bool   `json:"approved"`
	Reason   string `json:"reason"` // Used for rejection
}

// AthleteStats for dashboard
type AthleteStats struct {
	TotalAthletes    int `json:"total_athletes"`
	PendingApprovals int `json:"pending_approvals"`
	ApprovedAthletes int `json:"approved_athletes"`
	RejectedAthletes int `json:"rejected_athletes"`
	ActiveAthletes   int `json:"active_athletes"`
}
