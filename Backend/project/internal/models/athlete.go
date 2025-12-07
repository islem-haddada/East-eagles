package models

import "time"

// Athlete represents an athlete/member of the Sanda club
type Athlete struct {
	ID               int       `json:"id"`
	FirstName        string    `json:"first_name"`
	LastName         string    `json:"last_name"`
	Email            string    `json:"email"`
	Phone            string    `json:"phone"`
	Address          string    `json:"address"`
	City             string    `json:"city"`
	PostalCode       string    `json:"postal_code"`
	RegistrationDate time.Time `json:"registration_date"`
	IsActive         bool      `json:"is_active"`
	CreatedAt        time.Time `json:"created_at"`
	PhotoURL         string    `json:"photo_url"` // Was ProfileImage

	// Personal & Physical Info
	DateOfBirth *time.Time `json:"date_of_birth"` // Was BirthDate
	Gender      string     `json:"gender"`
	Nationality string     `json:"nationality"`
	WeightKG    *float64   `json:"weight_kg"` // Was Weight

	// Sanda Sport Specific
	WeightCategory    string `json:"weight_category"`
	BeltLevel         string `json:"belt_level"`
	SkillLevel        string `json:"skill_level"`
	YearsOfExperience int    `json:"years_of_experience"` // Was ExperienceYears

	// Emergency Contact
	EmergencyContactName     string `json:"emergency_contact_name"`
	EmergencyContactPhone    string `json:"emergency_contact_phone"`
	EmergencyContactRelation string `json:"emergency_contact_relation"`

	// Membership & Approval
	MembershipStatus string     `json:"membership_status"` // Was ApprovalStatus ('pending', 'approved', 'rejected', 'suspended', 'expired')
	ApprovedBy       *int       `json:"approved_by"`
	ApprovedAt       *time.Time `json:"approved_at"`
	RejectionReason  string     `json:"rejection_reason"`

	// Medical Info
	MedicalConditions string `json:"medical_conditions"`
	Allergies         string `json:"allergies"`
	BloodType         string `json:"blood_type"`

	// Payment Status (computed from payments table)
	PaymentEndDate *string `json:"payment_end_date,omitempty"`
	PaymentValid   *bool   `json:"payment_valid,omitempty"`
}

// CreateAthleteRequest for registration
type CreateAthleteRequest struct {
	// Basic Info
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Phone     string `json:"phone"`
	PhotoURL  string `json:"photo_url"`

	// Personal Info
	DateOfBirth string `json:"date_of_birth"` // Format: YYYY-MM-DD
	Gender      string `json:"gender"`
	Nationality string `json:"nationality"`
	Address     string `json:"address"`
	City        string `json:"city"`
	PostalCode  string `json:"postal_code"`

	// Physical Info
	WeightKG float64 `json:"weight_kg"`

	// Sport Info
	WeightCategory    string `json:"weight_category"`
	BeltLevel         string `json:"belt_level"`
	SkillLevel        string `json:"skill_level"`
	YearsOfExperience int    `json:"years_of_experience"`

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
