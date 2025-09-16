// Package main provides the application container for dependency injection
package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/gorilla/mux"
	"github.com/jamesvolpe/central-analytics/backend/internal/appstore"
	"github.com/jamesvolpe/central-analytics/backend/internal/auth"
	"github.com/jamesvolpe/central-analytics/backend/internal/aws"
	appconfig "github.com/jamesvolpe/central-analytics/backend/internal/config"
	"github.com/jamesvolpe/central-analytics/backend/internal/handlers"
	"github.com/rs/cors"
)

// App represents the application container with all dependencies
type App struct {
	config            *Config
	logger            *slog.Logger
	router            *mux.Router
	appHandler        *handlers.AppHandler
	metricsAggregator *handlers.MetricsAggregator
	timeSeriesHandler *handlers.TimeSeriesHandler
	echartsHandler    *handlers.EChartsHandler
	corsHandler       *cors.Cors
}

// NewApp creates a new application instance with all dependencies
func NewApp(cfg *Config) (*App, error) {
	// Setup structured logging
	logLevel := slog.LevelInfo
	if cfg.Environment == "development" {
		logLevel = slog.LevelDebug
	}
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level:     logLevel,
		AddSource: true,
	}))
	slog.SetDefault(logger)

	app := &App{
		config: cfg,
		logger: logger,
		router: mux.NewRouter(),
	}

	// Initialize AWS configuration
	awsCfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(cfg.AWSRegion),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Initialize authentication
	jwtManager := auth.NewJWTManager([]byte(cfg.JWTSecret), cfg.JWTIssuer, cfg.JWTTTL)
	if cfg.AppleAuthEnabled {
		logger.Info("Apple authentication enabled")
	} else {
		logger.Info("Apple authentication disabled (development mode)")
	}

	// Initialize AWS clients
	cloudWatchClient := aws.NewCloudWatchClient(awsCfg)
	costExplorerClient := aws.NewCostExplorerClient(awsCfg)
	dynamoDBClient := aws.NewDynamoDBClient(awsCfg)

	// Initialize App Store Connect client if credentials provided
	var appStoreClient *appstore.AppStoreConnectClient
	if cfg.AppStorePrivateKey != "" {
		appStoreClient, err = appstore.NewAppStoreConnectClient(
			cfg.AppStoreKeyID,
			cfg.AppStoreIssuerID,
			[]byte(cfg.AppStorePrivateKey),
		)
		if err != nil {
			logger.Warn("Failed to initialize App Store Connect client", "error", err)
		}
	}

	// Initialize apps configuration
	appsConfig := appconfig.NewAppsConfiguration()

	// Initialize App Store Connect client if credentials provided
	var appStoreConnectClient *appstore.AppStoreConnectClient
	if cfg.AppStoreKeyID != "" && cfg.AppStoreIssuerID != "" && cfg.AppStorePrivateKey != "" {
		appStoreConnectClient, err = appstore.NewAppStoreConnectClient(
			cfg.AppStoreKeyID,
			cfg.AppStoreIssuerID,
			[]byte(cfg.AppStorePrivateKey),
		)
		if err != nil {
			logger.Warn("Failed to initialize App Store Connect client", "error", err)
		}
	}

	// Create a mock AppHandler that uses real dependencies
	app.appHandler = &handlers.AppHandler{
		CloudWatch:   cloudWatchClient,
		CostExplorer: costExplorerClient,
		DynamoDB:     dynamoDBClient,
		AppStore:     appStoreConnectClient,
		JWTManager:   jwtManager,
		AppsConfig:   appsConfig,
		Logger:       logger,
	}

	// Initialize derived handlers
	app.metricsAggregator = handlers.NewMetricsAggregator(app.appHandler, logger)
	app.timeSeriesHandler = handlers.NewTimeSeriesHandler(app.appHandler, logger)
	app.echartsHandler = handlers.NewEChartsHandler(app.appHandler, logger)

	// Setup CORS
	app.corsHandler = cors.New(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   cfg.CORSAllowedMethods,
		AllowedHeaders:   cfg.CORSAllowedHeaders,
		AllowCredentials: cfg.CORSAllowCredentials,
	})

	// Setup routes
	app.setupRoutes()

	logger.Info("Application initialized successfully",
		"environment", cfg.Environment,
		"port", cfg.Port,
		"apple_auth_enabled", cfg.AppleAuthEnabled,
		"app_store_enabled", appStoreClient != nil)

	return app, nil
}

