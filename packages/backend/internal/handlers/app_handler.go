package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/jamesvolpe/central-analytics/backend/internal/appstore"
	"github.com/jamesvolpe/central-analytics/backend/internal/auth"
	"github.com/jamesvolpe/central-analytics/backend/internal/aws"
	appconfig "github.com/jamesvolpe/central-analytics/backend/internal/config"
)

// AppHandler handles application analytics endpoints
type AppHandler struct {
	CloudWatch   *aws.CloudWatchClient
	CostExplorer *aws.CostExplorerClient
	DynamoDB     *aws.DynamoDBClient
	AppStore     *appstore.AppStoreConnectClient
	JWTManager   *auth.JWTManager
	AppsConfig   *appconfig.AppsConfiguration
	Logger       *slog.Logger
}

// NewAppHandler creates a new application handler with injected dependencies
func NewAppHandler(
	cloudWatch *aws.CloudWatchClient,
	costExplorer *aws.CostExplorerClient,
	dynamoDB *aws.DynamoDBClient,
	appStore *appstore.AppStoreConnectClient,
	jwtManager *auth.JWTManager,
	appsConfig *appconfig.AppsConfiguration,
	logger *slog.Logger,
) *AppHandler {
	return &AppHandler{
		CloudWatch:   cloudWatch,
		CostExplorer: costExplorer,
		DynamoDB:     dynamoDB,
		AppStore:     appStore,
		JWTManager:   jwtManager,
		AppsConfig:   appsConfig,
		Logger:       logger,
	}
}

// AuthMiddleware validates JWT tokens and checks admin access
func (h *AppHandler) AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h.Logger.Debug("AuthMiddleware called", "path", r.URL.Path, "method", r.Method)
		// Extract token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			h.Logger.Warn("No Authorization header", "path", r.URL.Path)
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		// Remove "Bearer " prefix
		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == authHeader {
			h.Logger.Warn("Invalid authorization format", "header", authHeader)
			http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
			return
		}

		// Validate token
		claims, err := h.JWTManager.ValidateToken(token)
		if err != nil {
			h.Logger.Warn("Token validation failed", "error", err)
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}
		h.Logger.Debug("Token validated", "userID", claims.UserID, "isAdmin", claims.IsAdmin)

		// Check admin access
		if !claims.IsAdmin {
			h.Logger.Warn("Non-admin user attempted access", "userID", claims.UserID, "path", r.URL.Path)
			http.Error(w, "Admin access required", http.StatusForbidden)
			return
		}
		h.Logger.Debug("Admin access granted", "userID", claims.UserID)

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

	// Get Lambda functions for the app
	lambdaFunctions := h.AppsConfig.GetLambdaFunctions(appID)

	var allMetrics []*aws.LambdaMetrics
	for _, functionName := range lambdaFunctions {
		metrics, err := h.CloudWatch.GetLambdaMetrics(r.Context(), functionName, startTime, endTime)
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
	apiName := h.AppsConfig.GetAPIGateway(appID)

	metrics, err := h.CloudWatch.GetAPIGatewayMetrics(r.Context(), apiName, startTime, endTime)
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
	tables := h.AppsConfig.GetDynamoDBTables(appID)

	metrics, err := h.DynamoDB.GetMultipleTableMetrics(r.Context(), tables, startTime, endTime)
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
	costData, err := h.CostExplorer.GetCostAndUsage(r.Context(), startTime, endTime)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get cost data: %v", err), http.StatusInternalServerError)
		return
	}

	// Get cost forecast
	forecast, err := h.CostExplorer.GetForecast(r.Context(), 30)
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

	if h.AppStore == nil {
		http.Error(w, "App Store Connect not configured", http.StatusServiceUnavailable)
		return
	}

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Get App Store analytics
	analytics, err := h.AppStore.GetAppAnalytics(r.Context(), h.AppsConfig.GetAppStoreID(appID), startTime, endTime)
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

	if h.AppStore == nil {
		http.Error(w, "App Store Connect not configured", http.StatusServiceUnavailable)
		return
	}

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Get App Store analytics
	analytics, err := h.AppStore.GetAppAnalytics(r.Context(), h.AppsConfig.GetAppStoreID(appID), startTime, endTime)
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
		"appId":     appID,
		"revenue":   analytics.Revenue,
		"arpu":      arpu,
		"ratings":   analytics.Ratings,
		"period":    analytics.Period,
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
	lambdaFunctions := h.AppsConfig.GetLambdaFunctions(appID)
	lambdaHealthy := true
	for _, functionName := range lambdaFunctions {
		metrics, err := h.CloudWatch.GetLambdaMetrics(r.Context(), functionName, startTime, endTime)
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
	apiName := h.AppsConfig.GetAPIGateway(appID)
	apiMetrics, err := h.CloudWatch.GetAPIGatewayMetrics(r.Context(), apiName, startTime, endTime)
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
	tables := h.AppsConfig.GetDynamoDBTables(appID)
	dynamoHealthy := true
	for _, tableName := range tables {
		metrics, err := h.DynamoDB.GetTableMetrics(r.Context(), tableName, startTime, endTime)
		if err != nil {
			health["services"].(map[string]string)[tableName] = "unknown"
			continue
		}

		if metrics.ThrottledRequests > 0 || metrics.SystemErrors > 0 {
			health["services"].(map[string]string)[tableName] = "degraded"
			dynamoHealthy = false
		} else {
			health["services"].(map[string]string)[tableName] = "healthy"
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
