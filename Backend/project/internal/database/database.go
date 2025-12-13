package database

import (
	"database/sql"
	"fmt"

	"east-eagles/backend/config"

	_ "github.com/lib/pq"
)

func Connect(cfg *config.Config) (*sql.DB, error) {
	sslmode := cfg.DBSSLMode
	if sslmode == "" {
		sslmode = "disable"
	}

	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, sslmode,
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}
