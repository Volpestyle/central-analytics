// Package main provides configuration management for the local server
package main

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the local server
type Config struct {
	// Server configuration
	Port         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration

	// CORS configuration
	CORSAllowedOrigins   []string
	CORSAllowedMethods   []string
	CORSAllowedHeaders   []string
	CORSAllowCredentials bool

	// Authentication configuration
	JWTSecret     string
	JWTIssuer     string
	JWTTTL        time.Duration
	AdminAppleSub string

	// Apple Sign In configuration
	AppleAuthEnabled   bool
	AppStoreKeyID      string
	AppStoreIssuerID   string
	AppStorePrivateKey string

	// AWS configuration
	AWSRegion    string
	DefaultAppID string

	// Environment
	Environment string
}

// LoadConfig loads configuration from environment variables with defaults
func LoadConfig() (*Config, error) {
	cfg := &Config{
		// Server defaults
		Port:         getEnvOrDefault("PORT", "8080"),
		ReadTimeout:  getDurationEnvOrDefault("READ_TIMEOUT", 30*time.Second),
		WriteTimeout: getDurationEnvOrDefault("WRITE_TIMEOUT", 30*time.Second),
		IdleTimeout:  getDurationEnvOrDefault("IDLE_TIMEOUT", 120*time.Second),

		// CORS defaults - dynamically configured based on domain
		CORSAllowedOrigins: getCORSOrigins(),
		CORSAllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		CORSAllowedHeaders:   []string{"*"},
		CORSAllowCredentials: true,

		// Auth defaults
		JWTIssuer:   "central-analytics",
		JWTTTL:      24 * time.Hour,
		Environment: getEnvOrDefault("ENV", "development"),

		// AWS defaults
		AWSRegion: getEnvOrDefault("AWS_REGION", "us-east-1"),
	}

	// Load secrets from env (in prod, these would come from AWS Secrets Manager)
	cfg.JWTSecret = getEnvOrDefault("JWT_SECRET", "development-secret-change-in-production")
	// Backend uses ADMIN_APPLE_SUB (frontend uses PUBLIC_ADMIN_APPLE_SUB)
	cfg.AdminAppleSub = getEnvOrDefault("ADMIN_APPLE_SUB", "dev-admin-sub")

	// Apple auth configuration
	cfg.AppStoreKeyID = os.Getenv("APP_STORE_KEY_ID")
	cfg.AppStoreIssuerID = os.Getenv("APP_STORE_ISSUER_ID")
	cfg.AppStorePrivateKey = os.Getenv("APP_STORE_PRIVATE_KEY")
	cfg.AppleAuthEnabled = cfg.AppStoreKeyID != "" && cfg.AppStoreIssuerID != "" && cfg.AppStorePrivateKey != ""

	// Default app ID
	cfg.DefaultAppID = getEnvOrDefault("DEFAULT_APP_ID", "ilikeyacut")

	// Override CORS origins if specified
	if origins := os.Getenv("CORS_ALLOWED_ORIGINS"); origins != "" {
		cfg.CORSAllowedOrigins = []string{origins}
	}

	// Validate required configuration
	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("configuration validation failed: %w", err)
	}

	return cfg, nil
}

// validate ensures required configuration is present
func (c *Config) validate() error {
	if c.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET is required")
	}
	if c.AdminAppleSub == "" {
		return fmt.Errorf("ADMIN_APPLE_SUB is required")
	}
	return nil
}

// IsProduction returns true if running in production
func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

// Helper functions

// getEnvOrDefault returns environment variable value or default
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getDurationEnvOrDefault parses duration from env or returns default
func getDurationEnvOrDefault(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

// getIntEnvOrDefault parses int from env or returns default
func getIntEnvOrDefault(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// getCORSOrigins returns the allowed CORS origins based on configuration
func getCORSOrigins() []string {
	origins := []string{
		"http://localhost:4321",
		"https://localhost:4321",
	}

	// Add configured local domain if available
	localDomain := os.Getenv("LOCAL_DOMAIN")
	if localDomain == "" {
		// Fallback to default if not configured
		localDomain = "local-dev.jcvolpe.me"
	}

	frontendPort := os.Getenv("FRONTEND_PORT")
	if frontendPort == "" {
		frontendPort = "4321"
	}

	backendHTTPSPort := os.Getenv("BACKEND_HTTPS_PORT")
	if backendHTTPSPort == "" {
		backendHTTPSPort = "3000"
	}

	// Add dynamic origins based on configuration
	origins = append(origins,
		fmt.Sprintf("https://%s:%s", localDomain, frontendPort),
		fmt.Sprintf("https://%s:%s", localDomain, backendHTTPSPort),
	)

	// Allow custom origins from environment
	if customOrigins := os.Getenv("CORS_ALLOWED_ORIGINS"); customOrigins != "" {
		origins = append(origins, customOrigins)
	}

	return origins
}
