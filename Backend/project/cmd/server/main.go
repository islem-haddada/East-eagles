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
	authService := services.NewAuthService(userRepo, athleteRepo, cfg.JWTSecret)

	// Initialize Cloudinary service
	cloudinaryService, err := services.NewCloudinaryService(
		cfg.CloudinaryCloudName,
		cfg.CloudinaryAPIKey,
		cfg.CloudinaryAPISecret,
	)
	if err != nil {
		log.Fatal("Erreur initialisation Cloudinary:", err)
	}
	log.Println("✅ Cloudinary service initialized")

	// Initialiser les handlers
	athleteHandler := handlers.NewAthleteHandler(athleteRepo, cloudinaryService)
	authHandler := handlers.NewAuthHandler(authService)
	trainingHandler := handlers.NewTrainingHandler(trainingRepo)
	documentHandler := handlers.NewDocumentHandler(documentRepo, cloudinaryService)
	// eventHandler := handlers.NewEventHandler(eventRepo)
	// announcementHandler := handlers.NewAnnouncementHandler(announcementRepo)

	// --- Payments ---
	paymentRepo := repository.NewPaymentRepository(db)
	paymentHandler := handlers.NewPaymentHandler(paymentRepo, athleteRepo)

	// --- Schedules ---
	scheduleRepo := repository.NewScheduleRepository(db)
	scheduleHandler := handlers.NewScheduleHandler(scheduleRepo)

	// Créer le routeur
	router := mux.NewRouter()

	// Middleware - Apply to all routes including OPTIONS
	router.Use(middleware.CORS)

	// Log all incoming requests for debugging
	router.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log.Printf("📥 Incoming request: %s %s", r.Method, r.URL.Path)
			next.ServeHTTP(w, r)
		})
	})

	// Handle all OPTIONS requests globally to ensure CORS preflight works
	router.Methods("OPTIONS").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Use the CORS middleware logic instead of hardcoded headers
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.WriteHeader(http.StatusOK)
	})

	// Servir les fichiers statiques (uploads)
	router.PathPrefix("/uploads/").Handler(http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))

	// Public routes (Must be defined BEFORE the /api subrouter to avoid shadowing)
	router.HandleFunc("/api/auth/register", authHandler.Register).Methods("POST")
	router.HandleFunc("/api/auth/login", authHandler.Login).Methods("POST")

	// Routes API (Subrouter for /api)
	api := router.PathPrefix("/api").Subrouter()

	// Protected routes (Apply AuthMiddleware)
	api.Use(middleware.AuthMiddleware(authService))

	// Document Download (Protected via Query Param or Header)
	api.HandleFunc("/documents/{id}/download", documentHandler.Download).Methods("GET")

	api.HandleFunc("/auth/me", authHandler.Me).Methods("GET")
	api.HandleFunc("/athletes/profile", athleteHandler.GetProfile).Methods("GET")
	api.HandleFunc("/athletes/profile", athleteHandler.UpdateProfile).Methods("PUT")
	api.HandleFunc("/athletes/profile/image", athleteHandler.UploadProfileImage).Methods("POST")

	// --- Routes Admin/Coach ---
	admin := api.PathPrefix("/admin").Subrouter()
	admin.Use(middleware.RequireCoach)

	// Athletes Management
	admin.HandleFunc("/athletes", athleteHandler.GetAll).Methods("GET")
	admin.HandleFunc("/athletes/pending", athleteHandler.GetPending).Methods("GET")
	admin.HandleFunc("/athletes/stats", athleteHandler.GetStats).Methods("GET")
	admin.HandleFunc("/athletes/{id}", athleteHandler.GetByID).Methods("GET")
	admin.HandleFunc("/athletes/{id}/approve", athleteHandler.Approve).Methods("POST")
	admin.HandleFunc("/athletes/{id}/reject", athleteHandler.Reject).Methods("POST")
	admin.HandleFunc("/athletes/{id}", athleteHandler.Update).Methods("PUT")
	admin.HandleFunc("/athletes/{id}", athleteHandler.Delete).Methods("DELETE")

	// Training Management
	admin.HandleFunc("/trainings", trainingHandler.Create).Methods("POST")
	admin.HandleFunc("/trainings", trainingHandler.GetAll).Methods("GET")
	admin.HandleFunc("/trainings/{id}", trainingHandler.GetByID).Methods("GET")
	admin.HandleFunc("/trainings/{id}", trainingHandler.Update).Methods("PUT")
	admin.HandleFunc("/trainings/{id}", trainingHandler.Delete).Methods("DELETE")
	admin.HandleFunc("/trainings/{id}/attendance", trainingHandler.MarkAttendance).Methods("POST")
	admin.HandleFunc("/trainings/{id}/attendance", trainingHandler.GetAttendance).Methods("GET")

	// Document Management
	// More specific routes first to avoid conflicts
	admin.HandleFunc("/documents/athlete/{id}", documentHandler.GetByAthlete).Methods("GET")
	admin.HandleFunc("/documents/{id}/versions", documentHandler.GetVersions).Methods("GET")
	admin.HandleFunc("/documents/{id}/versions", documentHandler.UploadVersion).Methods("POST")
	admin.HandleFunc("/documents/{id}/validate", documentHandler.Validate).Methods("POST")
	admin.HandleFunc("/documents/{id}/reject", documentHandler.Reject).Methods("POST")
	admin.HandleFunc("/documents/{id}/share", documentHandler.ShareDocument).Methods("POST")
	admin.HandleFunc("/documents/{id}/shares", documentHandler.GetShares).Methods("GET")
	admin.HandleFunc("/documents/{id}/unshare", documentHandler.UnshareDocument).Methods("POST")

	// General document routes
	admin.HandleFunc("/documents/pending", documentHandler.GetPending).Methods("GET")
	admin.HandleFunc("/documents/expiring", documentHandler.GetExpiring).Methods("GET")
	admin.HandleFunc("/documents/expired", documentHandler.GetExpired).Methods("GET")
	admin.HandleFunc("/documents/bulk-upload", documentHandler.UploadBulk).Methods("POST")
	admin.HandleFunc("/documents/search", documentHandler.Search).Methods("GET")
	admin.HandleFunc("/documents/categories", documentHandler.GetCategories).Methods("GET")
	admin.HandleFunc("/documents/tags", documentHandler.GetTags).Methods("GET")
	admin.HandleFunc("/documents/shared", documentHandler.GetSharedDocuments).Methods("GET")

	// Test route to debug routing issue
	admin.HandleFunc("/documents/debug-test", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message": "Debug test route working"}`))
	}).Methods("GET")

	// Payment Management
	admin.HandleFunc("/payments", paymentHandler.Create).Methods("POST")
	admin.HandleFunc("/payments/recent", paymentHandler.GetRecent).Methods("GET")
	admin.HandleFunc("/payments/athlete/{id}", paymentHandler.GetByAthlete).Methods("GET")
	admin.HandleFunc("/payments/{id}", paymentHandler.Update).Methods("PUT")
	admin.HandleFunc("/payments/{id}", paymentHandler.Delete).Methods("DELETE")

	// Schedule Management
	admin.HandleFunc("/schedules", scheduleHandler.Create).Methods("POST")
	admin.HandleFunc("/schedules", scheduleHandler.GetAll).Methods("GET")
	admin.HandleFunc("/schedules/{id}", scheduleHandler.Update).Methods("PUT")
	admin.HandleFunc("/schedules/{id}", scheduleHandler.Delete).Methods("DELETE")

	// Athlete/Coach Shared Routes
	api.HandleFunc("/trainings/upcoming", trainingHandler.GetUpcoming).Methods("GET")
	api.HandleFunc("/trainings/history", trainingHandler.GetHistory).Methods("GET")
	api.HandleFunc("/payments/my", paymentHandler.GetMyPayments).Methods("GET")
	api.HandleFunc("/schedules", scheduleHandler.GetAll).Methods("GET")

	// Document Upload (Athlete)
	api.HandleFunc("/documents/upload", documentHandler.Upload).Methods("POST")
	api.HandleFunc("/documents/my", documentHandler.GetMyDocuments).Methods("GET")

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
