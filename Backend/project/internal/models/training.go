package models

import "time"

// TrainingSession represents a training session
type TrainingSession struct {
	ID              int       `json:"id"`
	Title           string    `json:"title"`
	Description     string    `json:"description"`
	SessionDate     time.Time `json:"session_date"`
	DurationMinutes int       `json:"duration_minutes"`
	Location        string    `json:"location"`
	CoachID         *int      `json:"coach_id"`
	MaxParticipants int       `json:"max_participants"`
	Level           string    `json:"level"` // 'beginner', 'intermediate', 'advanced', 'all'
	CreatedAt       time.Time `json:"created_at"`
}

// CreateTrainingSessionRequest for creating training sessions
type CreateTrainingSessionRequest struct {
	Title           string `json:"title"`
	Description     string `json:"description"`
	SessionDate     string `json:"session_date"` // Format: YYYY-MM-DD HH:MM
	DurationMinutes int    `json:"duration_minutes"`
	Location        string `json:"location"`
	MaxParticipants int    `json:"max_participants"`
	Level           string `json:"level"`
}

// Attendance represents athlete attendance at training
type Attendance struct {
	ID                int       `json:"id"`
	TrainingSessionID int       `json:"training_session_id"`
	AthleteID         int       `json:"athlete_id"`
	Attended          bool      `json:"attended"`
	Notes             string    `json:"notes"`
	CreatedAt         time.Time `json:"created_at"`
}

// MarkAttendanceRequest for marking attendance
type MarkAttendanceRequest struct {
	TrainingSessionID int    `json:"training_session_id"`
	AthleteID         int    `json:"athlete_id"`
	Attended          bool   `json:"attended"`
	Notes             string `json:"notes"`
}
