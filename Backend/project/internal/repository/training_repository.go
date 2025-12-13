package repository

import (
	"database/sql"
	"time"

	"east-eagles/backend/internal/models"
)

type TrainingRepository struct {
	db *sql.DB
}

func NewTrainingRepository(db *sql.DB) *TrainingRepository {
	return &TrainingRepository{db: db}
}

// Create creates a new training session
func (r *TrainingRepository) Create(session *models.CreateTrainingSessionRequest, coachID int) (*models.TrainingSession, error) {
	query := `
		INSERT INTO training_sessions (
			title, description, session_date, duration_minutes, location, 
			coach_id, max_participants, level
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at
	`

	// Parse date string to time.Time
	// Assuming format "2006-01-02 15:04" from frontend
	sessionDate, err := time.Parse("2006-01-02 15:04", session.SessionDate)
	if err != nil {
		return nil, err
	}

	newSession := &models.TrainingSession{
		Title:           session.Title,
		Description:     session.Description,
		SessionDate:     sessionDate,
		DurationMinutes: session.DurationMinutes,
		Location:        session.Location,
		CoachID:         &coachID,
		MaxParticipants: session.MaxParticipants,
		Level:           session.Level,
	}

	err = r.db.QueryRow(
		query,
		newSession.Title,
		newSession.Description,
		newSession.SessionDate,
		newSession.DurationMinutes,
		newSession.Location,
		coachID,
		newSession.MaxParticipants,
		newSession.Level,
	).Scan(&newSession.ID, &newSession.CreatedAt)

	if err != nil {
		return nil, err
	}

	return newSession, nil
}

// GetAll returns all training sessions
func (r *TrainingRepository) GetAll() ([]*models.TrainingSession, error) {
	query := `
		SELECT id, title, description, session_date, duration_minutes, location, 
		       coach_id, max_participants, level, created_at
		FROM training_sessions
		ORDER BY session_date DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []*models.TrainingSession
	for rows.Next() {
		s := &models.TrainingSession{}
		if err := rows.Scan(
			&s.ID, &s.Title, &s.Description, &s.SessionDate, &s.DurationMinutes,
			&s.Location, &s.CoachID, &s.MaxParticipants, &s.Level, &s.CreatedAt,
		); err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

// GetUpcoming returns upcoming training sessions
func (r *TrainingRepository) GetUpcoming() ([]*models.TrainingSession, error) {
	query := `
		SELECT id, title, description, session_date, duration_minutes, location, 
		       coach_id, max_participants, level, created_at
		FROM training_sessions
		WHERE session_date >= CURRENT_TIMESTAMP
		ORDER BY session_date ASC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []*models.TrainingSession
	for rows.Next() {
		s := &models.TrainingSession{}
		if err := rows.Scan(
			&s.ID, &s.Title, &s.Description, &s.SessionDate, &s.DurationMinutes,
			&s.Location, &s.CoachID, &s.MaxParticipants, &s.Level, &s.CreatedAt,
		); err != nil {
			return nil, err
		}
		sessions = append(sessions, s)
	}
	return sessions, nil
}

// GetByID returns a training session by ID
func (r *TrainingRepository) GetByID(id int) (*models.TrainingSession, error) {
	s := &models.TrainingSession{}
	query := `
		SELECT id, title, description, session_date, duration_minutes, location, 
		       coach_id, max_participants, level, created_at
		FROM training_sessions
		WHERE id = $1
	`
	err := r.db.QueryRow(query, id).Scan(
		&s.ID, &s.Title, &s.Description, &s.SessionDate, &s.DurationMinutes,
		&s.Location, &s.CoachID, &s.MaxParticipants, &s.Level, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return s, nil
}

// Update updates a training session
func (r *TrainingRepository) Update(id int, session *models.CreateTrainingSessionRequest) (*models.TrainingSession, error) {
	sessionDate, err := time.Parse("2006-01-02 15:04", session.SessionDate)
	if err != nil {
		return nil, err
	}

	query := `
		UPDATE training_sessions
		SET title = $1, description = $2, session_date = $3, duration_minutes = $4,
		    location = $5, max_participants = $6, level = $7
		WHERE id = $8
		RETURNING id, coach_id, created_at
	`

	updatedSession := &models.TrainingSession{
		ID:              id,
		Title:           session.Title,
		Description:     session.Description,
		SessionDate:     sessionDate,
		DurationMinutes: session.DurationMinutes,
		Location:        session.Location,
		MaxParticipants: session.MaxParticipants,
		Level:           session.Level,
	}

	err = r.db.QueryRow(
		query,
		updatedSession.Title,
		updatedSession.Description,
		updatedSession.SessionDate,
		updatedSession.DurationMinutes,
		updatedSession.Location,
		updatedSession.MaxParticipants,
		updatedSession.Level,
		id,
	).Scan(&updatedSession.ID, &updatedSession.CoachID, &updatedSession.CreatedAt)

	if err != nil {
		return nil, err
	}

	return updatedSession, nil
}

// Delete deletes a training session
func (r *TrainingRepository) Delete(id int) error {
	query := `DELETE FROM training_sessions WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

// MarkAttendance marks an athlete's attendance
func (r *TrainingRepository) MarkAttendance(req *models.MarkAttendanceRequest, markedBy int) error {
	query := `
		INSERT INTO attendance (training_session_id, athlete_id, attended, notes, marked_by)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (training_session_id, athlete_id) 
		DO UPDATE SET attended = $3, notes = $4, marked_by = $5, marked_at = CURRENT_TIMESTAMP
	`
	_, err := r.db.Exec(
		query,
		req.TrainingSessionID,
		req.AthleteID,
		req.Attended,
		req.Notes,
		markedBy,
	)
	return err
}

// GetAttendance returns attendance for a session
func (r *TrainingRepository) GetAttendance(sessionID int) ([]*models.Attendance, error) {
	query := `
		SELECT id, training_session_id, athlete_id, attended, notes, marked_at
		FROM attendance
		WHERE training_session_id = $1
	`
	rows, err := r.db.Query(query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attendances []*models.Attendance
	for rows.Next() {
		a := &models.Attendance{}
		// Use marked_at from database which maps to CreatedAt in model
		var markedAt time.Time
		if err := rows.Scan(
			&a.ID, &a.TrainingSessionID, &a.AthleteID, &a.Attended, &a.Notes, &markedAt,
		); err != nil {
			return nil, err
		}
		a.CreatedAt = markedAt
		attendances = append(attendances, a)
	}
	return attendances, nil
}

// GetAttendanceByAthlete returns attendance history for an athlete
func (r *TrainingRepository) GetAttendanceByAthlete(athleteID int) ([]*models.Attendance, error) {
	query := `
		SELECT a.id, a.training_session_id, a.athlete_id, a.attended, a.notes, a.marked_at,
		       t.title, t.session_date
		FROM attendance a
		JOIN training_sessions t ON a.training_session_id = t.id
		WHERE a.athlete_id = $1
		ORDER BY t.session_date DESC
	`
	rows, err := r.db.Query(query, athleteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attendances []*models.Attendance
	for rows.Next() {
		a := &models.Attendance{}
		var markedAt time.Time
		// Scan attendance data along with session title and date for history display
		if err := rows.Scan(
			&a.ID, &a.TrainingSessionID, &a.AthleteID, &a.Attended, &a.Notes, &markedAt,
			&a.SessionTitle, &a.SessionDate,
		); err != nil {
			return nil, err
		}
		a.CreatedAt = markedAt
		attendances = append(attendances, a)
	}
	return attendances, nil
}
