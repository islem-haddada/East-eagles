package services

import (
	"errors"
	"time"

	"beautiful-minds/backend/project/internal/models"
	"beautiful-minds/backend/project/internal/repository"

	"github.com/golang-jwt/jwt/v5"
)

type AuthService struct {
	userRepo    *repository.UserRepository
	athleteRepo *repository.AthleteRepository
	jwtSecret   []byte
}

type CustomClaims struct {
	UserID int             `json:"user_id"`
	Role   models.UserRole `json:"role"`
	Email  string          `json:"email"`
	jwt.RegisteredClaims
}

func NewAuthService(userRepo *repository.UserRepository, athleteRepo *repository.AthleteRepository, jwtSecret string) *AuthService {
	return &AuthService{
		userRepo:    userRepo,
		athleteRepo: athleteRepo,
		jwtSecret:   []byte(jwtSecret),
	}
}

// Register registers a new user
func (s *AuthService) Register(req *models.CreateUserRequest) (*models.User, error) {
	// Check if email already exists
	if _, err := s.userRepo.GetByEmail(req.Email); err == nil {
		return nil, errors.New("email already registered")
	}

	user := &models.User{
		Email:     req.Email,
		Role:      req.Role,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		IsActive:  true,
	}

	if err := user.HashPassword(req.Password); err != nil {
		return nil, err
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	// If role is athlete, create athlete record
	if req.Role == models.RoleAthlete {
		athleteReq := &models.CreateAthleteRequest{
			FirstName: req.FirstName,
			LastName:  req.LastName,
			Email:     req.Email,
			// Provide defaults for mandatory fields
			Phone:                    "Non renseigné",
			DateOfBirth:              "2000-01-01", // Default date
			Gender:                   "other",      // Default gender
			EmergencyContactName:     "Non renseigné",
			EmergencyContactPhone:    "Non renseigné",
			EmergencyContactRelation: "Non renseigné",
			Address:                  "Non renseigné",
			SkillLevel:               "beginner", // Default skill level to satisfy CHECK constraint
		}
		if _, err := s.athleteRepo.Create(athleteReq); err != nil {
			// Rollback: Delete the user we just created
			s.userRepo.Delete(user.ID)
			return nil, err
		}
	}

	return user, nil
}

// Login authenticates a user and returns a JWT token
func (s *AuthService) Login(email, password string) (string, *models.User, error) {
	user, err := s.userRepo.GetByEmail(email)
	if err != nil {
		return "", nil, errors.New("invalid credentials")
	}

	if !user.CheckPassword(password) {
		return "", nil, errors.New("invalid credentials")
	}

	if !user.IsActive {
		return "", nil, errors.New("account is inactive")
	}

	token, err := s.GenerateToken(user)
	if err != nil {
		return "", nil, err
	}

	return token, user, nil
}

// GenerateToken generates a new JWT token for a user
func (s *AuthService) GenerateToken(user *models.User) (string, error) {
	claims := CustomClaims{
		UserID: user.ID,
		Role:   user.Role,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "east-eagles-sanda",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// ValidateToken validates the JWT token and returns the claims
func (s *AuthService) ValidateToken(tokenString string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// GetCurrentUser returns full user details including athlete status if applicable
func (s *AuthService) GetCurrentUser(userID int) (map[string]interface{}, error) {
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, err
	}

	response := map[string]interface{}{
		"id":         user.ID,
		"email":      user.Email,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
		"role":       user.Role,
	}

	if user.Role == models.RoleAthlete {
		athlete, err := s.athleteRepo.GetByEmail(user.Email)
		if err == nil {
			response["status"] = athlete.MembershipStatus
			response["athlete_id"] = athlete.ID
		} else {
			response["status"] = "unknown"
		}
	}

	return response, nil
}