// setupRoutes configures all HTTP routes
func (app *App) setupRoutes() {
	r := app.router

	// Health check
	r.HandleFunc("/health", app.handleHealth).Methods("GET")

	// Apple auth endpoint (development fallback)
	r.HandleFunc("/api/auth/apple", app.handleAppleAuth).Methods("POST")

	// Protected AWS Infrastructure Dashboard endpoints
	r.HandleFunc("/api/apps/{appId}/aws/lambda", app.appHandler.AuthMiddleware(app.appHandler.GetLambdaMetrics)).Methods("GET")
	r.HandleFunc("/api/apps/{appId}/aws/apigateway", app.appHandler.AuthMiddleware(app.appHandler.GetAPIGatewayMetrics)).Methods("GET")
	r.HandleFunc("/api/apps/{appId}/aws/dynamodb", app.appHandler.AuthMiddleware(app.appHandler.GetDynamoDBMetrics)).Methods("GET")
	r.HandleFunc("/api/apps/{appId}/aws/costs", app.appHandler.AuthMiddleware(app.appHandler.GetCostAnalytics)).Methods("GET")

	// App Store Analytics endpoints
	r.HandleFunc("/api/apps/{appId}/appstore/downloads", app.appHandler.AuthMiddleware(app.appHandler.GetAppStoreDownloads)).Methods("GET")
	r.HandleFunc("/api/apps/{appId}/appstore/revenue", app.appHandler.AuthMiddleware(app.appHandler.GetAppStoreRevenue)).Methods("GET")

	// Health status endpoint
	r.HandleFunc("/api/apps/{appId}/health", app.appHandler.AuthMiddleware(app.appHandler.GetHealthStatus)).Methods("GET")

	// Health endpoint without auth
	r.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		response := map[string]interface{}{
			"status":    "healthy",
			"timestamp": time.Now().Unix(),
			"version":   "1.0.0",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}).Methods("GET")

	// Aggregated metrics endpoint
	if app.metricsAggregator != nil {
		r.HandleFunc("/api/apps/{appId}/metrics/aggregated", app.appHandler.AuthMiddleware(app.metricsAggregator.GetAggregatedMetrics)).Methods("GET")
	}

	// Time series endpoints
	if app.timeSeriesHandler != nil {
		r.HandleFunc("/api/apps/{appId}/timeseries/lambda", app.appHandler.AuthMiddleware(app.timeSeriesHandler.GetLambdaTimeSeries)).Methods("GET")
		r.HandleFunc("/api/apps/{appId}/timeseries/apigateway", app.appHandler.AuthMiddleware(app.timeSeriesHandler.GetAPIGatewayTimeSeries)).Methods("GET")
		r.HandleFunc("/api/apps/{appId}/timeseries/dynamodb", app.appHandler.AuthMiddleware(app.timeSeriesHandler.GetDynamoDBTimeSeries)).Methods("GET")
		r.HandleFunc("/api/apps/{appId}/timeseries/cost", app.appHandler.AuthMiddleware(app.timeSeriesHandler.GetCostTimeSeries)).Methods("GET")
	}

	// ECharts formatted endpoints
	if app.echartsHandler != nil {
		r.HandleFunc("/api/apps/{appId}/metrics/lambda", app.appHandler.AuthMiddleware(app.echartsHandler.GetLambdaMetricsECharts)).Methods("GET")
		r.HandleFunc("/api/apps/{appId}/metrics/apigateway", app.appHandler.AuthMiddleware(app.echartsHandler.GetAPIGatewayMetricsECharts)).Methods("GET")
		r.HandleFunc("/api/apps/{appId}/metrics/dynamodb", app.appHandler.AuthMiddleware(app.echartsHandler.GetDynamoDBMetricsECharts)).Methods("GET")
		r.HandleFunc("/api/apps/{appId}/metrics/costs", app.appHandler.AuthMiddleware(app.echartsHandler.GetCostMetricsECharts)).Methods("GET")
		r.HandleFunc("/api/apps/{appId}/metrics/appstore/downloads", app.appHandler.AuthMiddleware(app.echartsHandler.GetAppStoreMetricsECharts)).Methods("GET")
		r.HandleFunc("/api/apps/{appId}/metrics/appstore/revenue", app.appHandler.AuthMiddleware(app.echartsHandler.GetAppStoreMetricsECharts)).Methods("GET")

		// Additional frontend-expected endpoints
		r.HandleFunc("/api/apps/{appId}/metrics/aws/lambda/timeseries", app.appHandler.AuthMiddleware(app.echartsHandler.GetLambdaTimeSeriesECharts)).Methods("GET")
		r.HandleFunc("/api/apps/{appId}/metrics/aws/lambda/functions", app.appHandler.AuthMiddleware(app.echartsHandler.GetLambdaFunctionsECharts)).Methods("GET")
		r.HandleFunc("/api/apps/{appId}/metrics/aws/cost/breakdown", app.appHandler.AuthMiddleware(app.echartsHandler.GetCostBreakdownECharts)).Methods("GET")
		r.HandleFunc("/api/apps/{appId}/metrics/aws/cost/daily", app.appHandler.AuthMiddleware(app.echartsHandler.GetCostDailyECharts)).Methods("GET")
		r.HandleFunc("/api/apps/{appId}/metrics/aws/cost/projection", app.appHandler.AuthMiddleware(app.echartsHandler.GetCostProjectionECharts)).Methods("GET")
		r.HandleFunc("/api/apps/{appId}/metrics/appstore/credit-packs", app.appHandler.AuthMiddleware(app.echartsHandler.GetCreditPacksECharts)).Methods("GET")
		r.HandleFunc("/api/apps/{appId}/metrics/appstore/geographic", app.appHandler.AuthMiddleware(app.echartsHandler.GetGeographicECharts)).Methods("GET")
		r.HandleFunc("/api/apps/{appId}/metrics/appstore/engagement", app.appHandler.AuthMiddleware(app.echartsHandler.GetEngagementECharts)).Methods("GET")
	}
}

