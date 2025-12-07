package repository

import (
	"database/sql"
	"log"

	"beautiful-minds/backend/project/internal/models"
)

type ScheduleRepository struct {
	db *sql.DB
}

func NewScheduleRepository(db *sql.DB) *ScheduleRepository {
	return &ScheduleRepository{db: db}
}

func (r *ScheduleRepository) Create(req *models.CreateScheduleRequest) (*models.TrainingSchedule, error) {
	query := `
		INSERT INTO training_schedules (
			day_of_week, start_time, duration_minutes, title, location, description
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, day_of_week, start_time, duration_minutes, title, location, description, created_at
	`

	schedule := &models.TrainingSchedule{}
	var startTimeStr string

	err := r.db.QueryRow(
		query,
		req.DayOfWeek,
		req.StartTime,
		req.DurationMinutes,
		req.Title,
		req.Location,
		req.Description,
	).Scan(
		&schedule.ID,
		&schedule.DayOfWeek,
		&startTimeStr,
		&schedule.DurationMinutes,
		&schedule.Title,
		&schedule.Location,
		&schedule.Description,
		&schedule.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	// Format time to HH:MM
	// Handle different time formats
	// PostgreSQL TIME type might return different formats
	if len(startTimeStr) >= 8 && startTimeStr[2] == ':' && startTimeStr[5] == ':' {
		// Format is HH:MM:SS, extract HH:MM
		schedule.StartTime = startTimeStr[:5]
	} else if len(startTimeStr) >= 5 {
		// Format is already HH:MM or similar
		schedule.StartTime = startTimeStr[:5]
	} else {
		// Unexpected format, use as-is
		schedule.StartTime = startTimeStr
	}

	return schedule, nil
}

func (r *ScheduleRepository) GetAll() ([]*models.TrainingSchedule, error) {
	query := `SELECT id, day_of_week, start_time, duration_minutes, title, location, description, created_at FROM training_schedules ORDER BY day_of_week, start_time`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var schedules []*models.TrainingSchedule
	for rows.Next() {
		s := &models.TrainingSchedule{}
		var startTimeStr sql.NullString // Use NullString to handle potential NULL values
		if err := rows.Scan(
			&s.ID, &s.DayOfWeek, &startTimeStr, &s.DurationMinutes, &s.Title, &s.Location, &s.Description, &s.CreatedAt,
		); err != nil {
			return nil, err
		}

		// DEBUG: Log what we got from the database
		if startTimeStr.Valid {
			log.Printf("🔍 DEBUG GetAll - ID: %d, Raw start_time from DB: '%s', Length: %d, Valid: %t", s.ID, startTimeStr.String, len(startTimeStr.String), startTimeStr.Valid)
			
			// Handle different time formats
			// PostgreSQL TIME type might return different formats
			if len(startTimeStr.String) >= 8 && startTimeStr.String[2] == ':' && startTimeStr.String[5] == ':' {
				// Format is HH:MM:SS, extract HH:MM
				s.StartTime = startTimeStr.String[:5]
			} else if len(startTimeStr.String) >= 5 {
				// Format is already HH:MM or similar
				s.StartTime = startTimeStr.String[:5]
			} else {
				// Unexpected format, use as-is
				s.StartTime = startTimeStr.String
			}
		} else {
			log.Printf("🔍 DEBUG GetAll - ID: %d, start_time is NULL", s.ID)
			s.StartTime = ""
		}
		
		log.Printf("🔍 DEBUG GetAll - ID: %d, Final formatted start_time: '%s'", s.ID, s.StartTime)
		schedules = append(schedules, s)
	}
	return schedules, nil
}

func (r *ScheduleRepository) Delete(id int) error {
	query := `DELETE FROM training_schedules WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *ScheduleRepository) Update(id int, req *models.CreateScheduleRequest) (*models.TrainingSchedule, error) {
	query := `
		UPDATE training_schedules
		SET day_of_week = $1, start_time = $2, duration_minutes = $3, title = $4, location = $5, description = $6
		WHERE id = $7
		RETURNING id, day_of_week, start_time, duration_minutes, title, location, description, created_at
	`

	schedule := &models.TrainingSchedule{
		ID: id,
	}

	var startTimeStr string
	err := r.db.QueryRow(
		query,
		req.DayOfWeek,
		req.StartTime,
		req.DurationMinutes,
		req.Title,
		req.Location,
		req.Description,
		id,
	).Scan(
		&schedule.ID,
		&schedule.DayOfWeek,
		&startTimeStr,
		&schedule.DurationMinutes,
		&schedule.Title,
		&schedule.Location,
		&schedule.Description,
		&schedule.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	// Format time to HH:MM
	// Handle different time formats
	// PostgreSQL TIME type might return different formats
	if len(startTimeStr) >= 8 && startTimeStr[2] == ':' && startTimeStr[5] == ':' {
		// Format is HH:MM:SS, extract HH:MM
		schedule.StartTime = startTimeStr[:5]
	} else if len(startTimeStr) >= 5 {
		// Format is already HH:MM or similar
		schedule.StartTime = startTimeStr[:5]
	} else {
		// Unexpected format, use as-is
		schedule.StartTime = startTimeStr
	}

	return schedule, nil
}
