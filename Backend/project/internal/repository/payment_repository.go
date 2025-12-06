package repository

import (
	"database/sql"
	"time"

	"beautiful-minds/backend/project/internal/models"
)

type PaymentRepository struct {
	db *sql.DB
}

func NewPaymentRepository(db *sql.DB) *PaymentRepository {
	return &PaymentRepository{db: db}
}

func (r *PaymentRepository) Create(req *models.CreatePaymentRequest, recordedBy int) (*models.Payment, error) {
	// Calculate EndDate based on StartDate and MonthsCovered
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, err
	}
	endDate := startDate.AddDate(0, req.MonthsCovered, 0)

	query := `
		INSERT INTO payments (
			athlete_id, amount, months_covered, start_date, end_date, notes, recorded_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, payment_date
	`

	payment := &models.Payment{
		AthleteID:     req.AthleteID,
		Amount:        req.Amount,
		MonthsCovered: req.MonthsCovered,
		StartDate:     req.StartDate,
		EndDate:       endDate.Format("2006-01-02"),
		Notes:         req.Notes,
		RecordedBy:    &recordedBy,
	}

	err = r.db.QueryRow(
		query,
		payment.AthleteID,
		payment.Amount,
		payment.MonthsCovered,
		payment.StartDate,
		payment.EndDate,
		payment.Notes,
		recordedBy,
	).Scan(&payment.ID, &payment.PaymentDate)

	if err != nil {
		return nil, err
	}

	return payment, nil
}

func (r *PaymentRepository) GetByAthlete(athleteID int) ([]*models.Payment, error) {
	query := `
		SELECT id, athlete_id, amount, months_covered, start_date, end_date, payment_date, notes, recorded_by
		FROM payments
		WHERE athlete_id = $1
		ORDER BY payment_date DESC
	`
	rows, err := r.db.Query(query, athleteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []*models.Payment
	for rows.Next() {
		p := &models.Payment{}
		var startDate, endDate time.Time
		if err := rows.Scan(
			&p.ID, &p.AthleteID, &p.Amount, &p.MonthsCovered, &startDate, &endDate,
			&p.PaymentDate, &p.Notes, &p.RecordedBy,
		); err != nil {
			return nil, err
		}
		p.StartDate = startDate.Format("2006-01-02")
		p.EndDate = endDate.Format("2006-01-02")
		payments = append(payments, p)
	}
	return payments, nil
}

func (r *PaymentRepository) GetRecent() ([]*models.Payment, error) {
	query := `
		SELECT p.id, p.athlete_id, p.amount, p.months_covered, p.start_date, p.end_date, p.payment_date, p.notes, p.recorded_by,
		       a.first_name || ' ' || a.last_name as athlete_name
		FROM payments p
		JOIN athletes a ON p.athlete_id = a.id
		ORDER BY p.payment_date DESC
		LIMIT 50
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []*models.Payment
	for rows.Next() {
		p := &models.Payment{}
		var startDate, endDate time.Time
		if err := rows.Scan(
			&p.ID, &p.AthleteID, &p.Amount, &p.MonthsCovered, &startDate, &endDate,
			&p.PaymentDate, &p.Notes, &p.RecordedBy, &p.AthleteName,
		); err != nil {
			return nil, err
		}
		p.StartDate = startDate.Format("2006-01-02")
		p.EndDate = endDate.Format("2006-01-02")
		payments = append(payments, p)
	}
	return payments, nil
}

func (r *PaymentRepository) Update(id int, req *models.CreatePaymentRequest, recordedBy int) (*models.Payment, error) {
	// Calculate EndDate based on StartDate and MonthsCovered
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, err
	}
	endDate := startDate.AddDate(0, req.MonthsCovered, 0)

	query := `
		UPDATE payments
		SET athlete_id = $1, amount = $2, months_covered = $3, start_date = $4, end_date = $5, notes = $6, recorded_by = $7
		WHERE id = $8
		RETURNING id, payment_date
	`

	payment := &models.Payment{
		ID:            id,
		AthleteID:     req.AthleteID,
		Amount:        req.Amount,
		MonthsCovered: req.MonthsCovered,
		StartDate:     req.StartDate,
		EndDate:       endDate.Format("2006-01-02"),
		Notes:         req.Notes,
		RecordedBy:    &recordedBy,
	}

	err = r.db.QueryRow(
		query,
		payment.AthleteID,
		payment.Amount,
		payment.MonthsCovered,
		payment.StartDate,
		payment.EndDate,
		payment.Notes,
		recordedBy,
		id,
	).Scan(&payment.ID, &payment.PaymentDate)

	if err != nil {
		return nil, err
	}

	return payment, nil
}

func (r *PaymentRepository) Delete(id int) error {
	query := `DELETE FROM payments WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}
