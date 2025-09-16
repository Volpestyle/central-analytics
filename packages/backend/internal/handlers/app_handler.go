package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/jamesvolpe/central-analytics/backend/internal/auth"
	"github.com/jamesvolpe/central-analytics/backend/internal/aws"
	"github.com/jamesvolpe/central-analytics/backend/internal/appstore"
	appconfig "github.com/jamesvolpe/central-analytics/backend/internal/config"
	"github.com/aws/aws-sdk-go-v2/config"
)

// AppHandler handles application analytics endpoints
type AppHandler struct {
	cloudWatch   *aws.CloudWatchClient
	costExplorer *aws.CostExplorerClient
	dynamoDB     *aws.DynamoDBClient
	appStore     *appstore.AppStoreConnectClient
	jwtManager   *auth.JWTManager
	appsConfig   *appconfig.AppsConfiguration
}

// NewAppHandler creates a new application handler
func NewAppHandler() (*AppHandler, error) {
	// Initialize AWS config
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Initialize App Store Connect client
	keyID := os.Getenv("APP_STORE_KEY_ID")
	issuerID := os.Getenv("APP_STORE_ISSUER_ID")
	privateKey := os.Getenv("APP_STORE_PRIVATE_KEY")

	var appStoreClient *appstore.AppStoreConnectClient
	if keyID != "" && issuerID != "" && privateKey != "" {
		appStoreClient, err = appstore.NewAppStoreConnectClient(keyID, issuerID, []byte(privateKey))
		if err != nil {
			// Log error but continue without App Store integration
			fmt.Printf("Failed to initialize App Store Connect client: %v\n", err)
		}
	}

	// Initialize JWT manager
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "development-secret-change-in-production"
	}
	jwtManager := auth.NewJWTManager([]byte(jwtSecret), "central-analytics", 24*time.Hour)

	// Initialize apps configuration
	appsConfig := appconfig.NewAppsConfiguration()

	return &AppHandler{
		cloudWatch:   aws.NewCloudWatchClient(cfg),
		costExplorer: aws.NewCostExplorerClient(cfg),
		dynamoDB:     aws.NewDynamoDBClient(cfg),
		appStore:     appStoreClient,
		jwtManager:   jwtManager,
		appsConfig:   appsConfig,
	}, nil
}

