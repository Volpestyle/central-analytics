package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"sort"
	"time"

	"github.com/gorilla/mux"
)

// EChartsHandler formats data specifically for ECharts visualization
type EChartsHandler struct {
	appHandler *AppHandler
	logger     *slog.Logger
}

// NewEChartsHandler creates a new ECharts data handler
func NewEChartsHandler(appHandler *AppHandler, logger *slog.Logger) *EChartsHandler {
	return &EChartsHandler{
		appHandler: appHandler,
		logger:     logger,
	}
}

// EChartsResponse represents data formatted for ECharts
type EChartsResponse struct {
	Data     []EChartsDataPoint     `json:"data"`
	Metadata map[string]interface{} `json:"metadata"`
}

// EChartsDataPoint represents a single data point for ECharts
type EChartsDataPoint struct {
	Timestamp string  `json:"timestamp"`
	Value     float64 `json:"value"`
}

// GetLambdaMetricsECharts returns Lambda metrics formatted for ECharts
func (h *EChartsHandler) GetLambdaMetricsECharts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]
	metricType := r.URL.Query().Get("metric")

	if metricType == "" {
		metricType = "invocations"
	}

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Get Lambda functions for the app
	lambdaFunctions := h.appHandler.AppsConfig.GetLambdaFunctions(appID)

	// Collect all data points across functions
	dataPointsMap := make(map[time.Time]float64)

	for _, functionName := range lambdaFunctions {
		metrics, err := h.appHandler.CloudWatch.GetLambdaMetrics(context.Background(), functionName, startTime, endTime)
		if err != nil {
			continue
		}

		// Aggregate datapoints
		for _, dp := range metrics.Datapoints {
			// Round timestamp to nearest 5 minutes for aggregation
			roundedTime := dp.Timestamp.Round(5 * time.Minute)
			dataPointsMap[roundedTime] += dp.Value
		}
	}

	// Convert map to sorted slice
	var dataPoints []EChartsDataPoint
	for timestamp, value := range dataPointsMap {
		dataPoints = append(dataPoints, EChartsDataPoint{
			Timestamp: timestamp.Format("2006-01-02T15:04:05Z"),
			Value:     value,
		})
	}

	// Sort by timestamp
	sort.Slice(dataPoints, func(i, j int) bool {
		return dataPoints[i].Timestamp < dataPoints[j].Timestamp
	})

	response := EChartsResponse{
		Data: dataPoints,
		Metadata: map[string]interface{}{
			"appId":      appID,
			"metricType": "lambda:" + metricType,
			"functions":  lambdaFunctions,
			"period":     formatPeriod(startTime, endTime),
			"unit":       h.getMetricUnit(metricType),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetAPIGatewayMetricsECharts returns API Gateway metrics formatted for ECharts
func (h *EChartsHandler) GetAPIGatewayMetricsECharts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]
	metricType := r.URL.Query().Get("metric")

	if metricType == "" {
		metricType = "requests"
	}

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Get API Gateway name
	apiName := h.appHandler.AppsConfig.GetAPIGateway(appID)
	if apiName == "" {
		http.Error(w, "No API Gateway configured for this app", http.StatusNotFound)
		return
	}

	metrics, err := h.appHandler.CloudWatch.GetAPIGatewayMetrics(context.Background(), apiName, startTime, endTime)
	if err != nil {
		http.Error(w, "Failed to get API Gateway metrics", http.StatusInternalServerError)
		return
	}

	// Convert datapoints to ECharts format
	var dataPoints []EChartsDataPoint
	for _, dp := range metrics.Datapoints {
		dataPoints = append(dataPoints, EChartsDataPoint{
			Timestamp: dp.Timestamp.Format("2006-01-02T15:04:05Z"),
			Value:     dp.Value,
		})
	}

	// Sort by timestamp
	sort.Slice(dataPoints, func(i, j int) bool {
		return dataPoints[i].Timestamp < dataPoints[j].Timestamp
	})

	response := EChartsResponse{
		Data: dataPoints,
		Metadata: map[string]interface{}{
			"appId":      appID,
			"metricType": "apigateway:" + metricType,
			"apiName":    apiName,
			"period":     formatPeriod(startTime, endTime),
			"unit":       h.getAPIGatewayUnit(metricType),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetDynamoDBMetricsECharts returns DynamoDB metrics formatted for ECharts
func (h *EChartsHandler) GetDynamoDBMetricsECharts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]
	metricType := r.URL.Query().Get("metric")

	if metricType == "" {
		metricType = "consumed"
	}

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Get DynamoDB tables
	tables := h.appHandler.AppsConfig.GetDynamoDBTables(appID)

	// Collect all data points across tables
	dataPointsMap := make(map[time.Time]float64)

	for _, tableName := range tables {
		metrics, err := h.appHandler.DynamoDB.GetTableMetrics(context.Background(), tableName, startTime, endTime)
		if err != nil {
			continue
		}

		// Aggregate datapoints
		for _, dp := range metrics.Datapoints {
			// Round timestamp to nearest 5 minutes for aggregation
			roundedTime := dp.Timestamp.Round(5 * time.Minute)
			dataPointsMap[roundedTime] += dp.Value
		}
	}

	// Convert map to sorted slice
	var dataPoints []EChartsDataPoint
	for timestamp, value := range dataPointsMap {
		dataPoints = append(dataPoints, EChartsDataPoint{
			Timestamp: timestamp.Format("2006-01-02T15:04:05Z"),
			Value:     value,
		})
	}

	// Sort by timestamp
	sort.Slice(dataPoints, func(i, j int) bool {
		return dataPoints[i].Timestamp < dataPoints[j].Timestamp
	})

	response := EChartsResponse{
		Data: dataPoints,
		Metadata: map[string]interface{}{
			"appId":      appID,
			"metricType": "dynamodb:" + metricType,
			"tables":     tables,
			"period":     formatPeriod(startTime, endTime),
			"unit":       h.getDynamoDBUnit(metricType),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetCostMetricsECharts returns cost metrics formatted for ECharts
func (h *EChartsHandler) GetCostMetricsECharts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Get cost data
	costData, err := h.appHandler.CostExplorer.GetCostAndUsage(context.Background(), startTime, endTime)
	if err != nil {
		http.Error(w, "Failed to get cost data", http.StatusInternalServerError)
		return
	}

	// Convert daily costs to ECharts format
	var dataPoints []EChartsDataPoint
	for _, dailyCost := range costData.DailyCosts {
		dataPoints = append(dataPoints, EChartsDataPoint{
			Timestamp: dailyCost.Date,
			Value:     dailyCost.Cost,
		})
	}

	// Sort by timestamp
	sort.Slice(dataPoints, func(i, j int) bool {
		return dataPoints[i].Timestamp < dataPoints[j].Timestamp
	})

	// Calculate additional metrics
	var totalCost float64
	for _, dp := range dataPoints {
		totalCost += dp.Value
	}

	avgDailyCost := totalCost / float64(len(dataPoints))
	projectedMonthly := avgDailyCost * 30

	response := EChartsResponse{
		Data: dataPoints,
		Metadata: map[string]interface{}{
			"appId":            appID,
			"metricType":       "cost:daily",
			"period":           formatPeriod(startTime, endTime),
			"unit":             "USD",
			"totalCost":        totalCost,
			"avgDailyCost":     avgDailyCost,
			"projectedMonthly": projectedMonthly,
			"services":         costData.Services,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetAppStoreMetricsECharts returns App Store metrics formatted for ECharts
func (h *EChartsHandler) GetAppStoreMetricsECharts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]
	metricType := r.URL.Query().Get("metric")

	if metricType == "" {
		metricType = "downloads"
	}

	if h.appHandler.AppStore == nil {
		http.Error(w, "App Store Connect not configured", http.StatusServiceUnavailable)
		return
	}

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Get App Store analytics
	appStoreID := h.appHandler.AppsConfig.GetAppStoreID(appID)
	if appStoreID == "" {
		http.Error(w, "No App Store ID configured for this app", http.StatusNotFound)
		return
	}

	analytics, err := h.appHandler.AppStore.GetAppAnalytics(context.Background(), appStoreID, startTime, endTime)
	if err != nil {
		http.Error(w, "Failed to get App Store analytics", http.StatusInternalServerError)
		return
	}

	// For now, return single point data (App Store Connect API requires additional setup for time series)
	// In a production environment, you would fetch daily/hourly data from App Store Connect
	dataPoints := []EChartsDataPoint{
		{
			Timestamp: endTime.Format("2006-01-02T15:04:05Z"),
			Value:     float64(analytics.Downloads),
		},
	}

	if metricType == "revenue" {
		dataPoints[0].Value = analytics.Revenue
	} else if metricType == "active" {
		dataPoints[0].Value = float64(analytics.ActiveDevices)
	}

	response := EChartsResponse{
		Data: dataPoints,
		Metadata: map[string]interface{}{
			"appId":      appID,
			"metricType": "appstore:" + metricType,
			"appName":    analytics.AppName,
			"period":     formatPeriod(startTime, endTime),
			"unit":       h.getAppStoreUnit(metricType),
			"ratings":    analytics.Ratings,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetLambdaTimeSeriesECharts returns Lambda time series data formatted for ECharts
func (h *EChartsHandler) GetLambdaTimeSeriesECharts(w http.ResponseWriter, r *http.Request) {
	// This is the same as GetLambdaMetricsECharts but with time series focus
	h.GetLambdaMetricsECharts(w, r)
}

// GetLambdaFunctionsECharts returns Lambda functions list with metrics
func (h *EChartsHandler) GetLambdaFunctionsECharts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Get Lambda functions for the app
	lambdaFunctions := h.appHandler.AppsConfig.GetLambdaFunctions(appID)

	type FunctionMetrics struct {
		Name        string  `json:"name"`
		Invocations float64 `json:"invocations"`
		Errors      float64 `json:"errors"`
		Duration    float64 `json:"duration"`
		Cost        float64 `json:"cost"`
	}

	var functionsData []FunctionMetrics

	for _, functionName := range lambdaFunctions {
		metrics, err := h.appHandler.CloudWatch.GetLambdaMetrics(context.Background(), functionName, startTime, endTime)
		if err != nil {
			continue
		}

		var invocations, errors, duration float64
		for _, dp := range metrics.Datapoints {
			invocations += dp.Value
		}

		functionsData = append(functionsData, FunctionMetrics{
			Name:        functionName,
			Invocations: invocations,
			Errors:      errors,
			Duration:    duration / invocations,  // Average duration
			Cost:        invocations * 0.0000002, // Rough Lambda cost estimate
		})
	}

	response := map[string]interface{}{
		"data": functionsData,
		"metadata": map[string]interface{}{
			"appId":  appID,
			"period": formatPeriod(startTime, endTime),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetCostBreakdownECharts returns cost breakdown by service
func (h *EChartsHandler) GetCostBreakdownECharts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Get cost data
	costData, err := h.appHandler.CostExplorer.GetCostAndUsage(context.Background(), startTime, endTime)
	if err != nil {
		http.Error(w, "Failed to get cost data", http.StatusInternalServerError)
		return
	}

	// Create breakdown by service
	breakdown := []map[string]interface{}{}
	for service, cost := range costData.Services {
		breakdown = append(breakdown, map[string]interface{}{
			"service": service,
			"cost":    cost,
		})
	}

	response := map[string]interface{}{
		"data": breakdown,
		"metadata": map[string]interface{}{
			"appId":     appID,
			"period":    formatPeriod(startTime, endTime),
			"totalCost": costData.TotalCost,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetCostDailyECharts returns daily cost data
func (h *EChartsHandler) GetCostDailyECharts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Get cost data
	costData, err := h.appHandler.CostExplorer.GetCostAndUsage(context.Background(), startTime, endTime)
	if err != nil {
		http.Error(w, "Failed to get cost data", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"data": costData.DailyCosts,
		"metadata": map[string]interface{}{
			"appId":  appID,
			"period": formatPeriod(startTime, endTime),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetCostProjectionECharts returns cost projection data
func (h *EChartsHandler) GetCostProjectionECharts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	// Get last 30 days of cost data for projection
	endTime := time.Now()
	startTime := endTime.AddDate(0, 0, -30)

	costData, err := h.appHandler.CostExplorer.GetCostAndUsage(context.Background(), startTime, endTime)
	if err != nil {
		http.Error(w, "Failed to get cost data", http.StatusInternalServerError)
		return
	}

	// Calculate projection
	var totalCost float64
	for _, dailyCost := range costData.DailyCosts {
		totalCost += dailyCost.Cost
	}

	avgDailyCost := totalCost / float64(len(costData.DailyCosts))
	projectedMonthly := avgDailyCost * 30
	projectedYearly := avgDailyCost * 365

	response := map[string]interface{}{
		"data": map[string]interface{}{
			"currentMonth":     totalCost,
			"projectedMonthly": projectedMonthly,
			"projectedYearly":  projectedYearly,
			"avgDailyCost":     avgDailyCost,
		},
		"metadata": map[string]interface{}{
			"appId": appID,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetCreditPacksECharts returns credit pack sales data formatted for ECharts
// Returns error response if App Store Connect is not configured or data unavailable
func (h *EChartsHandler) GetCreditPacksECharts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Check if App Store Connect is configured
	if h.appHandler.AppStore == nil {
		response := map[string]interface{}{
			"data": []interface{}{},
			"metadata": map[string]interface{}{
				"appId":     appID,
				"period":    formatPeriod(startTime, endTime),
				"error":     "App Store Connect not configured",
				"available": false,
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Credit pack breakdown requires advanced App Store Connect reporting
	// This endpoint is not yet available in Apple's API
	response := map[string]interface{}{
		"data": []interface{}{},
		"metadata": map[string]interface{}{
			"appId":     appID,
			"period":    formatPeriod(startTime, endTime),
			"error":     "Credit pack breakdown not available from App Store Connect API",
			"available": false,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetGeographicECharts returns geographic distribution data formatted for ECharts
// Returns error response if App Store Connect is not configured or data unavailable
func (h *EChartsHandler) GetGeographicECharts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Check if App Store Connect is configured
	if h.appHandler.AppStore == nil {
		response := map[string]interface{}{
			"data": []interface{}{},
			"metadata": map[string]interface{}{
				"appId":     appID,
				"period":    formatPeriod(startTime, endTime),
				"error":     "App Store Connect not configured",
				"available": false,
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Geographic data requires additional App Store Connect setup
	// This endpoint is not yet available in Apple's reporting API
	response := map[string]interface{}{
		"data": []interface{}{},
		"metadata": map[string]interface{}{
			"appId":     appID,
			"period":    formatPeriod(startTime, endTime),
			"error":     "Geographic distribution not available from App Store Connect API",
			"available": false,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetEngagementECharts returns user engagement metrics formatted for ECharts
// Returns error response if App Store Connect is not configured or data unavailable
func (h *EChartsHandler) GetEngagementECharts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Check if App Store Connect is configured
	if h.appHandler.AppStore == nil {
		response := map[string]interface{}{
			"data": []interface{}{},
			"metadata": map[string]interface{}{
				"appId":     appID,
				"period":    formatPeriod(startTime, endTime),
				"error":     "App Store Connect not configured",
				"available": false,
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Engagement metrics require advanced App Store Connect setup
	// This endpoint is not yet available in Apple's reporting API
	response := map[string]interface{}{
		"data": []interface{}{},
		"metadata": map[string]interface{}{
			"appId":     appID,
			"period":    formatPeriod(startTime, endTime),
			"error":     "User engagement metrics not available from App Store Connect API",
			"available": false,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Helper functions
func (h *EChartsHandler) getMetricUnit(metricType string) string {
	switch metricType {
	case "invocations", "errors", "throttles":
		return "count"
	case "duration":
		return "milliseconds"
	case "concurrent":
		return "executions"
	default:
		return "count"
	}
}

func (h *EChartsHandler) getAPIGatewayUnit(metricType string) string {
	switch metricType {
	case "requests", "errors", "4xx", "5xx":
		return "count"
	case "latency":
		return "milliseconds"
	default:
		return "count"
	}
}

func (h *EChartsHandler) getDynamoDBUnit(metricType string) string {
	switch metricType {
	case "consumed", "read", "write":
		return "capacity_units"
	case "throttles", "errors":
		return "count"
	default:
		return "count"
	}
}

func (h *EChartsHandler) getAppStoreUnit(metricType string) string {
	switch metricType {
	case "downloads", "active":
		return "count"
	case "revenue":
		return "USD"
	default:
		return "count"
	}
}
