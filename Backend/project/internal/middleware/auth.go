package middleware

import (
	"context"
	"net/http"
	"strings"

	"east-eagles/backend/internal/services"
)

type contextKey string

const (
	UserIDKey    contextKey = "userID"
	UserRoleKey  contextKey = "userRole"
	UserEmailKey contextKey = "userEmail"
)

func AuthMiddleware(authService *services.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			var tokenString string

			if authHeader != "" {
				headerParts := strings.Split(authHeader, " ")
				if len(headerParts) == 2 && headerParts[0] == "Bearer" {
					tokenString = headerParts[1]
				}
			}

			// If no header, check query param (for downloads/previews)
			if tokenString == "" {
				tokenString = r.URL.Query().Get("token")
			}

			if tokenString == "" {
				http.Error(w, "Authorization required", http.StatusUnauthorized)
				return
			}
			claims, err := authService.ValidateToken(tokenString)
			if err != nil {
				http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, UserRoleKey, claims.Role)
			ctx = context.WithValue(ctx, UserEmailKey, claims.Email)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