// AuthMiddleware validates JWT tokens and checks admin access
func (h *AppHandler) AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		// Remove "Bearer " prefix
		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == authHeader {
			http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
			return
		}

		// Validate token
		claims, err := h.jwtManager.ValidateToken(token)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Check admin access
		if !claims.IsAdmin {
			http.Error(w, "Admin access required", http.StatusForbidden)
			return
		}

		// Add claims to context
		ctx := context.WithValue(r.Context(), "claims", claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// GetLambdaMetrics handles Lambda metrics endpoint
func (h *AppHandler) GetLambdaMetrics(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Define Lambda functions for the app
	lambdaFunctions := h.getLambdaFunctionsForApp(appID)

	var allMetrics []*aws.LambdaMetrics
	for _, functionName := range lambdaFunctions {
		metrics, err := h.cloudWatch.GetLambdaMetrics(r.Context(), functionName, startTime, endTime)
		if err != nil {
			fmt.Printf("Error getting metrics for Lambda %s: %v\n", functionName, err)
			continue
		}
		allMetrics = append(allMetrics, metrics)
	}

	// Create response
	response := map[string]interface{}{
		"appId":     appID,
		"metrics":   allMetrics,
		"period":    fmt.Sprintf("%s to %s", startTime.Format(time.RFC3339), endTime.Format(time.RFC3339)),
		"timestamp": time.Now().Unix(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetAPIGatewayMetrics handles API Gateway metrics endpoint
func (h *AppHandler) GetAPIGatewayMetrics(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Get API Gateway name for the app
	apiName := h.getAPIGatewayForApp(appID)

	metrics, err := h.cloudWatch.GetAPIGatewayMetrics(r.Context(), apiName, startTime, endTime)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get API Gateway metrics: %v", err), http.StatusInternalServerError)
		return
	}

	// Create response
	response := map[string]interface{}{
		"appId":     appID,
		"metrics":   metrics,
		"timestamp": time.Now().Unix(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetDynamoDBMetrics handles DynamoDB metrics endpoint
func (h *AppHandler) GetDynamoDBMetrics(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Get DynamoDB tables for the app
	tables := h.getDynamoDBTablesForApp(appID)

	metrics, err := h.dynamoDB.GetMultipleTableMetrics(r.Context(), tables, startTime, endTime)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get DynamoDB metrics: %v", err), http.StatusInternalServerError)
		return
	}

	// Create response
	response := map[string]interface{}{
		"appId":     appID,
		"metrics":   metrics,
		"timestamp": time.Now().Unix(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetCostAnalytics handles AWS cost analytics endpoint
func (h *AppHandler) GetCostAnalytics(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Get cost data
	costData, err := h.costExplorer.GetCostAndUsage(r.Context(), startTime, endTime)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get cost data: %v", err), http.StatusInternalServerError)
		return
	}

	// Get cost forecast
	forecast, err := h.costExplorer.GetForecast(r.Context(), 30)
	if err != nil {
		fmt.Printf("Failed to get cost forecast: %v\n", err)
	}

	// Create response
	response := map[string]interface{}{
		"appId":     appID,
		"current":   costData,
		"forecast":  forecast,
		"timestamp": time.Now().Unix(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetAppStoreDownloads handles App Store downloads metrics endpoint
func (h *AppHandler) GetAppStoreDownloads(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	if h.appStore == nil {
		http.Error(w, "App Store Connect not configured", http.StatusServiceUnavailable)
		return
	}

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Get App Store analytics
	analytics, err := h.appStore.GetAppAnalytics(r.Context(), h.getAppStoreIDForApp(appID), startTime, endTime)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get App Store analytics: %v", err), http.StatusInternalServerError)
		return
	}

	// Create response focused on downloads
	response := map[string]interface{}{
		"appId":         appID,
		"downloads":     analytics.Downloads,
		"updates":       analytics.Updates,
		"activeDevices": analytics.ActiveDevices,
		"period":        analytics.Period,
		"timestamp":     time.Now().Unix(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetAppStoreRevenue handles App Store revenue metrics endpoint
func (h *AppHandler) GetAppStoreRevenue(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	if h.appStore == nil {
		http.Error(w, "App Store Connect not configured", http.StatusServiceUnavailable)
		return
	}

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Get App Store analytics
	analytics, err := h.appStore.GetAppAnalytics(r.Context(), h.getAppStoreIDForApp(appID), startTime, endTime)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get App Store revenue: %v", err), http.StatusInternalServerError)
		return
	}

	// Calculate ARPU (Average Revenue Per User)
	arpu := float64(0)
	if analytics.ActiveDevices > 0 {
		arpu = analytics.Revenue / float64(analytics.ActiveDevices)
	}

	// Create response focused on revenue
	response := map[string]interface{}{
		"appId":    appID,
		"revenue":  analytics.Revenue,
		"arpu":     arpu,
		"ratings":  analytics.Ratings,
		"period":   analytics.Period,
		"timestamp": time.Now().Unix(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetHealthStatus handles health status endpoint
func (h *AppHandler) GetHealthStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	// Get current time for recent metrics (last hour)
	endTime := time.Now()
	startTime := endTime.Add(-1 * time.Hour)

	health := map[string]interface{}{
		"appId":     appID,
		"status":    "healthy",
		"timestamp": time.Now().Unix(),
		"services":  map[string]string{},
	}

	// Check Lambda health
	lambdaFunctions := h.getLambdaFunctionsForApp(appID)
	lambdaHealthy := true
	for _, functionName := range lambdaFunctions {
		metrics, err := h.cloudWatch.GetLambdaMetrics(r.Context(), functionName, startTime, endTime)
		if err != nil {
			health["services"].(map[string]string)[functionName] = "unknown"
			continue
		}

		// Check error rate
		errorRate := float64(0)
		if metrics.Invocations > 0 {
			errorRate = (metrics.Errors / metrics.Invocations) * 100
		}

		if errorRate > 5 || metrics.Throttles > 0 {
			health["services"].(map[string]string)[functionName] = "degraded"
			lambdaHealthy = false
		} else {
			health["services"].(map[string]string)[functionName] = "healthy"
		}
	}

	// Check API Gateway health
	apiName := h.getAPIGatewayForApp(appID)
	apiMetrics, err := h.cloudWatch.GetAPIGatewayMetrics(r.Context(), apiName, startTime, endTime)
	if err != nil {
		health["services"].(map[string]string)["apiGateway"] = "unknown"
	} else {
		errorRate := float64(0)
		if apiMetrics.Count > 0 {
			errorRate = ((apiMetrics.Error4XX + apiMetrics.Error5XX) / apiMetrics.Count) * 100
		}

		if errorRate > 5 || apiMetrics.Latency > 1000 {
			health["services"].(map[string]string)["apiGateway"] = "degraded"
			lambdaHealthy = false
		} else {
			health["services"].(map[string]string)["apiGateway"] = "healthy"
		}
	}

	// Check DynamoDB health
	tables := h.getDynamoDBTablesForApp(appID)
	dynamoHealthy := true
	for _, table := range tables {
		metrics, err := h.dynamoDB.GetTableMetrics(r.Context(), table, startTime, endTime)
		if err != nil {
			health["services"].(map[string]string)[table] = "unknown"
			continue
		}

		if metrics.ThrottledRequests > 0 || metrics.SystemErrors > 0 {
			health["services"].(map[string]string)[table] = "degraded"
			dynamoHealthy = false
		} else {
			health["services"].(map[string]string)[table] = "healthy"
		}
	}

	// Set overall health status
	if !lambdaHealthy || !dynamoHealthy {
		health["status"] = "degraded"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

// Helper functions

func parseTimeRange(r *http.Request) (time.Time, time.Time) {
	// Default to last 24 hours
	endTime := time.Now()
	startTime := endTime.Add(-24 * time.Hour)

	// Parse query parameters
	if start := r.URL.Query().Get("start"); start != "" {
		if t, err := time.Parse(time.RFC3339, start); err == nil {
			startTime = t
		}
	}

	if end := r.URL.Query().Get("end"); end != "" {
		if t, err := time.Parse(time.RFC3339, end); err == nil {
			endTime = t
		}
	}

	return startTime, endTime
}

func (h *AppHandler) getLambdaFunctionsForApp(appID string) []string {
	return h.appsConfig.GetLambdaFunctions(appID)
}

func (h *AppHandler) getAPIGatewayForApp(appID string) string {
	return h.appsConfig.GetAPIGateway(appID)
}

func (h *AppHandler) getDynamoDBTablesForApp(appID string) []string {
	return h.appsConfig.GetDynamoDBTables(appID)
}

func (h *AppHandler) getAppStoreIDForApp(appID string) string {
	return h.appsConfig.GetAppStoreID(appID)
}