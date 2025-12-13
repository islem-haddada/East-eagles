package repository

import (
	"east-eagles/backend/internal/models"
	"database/sql"
)

type EventRepository struct {
	db *sql.DB
}

func NewEventRepository(db *sql.DB) *EventRepository {
	return &EventRepository{db: db}
}

func (r *EventRepository) GetAll() ([]models.Event, error) {
	query := `
		SELECT id, title, description, date, location, image_url, 
		       max_participants, created_at
		FROM events
		WHERE date >= NOW()
		ORDER BY date ASC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []models.Event
	for rows.Next() {
		var e models.Event
		err := rows.Scan(
			&e.ID, &e.Title, &e.Description, &e.Date, &e.Location,
			&e.ImageURL, &e.MaxParticipants, &e.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		events = append(events, e)
	}

	return events, nil
}

func (r *EventRepository) GetByID(id int) (*models.Event, error) {
	query := `
		SELECT id, title, description, date, location, image_url,
		       max_participants, created_at
		FROM events WHERE id = $1
	`

	var e models.Event
	err := r.db.QueryRow(query, id).Scan(
		&e.ID, &e.Title, &e.Description, &e.Date, &e.Location,
		&e.ImageURL, &e.MaxParticipants, &e.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &e, nil
}

func (r *EventRepository) Create(req *models.CreateEventRequest) (*models.Event, error) {
	query := `
		INSERT INTO events (title, description, date, location, image_url, max_participants)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, title, description, date, location, image_url, 
		          max_participants, created_at
	`

	var e models.Event
	err := r.db.QueryRow(
		query, req.Title, req.Description, req.Date,
		req.Location, req.ImageURL, req.MaxParticipants,
	).Scan(
		&e.ID, &e.Title, &e.Description, &e.Date, &e.Location,
		&e.ImageURL, &e.MaxParticipants, &e.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &e, nil
}

func (r *EventRepository) RegisterMember(eventID, memberID int) error {
	query := `
		INSERT INTO event_registrations (event_id, member_id)
		VALUES ($1, $2)
	`

	_, err := r.db.Exec(query, eventID, memberID)
	return err
}

func (r *EventRepository) Update(id int, req *models.CreateEventRequest) (*models.Event, error) {
	query := `
		UPDATE events
		SET title = $1, description = $2, date = $3, location = $4, 
		    image_url = $5, max_participants = $6
		WHERE id = $7
		RETURNING id, title, description, date, location, image_url, 
		          max_participants, created_at
	`

	var e models.Event
	err := r.db.QueryRow(
		query, req.Title, req.Description, req.Date, req.Location,
		req.ImageURL, req.MaxParticipants, id,
	).Scan(
		&e.ID, &e.Title, &e.Description, &e.Date, &e.Location,
		&e.ImageURL, &e.MaxParticipants, &e.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &e, nil
}

func (r *EventRepository) Delete(id int) error {
	query := `DELETE FROM events WHERE id = $1`
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