// handleHealth handles health check requests
func (app *App) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"status":"healthy","timestamp":%d,"environment":"%s"}`, time.Now().Unix(), app.config.Environment)
}

// handleAppleAuth handles Apple authentication (development fallback)
func (app *App) handleAppleAuth(w http.ResponseWriter, r *http.Request) {
	app.logger.Debug("Apple auth endpoint called")

	var req AppleAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		app.logger.Error("Error decoding auth request", "error", err)
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Decode the ID token to get the sub
	var userSub string
	if req.IDToken != "" {
		// Parse the JWT to extract the sub claim
		parts := strings.Split(req.IDToken, ".")
		if len(parts) == 3 {
			payload, err := base64.RawURLEncoding.DecodeString(parts[1])
			if err == nil {
				var claims map[string]interface{}
				if err := json.Unmarshal(payload, &claims); err == nil {
					if sub, ok := claims["sub"].(string); ok {
						userSub = sub
					}
				}
			}
		}
	}

	// Fallback to req.User if sub extraction failed (shouldn't happen)
	if userSub == "" {
		userSub = req.User
		if userSub == "" {
			userSub = "unknown-user"
		}
	}

	app.logger.Info("Auth request", "user", userSub, "email", req.Email)

	adminSub := app.config.AdminAppleSub
	if adminSub == "" {
		adminSub = "dev-admin-sub"
	}

	// Generate JWT token
	accessToken, err := app.appHandler.JWTManager.GenerateToken(&auth.AppleUserInfo{
		Sub:     userSub,
		Email:   req.Email,
		IsAdmin: userSub == adminSub,
	})
	if err != nil {
		app.logger.Error("Failed to generate token", "error", err)
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Construct full name from given and family names
	var fullName string
	if req.FullName.GivenName != "" || req.FullName.FamilyName != "" {
		fullName = strings.TrimSpace(req.FullName.GivenName + " " + req.FullName.FamilyName)
	}

	response := AuthResponse{
		AccessToken: accessToken,
		User: User{
			ID:      userSub,
			Email:   req.Email,
			Name:    fullName,
			IsAdmin: userSub == adminSub,
		},
		ExpiresIn: 86400,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	app.logger.Info("Auth response sent")
}

// Router returns the configured router with CORS
func (app *App) Router() http.Handler {
	return app.corsHandler.Handler(app.router)
}

// Shutdown gracefully shuts down the application
func (app *App) Shutdown(ctx context.Context) error {
	app.logger.Info("Application shutdown initiated")
	// Add cleanup logic here if needed
	return nil
}

// Request/Response types for local server
type AppleAuthRequest struct {
	IDToken           string `json:"idToken"`
	AuthorizationCode string `json:"authorizationCode"`
	User              string `json:"user"`
	Email             string `json:"email"`
	FullName          struct {
		GivenName  string `json:"givenName"`
		FamilyName string `json:"familyName"`
	} `json:"fullName"`
}

type AuthResponse struct {
	AccessToken string `json:"accessToken"`
	User        User   `json:"user"`
	ExpiresIn   int64  `json:"expiresIn"`
}

type User struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	IsAdmin bool   `json:"isAdmin"`
}
