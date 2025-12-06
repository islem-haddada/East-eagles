package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load .env file
	if err := godotenv.Load("project/.env"); err != nil {
		log.Println("Warning: .env file not found, relying on environment variables")
	}

	// Get DB connection string
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	dbURL := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", dbUser, dbPassword, dbHost, dbPort, dbName)

	if dbHost == "" || dbUser == "" {
		// Fallback if individual vars aren't set (though they should be)
		dbURL = os.Getenv("DATABASE_URL")
	}

	// Connect to database
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal("Error connecting to database:", err)
	}
	defer db.Close()

	// Add profile_image column
	query := `
		ALTER TABLE athletes 
		ADD COLUMN IF NOT EXISTS profile_image TEXT;
	`

	_, err = db.Exec(query)
	if err != nil {
		log.Fatal("Error adding column:", err)
	}

	fmt.Println("✅ Successfully added 'profile_image' column to 'athletes' table.")
}
