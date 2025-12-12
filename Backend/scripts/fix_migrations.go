package scripts
package main

import (
	"database/sql"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
}

func Load() *Config {
	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5434"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "admin"),
		DBName:     getEnv("DB_NAME", "east_eagles"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	// Change to the Backend directory
	err := os.Chdir("/home/chef/Desktop/Dev/East eagles/Backend")
	if err != nil {
		log.Fatalf("Failed to change directory: %v", err)
	}

	// Load .env file
	if err := godotenv.Load(".env"); err != nil {
		log.Println("No .env file found, using defaults")
	}

	cfg := Load()
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

	// Define the migration files in order with correct paths
	migrations := []string{
		"project/migrations/001_init_schema.sql",
		"project/migrations/002_sanda_schema.sql",
		"project/migrations/003_documents_schema.sql",
		"project/migrations/003_payments_schedule.sql",
		"project/migrations/004_fix_schema_mismatch.sql",
		"project/migrations/005_add_is_active.sql",
		"project/migrations/006_fix_attendance_table.sql",
		"project/migrations/007_add_document_tags.sql",
		"project/migrations/008_add_document_versions.sql",
		"project/migrations/009_add_document_sharing.sql",
	}

	// Run each migration in a separate transaction
	for _, migrationFile := range migrations {
		fmt.Printf("Running migration: %s\n", migrationFile)

		// Read the file
		content, err := ioutil.ReadFile(migrationFile)
		if err != nil {
			log.Printf("Failed to read migration file %s: %v", migrationFile, err)
			continue
		}

		// Skip DROP statements to avoid losing data
		if len(content) > 20 && string(content)[:20] == "-- Drop tables if th" {
			fmt.Printf("Skipping DROP statements in %s\n", migrationFile)
			continue
		}

		// Execute in a separate transaction
		tx, err := db.Begin()
		if err != nil {
			log.Printf("Failed to begin transaction for %s: %v", migrationFile, err)
			continue
		}

		_, err = tx.Exec(string(content))
		if err != nil {
			log.Printf("Error running migration %s: %v", migrationFile, err)
			tx.Rollback()
			// Continue with next migration
			continue
		}

		err = tx.Commit()
		if err != nil {
			log.Printf("Failed to commit transaction for %s: %v", migrationFile, err)
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