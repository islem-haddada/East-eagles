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
	if len(startTimeStr) >= 5 {
		schedule.StartTime = startTimeStr[:5]
	} else {
		schedule.StartTime = startTimeStr
	}

	return schedule, nil
}

func (r *ScheduleRepository) GetAll() ([]*models.TrainingSchedule, error) {
	query := `
		SELECT id, day_of_week, start_time, duration_minutes, title, location, description, created_at
		FROM training_schedules
		ORDER BY 
			CASE 
				WHEN day_of_week = 'Monday' THEN 1
				WHEN day_of_week = 'Tuesday' THEN 2
				WHEN day_of_week = 'Wednesday' THEN 3
				WHEN day_of_week = 'Thursday' THEN 4
				WHEN day_of_week = 'Friday' THEN 5
				WHEN day_of_week = 'Saturday' THEN 6
				WHEN day_of_week = 'Sunday' THEN 7
			END,
			start_time ASC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var schedules []*models.TrainingSchedule
	for rows.Next() {
		s := &models.TrainingSchedule{}
		var startTimeStr string // Scan time as string or []byte
		if err := rows.Scan(
			&s.ID, &s.DayOfWeek, &startTimeStr, &s.DurationMinutes, &s.Title, &s.Location, &s.Description, &s.CreatedAt,
		); err != nil {
			return nil, err
		}

		// DEBUG: Log what we got from the database
		log.Printf("🔍 DEBUG GetAll - ID: %d, Raw start_time from DB: '%s', Length: %d", s.ID, startTimeStr, len(startTimeStr))

		// startTimeStr might come as "18:00:00" from DB
		if len(startTimeStr) >= 5 {
			s.StartTime = startTimeStr[:5]
			log.Printf("🔍 DEBUG GetAll - ID: %d, Formatted start_time: '%s'", s.ID, s.StartTime)
		} else {
			s.StartTime = startTimeStr
			log.Printf("🔍 DEBUG GetAll - ID: %d, Using original start_time (too short): '%s'", s.ID, s.StartTime)
		}
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
	if len(startTimeStr) >= 5 {
		schedule.StartTime = startTimeStr[:5]
	} else {
		schedule.StartTime = startTimeStr
	}

	return schedule, nil
}
