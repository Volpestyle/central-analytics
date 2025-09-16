package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/jamesvolpe/central-analytics/backend/internal/handlers"
	"github.com/rs/cors"
)

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
	AccessToken       string    `json:"accessToken"`
	RefreshToken      string    `json:"refreshToken"`
	User              User      `json:"user"`
	TwoFactorRequired bool      `json:"twoFactorRequired"`
	Challenge         string    `json:"challenge,omitempty"`
}

type User struct {
	ID               string    `json:"id"`
	Email            string    `json:"email"`
	Name             string    `json:"name"`
	AppleUserSub     string    `json:"appleUserSub"`
	IsAdmin          bool      `json:"isAdmin"`
	BiometricEnabled bool      `json:"biometricEnabled"`
	LastAuthenticated time.Time `json:"lastAuthenticated"`
}

func handleAppleAuth(w http.ResponseWriter, r *http.Request) {
	log.Println("Apple auth endpoint called")

	var req AppleAuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request: %v", err)
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	log.Printf("Auth request for user: %s, email: %s", req.User, req.Email)

	// For local development, we'll accept the Apple token and create a session
	// In production, you'd verify the token with Apple's servers

	adminSub := os.Getenv("ADMIN_APPLE_SUB")
	if adminSub == "" {
		adminSub = "your_admin_apple_id_sub_identifier" // fallback for local dev
	}

	// Create response
	response := AuthResponse{
		AccessToken:  fmt.Sprintf("access-%d", time.Now().Unix()),
		RefreshToken: fmt.Sprintf("refresh-%d", time.Now().Unix()),
		User: User{
			ID:                req.User,
			Email:             req.Email,
			Name:              req.FullName.GivenName,
			AppleUserSub:      req.User,
			IsAdmin:           req.User == adminSub,
			BiometricEnabled:  false,
			LastAuthenticated: time.Now(),
		},
		TwoFactorRequired: false,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	log.Println("Auth response sent successfully")
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r := mux.NewRouter()

	// Initialize app handler
	appHandler, err := handlers.NewAppHandler()
	if err != nil {
		log.Printf("Warning: Failed to initialize app handler: %v", err)
	}

	// Initialize metrics aggregator
	var metricsAggregator *handlers.MetricsAggregator
	if appHandler != nil {
		metricsAggregator = handlers.NewMetricsAggregator(appHandler)
	}

	// Initialize time series handler
	var timeSeriesHandler *handlers.TimeSeriesHandler
	if appHandler != nil {
		timeSeriesHandler = handlers.NewTimeSeriesHandler(appHandler)
	}

	// Apple auth endpoint
	r.HandleFunc("/api/auth/apple", handleAppleAuth).Methods("POST")

	// AWS Infrastructure Dashboard endpoints (protected)
	if appHandler != nil {
		// Lambda metrics
		r.HandleFunc("/api/apps/{appId}/aws/lambda",
			appHandler.AuthMiddleware(appHandler.GetLambdaMetrics)).Methods("GET")

		// API Gateway metrics
		r.HandleFunc("/api/apps/{appId}/aws/apigateway",
			appHandler.AuthMiddleware(appHandler.GetAPIGatewayMetrics)).Methods("GET")

		// DynamoDB metrics
		r.HandleFunc("/api/apps/{appId}/aws/dynamodb",
			appHandler.AuthMiddleware(appHandler.GetDynamoDBMetrics)).Methods("GET")

		// Cost analytics
		r.HandleFunc("/api/apps/{appId}/aws/costs",
			appHandler.AuthMiddleware(appHandler.GetCostAnalytics)).Methods("GET")

		// App Store Analytics endpoints (protected)
		r.HandleFunc("/api/apps/{appId}/appstore/downloads",
			appHandler.AuthMiddleware(appHandler.GetAppStoreDownloads)).Methods("GET")

		r.HandleFunc("/api/apps/{appId}/appstore/revenue",
			appHandler.AuthMiddleware(appHandler.GetAppStoreRevenue)).Methods("GET")

		// Health status endpoint (protected)
		r.HandleFunc("/api/apps/{appId}/health",
			appHandler.AuthMiddleware(appHandler.GetHealthStatus)).Methods("GET")

		// Aggregated metrics endpoint (protected)
		if metricsAggregator != nil {
			r.HandleFunc("/api/apps/{appId}/metrics/aggregated",
				appHandler.AuthMiddleware(metricsAggregator.GetAggregatedMetrics)).Methods("GET")
		}

		// Time series endpoints (protected)
		if timeSeriesHandler != nil {
			r.HandleFunc("/api/apps/{appId}/timeseries/lambda",
				appHandler.AuthMiddleware(timeSeriesHandler.GetLambdaTimeSeries)).Methods("GET")

			r.HandleFunc("/api/apps/{appId}/timeseries/apigateway",
				appHandler.AuthMiddleware(timeSeriesHandler.GetAPIGatewayTimeSeries)).Methods("GET")

			r.HandleFunc("/api/apps/{appId}/timeseries/dynamodb",
				appHandler.AuthMiddleware(timeSeriesHandler.GetDynamoDBTimeSeries)).Methods("GET")

			r.HandleFunc("/api/apps/{appId}/timeseries/cost",
				appHandler.AuthMiddleware(timeSeriesHandler.GetCostTimeSeries)).Methods("GET")
		}
	}

	// Health check
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:4321", "https://*.ngrok-free.app", "https://*.ngrok.io"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := c.Handler(r)

	log.Printf("Starting server on port %s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal(err)
	}
}