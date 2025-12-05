package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
)

// UserRole defines the role of a user
type UserRole string

const (
	RoleAdmin   UserRole = "admin"
	RoleCoach   UserRole = "coach"
	RoleAthlete UserRole = "athlete"
)

// User represents a system user (admin, coach, or athlete)
type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // Never return password hash in JSON
	Role         UserRole  `json:"role"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// CreateUserRequest represents the payload for creating a new user
type CreateUserRequest struct {
	Email     string   `json:"email"`
	Password  string   `json:"password"`
	Role      UserRole `json:"role"`
	FirstName string   `json:"first_name"`
	LastName  string   `json:"last_name"`
}

// LoginRequest represents the payload for user login
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse represents the response after successful login
type LoginResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}

// HashPassword hashes the user's password
func (u *User) HashPassword(password string) error {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return err
	}
	u.PasswordHash = string(bytes)
	return nil
}

// CheckPassword checks if the provided password matches the hash
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	return err == nil
}
