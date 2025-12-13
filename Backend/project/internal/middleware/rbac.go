package middleware

import (
	"net/http"

	"east-eagles/backend/internal/models"
)

// RequireAdmin ensures the user has admin role
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := r.Context().Value(UserRoleKey).(models.UserRole)
		if !ok || role != models.RoleAdmin {
			http.Error(w, "Forbidden: Admin access required", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireCoach ensures the user has coach role (or admin)
func RequireCoach(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := r.Context().Value(UserRoleKey).(models.UserRole)
		if !ok || (role != models.RoleCoach && role != models.RoleAdmin) {
			http.Error(w, "Forbidden: Coach access required", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireAthlete ensures the user has athlete role (or admin/coach)
func RequireAthlete(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, ok := r.Context().Value(UserRoleKey).(models.UserRole)
		if !ok {
			http.Error(w, "Forbidden: Authentication required", http.StatusForbidden)
			return
		}
		// All authenticated users can access athlete routes?
		// Or strictly athletes? Usually athletes can see their own data.
		// For now, let's assume this checks if they are logged in as athlete or higher
		if role != models.RoleAthlete && role != models.RoleCoach && role != models.RoleAdmin {
			http.Error(w, "Forbidden: Athlete access required", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
