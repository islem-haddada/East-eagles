package models

import "time"

type TrainingSchedule struct {
	ID              int       `json:"id"`
	DayOfWeek       string    `json:"day_of_week"`
	StartTime       string    `json:"start_time"` // HH:MM
	DurationMinutes int       `json:"duration_minutes"`
	Title           string    `json:"title"`
	Location        string    `json:"location"`
	Description     string    `json:"description"`
	CreatedAt       time.Time `json:"created_at"`
}

type CreateScheduleRequest struct {
	DayOfWeek       string `json:"day_of_week"`
	StartTime       string `json:"start_time"`
	DurationMinutes int    `json:"duration_minutes"`
	Title           string `json:"title"`
	Location        string `json:"location"`
	Description     string `json:"description"`
}
