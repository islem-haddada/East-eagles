package main

import (
	"database/sql"
	"fmt"
	"io/ioutil"
	"log"
	"path/filepath"

	"beautiful-minds/backend/project/config"

	"github.com/joho/godotenv"

	_ "github.com/lib/pq"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	cfg := config.Load()
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping DB: %v", err)
	}

	fmt.Println("Connected to database")

	migrations := []string{
		"migrations/005_add_is_active.sql",
		"migrations/003_payments_schedule.sql",
	}

	for _, migrationFile := range migrations {
		fmt.Printf("Running migration: %s\n", migrationFile)

		path, _ := filepath.Abs(migrationFile)
		content, err := ioutil.ReadFile(path)
		if err != nil {
			log.Fatalf("Failed to read migration file %s: %v", migrationFile, err)
		}

		_, err = db.Exec(string(content))
		if err != nil {
			log.Printf("Error running migration %s: %v", migrationFile, err)
		} else {
			fmt.Printf("Successfully ran migration: %s\n", migrationFile)
		}
	}

	// Inspect athletes table
	rows, err := db.Query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'athletes'")
	if err != nil {
		log.Printf("Failed to query columns: %v", err)
	} else {
		defer rows.Close()
		fmt.Println("Columns in 'athletes' table:")
		found := false
		for rows.Next() {
			found = true
			var name, dtype string
			rows.Scan(&name, &dtype)
			fmt.Printf("- %s (%s)\n", name, dtype)
		}
		if !found {
			fmt.Println("Table 'athletes' does not exist.")
			// Check if members exists
			rows2, err := db.Query("SELECT column_name FROM information_schema.columns WHERE table_name = 'members'")
			if err == nil {
				defer rows2.Close()
				if rows2.Next() {
					fmt.Println("Table 'members' EXISTS.")
				} else {
					fmt.Println("Table 'members' does not exist.")
				}
			}
		}
	}

}
