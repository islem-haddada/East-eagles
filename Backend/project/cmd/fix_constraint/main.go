package main

import (
	"log"

	"beautiful-minds/backend/project/config"
	"beautiful-minds/backend/project/internal/database"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env from project directory
	if err := godotenv.Load("project/.env"); err != nil {
		log.Println("Pas de fichier .env trouvé dans project/.env, essai .env")
		if err := godotenv.Load(".env"); err != nil {
			log.Println("Pas de fichier .env trouvé")
		}
	}

	cfg := config.Load()

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal("Erreur connexion DB:", err)
	}
	defer db.Close()

	// Drop constraint
	log.Println("Dropping constraint documents_document_type_check...")
	_, err = db.Exec("ALTER TABLE documents DROP CONSTRAINT documents_document_type_check")
	if err != nil {
		log.Println("Error dropping constraint (might not exist):", err)
	}

	// Add constraint
	log.Println("Adding updated constraint...")
	_, err = db.Exec("ALTER TABLE documents ADD CONSTRAINT documents_document_type_check CHECK (document_type IN ('medical_certificate', 'identity_card', 'photo', 'license', 'insurance', 'other', 'parental_consent'))")
	if err != nil {
		log.Fatal("Error adding constraint:", err)
	}

	log.Println("Constraint updated successfully")
}
