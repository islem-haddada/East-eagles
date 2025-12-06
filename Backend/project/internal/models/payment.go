package models

import "time"

type Payment struct {
	ID            int       `json:"id"`
	AthleteID     int       `json:"athlete_id"`
	Amount        float64   `json:"amount"`
	MonthsCovered int       `json:"months_covered"`
	StartDate     string    `json:"start_date"` // YYYY-MM-DD
	EndDate       string    `json:"end_date"`   // YYYY-MM-DD
	PaymentDate   time.Time `json:"payment_date"`
	Notes         string    `json:"notes"`
	RecordedBy    *int      `json:"recorded_by"`

	// Joined fields
	AthleteName string `json:"athlete_name,omitempty"`
}

type CreatePaymentRequest struct {
	AthleteID     int     `json:"athlete_id"`
	Amount        float64 `json:"amount"`
	MonthsCovered int     `json:"months_covered"`
	StartDate     string  `json:"start_date"` // YYYY-MM-DD
	Notes         string  `json:"notes"`
}
