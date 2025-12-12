package middleware

import (
	"net/http"
	"os"
)

func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow specific origins including the frontend development server
		origin := r.Header.Get("Origin")
		allowedOrigins := []string{
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"http://192.168.100.9:3000",
		}

		// Check if origin is in allowed list or if we're in development mode
		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}

		// In development, allow any origin
		if os.Getenv("ENV") != "production" {
			allowed = true
		}

		if allowed && origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else if os.Getenv("ENV") != "production" {
			// For development, allow any origin if none matched
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		// Set other CORS headers
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight OPTIONS request
		if r.Method == "OPTIONS" {
			// Check if it's a preflight request
			if r.Header.Get("Access-Control-Request-Method") != "" {
				w.WriteHeader(http.StatusOK)
				return
			}
		}

		// Continue with the next handler
		next.ServeHTTP(w, r)
	})
}
