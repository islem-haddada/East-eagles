package config

import (
	"net/url"
	"os"
	"strings"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	Port       string
	JWTSecret  string

	// Cloudinary
	CloudinaryCloudName string
	CloudinaryAPIKey    string
	CloudinaryAPISecret string
}

func Load() *Config {
	cfg := &Config{
		Port:      getEnv("PORT", "8080"),
		JWTSecret: getEnv("JWT_SECRET", "your-secret-key-change-in-production"),

		CloudinaryCloudName: getEnv("CLOUDINARY_CLOUD_NAME", ""),
		CloudinaryAPIKey:    getEnv("CLOUDINARY_API_KEY", ""),
		CloudinaryAPISecret: getEnv("CLOUDINARY_API_SECRET", ""),
	}

	// Check for DATABASE_URL first (Render, Railway, Heroku style)
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		parseDatabaseURL(dbURL, cfg)
	} else {
		// Fallback to individual env vars (local development)
		cfg.DBHost = getEnv("DB_HOST", "localhost")
		cfg.DBPort = getEnv("DB_PORT", "5432")
		cfg.DBUser = getEnv("DB_USER", "postgres")
		cfg.DBPassword = getEnv("DB_PASSWORD", "")
		cfg.DBName = getEnv("DB_NAME", "east_eagles")
		cfg.DBSSLMode = getEnv("DB_SSLMODE", "disable")
	}

	return cfg
}

func parseDatabaseURL(dbURL string, cfg *Config) {
	// Parse: postgres://user:password@host:port/dbname
	u, err := url.Parse(dbURL)
	if err != nil {
		return
	}

	cfg.DBHost = u.Hostname()
	cfg.DBPort = u.Port()
	if cfg.DBPort == "" {
		cfg.DBPort = "5432"
	}
	cfg.DBUser = u.User.Username()
	cfg.DBPassword, _ = u.User.Password()
	cfg.DBName = strings.TrimPrefix(u.Path, "/")

	// Default to require SSL for production databases
	cfg.DBSSLMode = "require"
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
