package main

import (
	"log"
	"net/http"
	"os"

	"beautiful-minds/backend/project/config"
	"beautiful-minds/backend/project/internal/database"
	"beautiful-minds/backend/project/internal/handlers"
	"beautiful-minds/backend/project/internal/middleware"
	"beautiful-minds/backend/project/internal/repository"
	"beautiful-minds/backend/project/internal/services"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Charger les variables d'environnement
	if err := godotenv.Load(); err != nil {
		log.Println("Pas de fichier .env trouvé")
	}

	// Charger la configuration
	cfg := config.Load()

	// Connexion à la base de données
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatal("Erreur connexion DB:", err)
	}
	defer db.Close()

	log.Println("✅ Connexion à PostgreSQL réussie")

	// Initialiser les repositories
	athleteRepo := repository.NewAthleteRepository(db)
	userRepo := repository.NewUserRepository(db)
	trainingRepo := repository.NewTrainingRepository(db)
	documentRepo := repository.NewDocumentRepository(db)
	// eventRepo := repository.NewEventRepository(db) // Legacy
	// announcementRepo := repository.NewAnnouncementRepository(db) // Legacy

	// Initialiser les services
	authService := services.NewAuthService(userRepo, cfg.JWTSecret)

	// Initialiser les handlers
	athleteHandler := handlers.NewAthleteHandler(athleteRepo)
	authHandler := handlers.NewAuthHandler(authService)
	trainingHandler := handlers.NewTrainingHandler(trainingRepo)
	documentHandler := handlers.NewDocumentHandler(documentRepo, "./uploads")
	// eventHandler := handlers.NewEventHandler(eventRepo)
	// announcementHandler := handlers.NewAnnouncementHandler(announcementRepo)

	// Créer le routeur
	router := mux.NewRouter()

	// Middleware CORS
	router.Use(middleware.CORS)

	// Servir les fichiers statiques (uploads)
	// En production, utiliser nginx ou un service de stockage cloud
	router.PathPrefix("/uploads/").Handler(http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))

	// Routes API
	api := router.PathPrefix("/api").Subrouter()

	// --- Routes Publiques ---
	api.HandleFunc("/auth/register", authHandler.Register).Methods("POST")
	api.HandleFunc("/auth/login", authHandler.Login).Methods("POST")

	// --- Routes Protégées ---
	protected := api.PathPrefix("").Subrouter()
	protected.Use(middleware.AuthMiddleware(authService))

	// Routes Auth
	protected.HandleFunc("/auth/me", authHandler.Me).Methods("GET")

	// Routes Athlètes
	protected.HandleFunc("/athletes", athleteHandler.GetAll).Methods("GET")
	protected.HandleFunc("/athletes/search", athleteHandler.Search).Methods("GET")
	protected.HandleFunc("/athletes/{id}", athleteHandler.GetByID).Methods("GET")
	protected.HandleFunc("/athletes", athleteHandler.Create).Methods("POST")
	protected.HandleFunc("/athletes/{id}", athleteHandler.Update).Methods("PUT")

	// Routes Entraînements
	protected.HandleFunc("/trainings", trainingHandler.GetAll).Methods("GET")
	protected.HandleFunc("/trainings/upcoming", trainingHandler.GetUpcoming).Methods("GET")
	protected.HandleFunc("/trainings/{id}", trainingHandler.GetByID).Methods("GET")
	protected.HandleFunc("/trainings/{id}/attendance", trainingHandler.GetAttendance).Methods("GET")

	// Routes Documents
	protected.HandleFunc("/documents/upload", documentHandler.Upload).Methods("POST")
	protected.HandleFunc("/documents/athlete/{id}", documentHandler.GetByAthlete).Methods("GET")
	protected.HandleFunc("/documents/{id}/download", documentHandler.Download).Methods("GET")

	// Routes Admin/Coach Only
	admin := protected.PathPrefix("").Subrouter()
	admin.Use(middleware.RequireCoach) // Coach can manage trainings too

	// Admin/Coach Athletes
	admin.HandleFunc("/athletes/pending", athleteHandler.GetPending).Methods("GET")
	admin.HandleFunc("/athletes/stats", athleteHandler.GetStats).Methods("GET")
	admin.HandleFunc("/athletes/{id}", athleteHandler.Delete).Methods("DELETE")
	admin.HandleFunc("/athletes/{id}/approve", athleteHandler.Approve).Methods("POST")
	admin.HandleFunc("/athletes/{id}/reject", athleteHandler.Reject).Methods("POST")

	// Admin/Coach Trainings
	admin.HandleFunc("/trainings", trainingHandler.Create).Methods("POST")
	admin.HandleFunc("/trainings/{id}", trainingHandler.Update).Methods("PUT")
	admin.HandleFunc("/trainings/{id}", trainingHandler.Delete).Methods("DELETE")
	admin.HandleFunc("/trainings/{id}/attendance", trainingHandler.MarkAttendance).Methods("POST")

	// Admin Documents
	admin.HandleFunc("/documents/pending", documentHandler.GetPending).Methods("GET")
	admin.HandleFunc("/documents/{id}/validate", documentHandler.Validate).Methods("POST")
	admin.HandleFunc("/documents/{id}/reject", documentHandler.Reject).Methods("POST")

	// Legacy routes (commented out for now to focus on Sanda)
	/*
		api.HandleFunc("/events", eventHandler.GetAll).Methods("GET")
		api.HandleFunc("/events", eventHandler.Create).Methods("POST")
		api.HandleFunc("/events/{id}", eventHandler.GetByID).Methods("GET")
		api.HandleFunc("/events/{id}", eventHandler.Update).Methods("PUT")
		api.HandleFunc("/events/{id}", eventHandler.Delete).Methods("DELETE")
		api.HandleFunc("/events/{id}/register", eventHandler.RegisterMember).Methods("POST")

		api.HandleFunc("/announcements", announcementHandler.GetAll).Methods("GET")
		api.HandleFunc("/announcements", announcementHandler.Create).Methods("POST")
		api.HandleFunc("/announcements/{id}", announcementHandler.GetByID).Methods("GET")
		api.HandleFunc("/announcements/{id}", announcementHandler.Update).Methods("PUT")
		api.HandleFunc("/announcements/{id}", announcementHandler.Delete).Methods("DELETE")
	*/

	// Handle all OPTIONS requests for CORS preflight
	api.PathPrefix("").Methods("OPTIONS").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	// Démarrer le serveur
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Serveur démarré sur le port %s", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatal(err)
	}
}
