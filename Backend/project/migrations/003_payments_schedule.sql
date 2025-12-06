CREATE TABLE IF NOT EXISTS training_schedules (
    id SERIAL PRIMARY KEY,
    day_of_week VARCHAR(20) NOT NULL, -- e.g., "Monday", "Tuesday"
    start_time TIME NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 90,
    title VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL DEFAULT 'Salle Principale',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    athlete_id INT NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    months_covered INT NOT NULL DEFAULT 1, -- Number of months paid for
    start_date DATE NOT NULL, -- Coverage start date
    end_date DATE NOT NULL, -- Coverage end date
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    recorded_by INT REFERENCES users(id) -- Admin who recorded the payment
);

-- Index for faster lookups
CREATE INDEX idx_payments_athlete ON payments(athlete_id);
