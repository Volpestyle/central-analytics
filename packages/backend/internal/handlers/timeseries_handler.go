package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

// TimeSeriesHandler handles time series data endpoints
type TimeSeriesHandler struct {
	appHandler *AppHandler
	logger     *slog.Logger
}

// NewTimeSeriesHandler creates a new time series handler
func NewTimeSeriesHandler(appHandler *AppHandler, logger *slog.Logger) *TimeSeriesHandler {
	return &TimeSeriesHandler{
		appHandler: appHandler,
		logger:     logger,
	}
}

// TimeSeriesData represents time series metrics data
type TimeSeriesData struct {
	AppID      string            `json:"appId"`
	MetricType string            `json:"metricType"`
	Period     string            `json:"period"`
	Interval   string            `json:"interval"`
	Series     []TimeSeriesPoint `json:"series"`
	Metadata   map[string]string `json:"metadata"`
	Timestamp  int64             `json:"timestamp"`
}

// TimeSeriesPoint represents a single point in time series
type TimeSeriesPoint struct {
	Timestamp time.Time              `json:"timestamp"`
	Value     float64                `json:"value"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

// GetLambdaTimeSeries returns Lambda metrics over time
func (h *TimeSeriesHandler) GetLambdaTimeSeries(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]
	metricName := r.URL.Query().Get("metric")

	if metricName == "" {
		metricName = "invocations" // Default metric
	}

	// Parse time range and interval
	startTime, endTime, interval := h.parseTimeSeriesParams(r)

	// Get Lambda functions for the app
	lambdaFunctions := h.appHandler.AppsConfig.GetLambdaFunctions(appID)

	series := []TimeSeriesPoint{}

	// Generate time series data points
	for current := startTime; current.Before(endTime); current = current.Add(interval) {
		pointEnd := current.Add(interval)
		if pointEnd.After(endTime) {
			pointEnd = endTime
		}

		totalValue := float64(0)
		successCount := 0

		// Aggregate metrics from all Lambda functions
		for _, functionName := range lambdaFunctions {
			metrics, err := h.appHandler.CloudWatch.GetLambdaMetrics(
				context.Background(),
				functionName,
				current,
				pointEnd,
			)
			if err != nil {
				continue
			}

			// Select the appropriate metric value
			switch metricName {
			case "invocations":
				totalValue += metrics.Invocations
			case "errors":
				totalValue += metrics.Errors
			case "duration":
				totalValue += metrics.Duration
			case "throttles":
				totalValue += metrics.Throttles
			case "concurrent":
				totalValue += metrics.ConcurrentExecutions
			}
			successCount++
		}

		// Calculate average for duration metric
		if metricName == "duration" && successCount > 0 {
			totalValue = totalValue / float64(successCount)
		}

		series = append(series, TimeSeriesPoint{
			Timestamp: current,
			Value:     totalValue,
			Metadata: map[string]interface{}{
				"functions": len(lambdaFunctions),
				"interval":  interval.String(),
			},
		})
	}

	response := TimeSeriesData{
		AppID:      appID,
		MetricType: "lambda:" + metricName,
		Period:     formatPeriod(startTime, endTime),
		Interval:   interval.String(),
		Series:     series,
		Metadata: map[string]string{
			"unit":      h.getMetricUnit(metricName),
			"functions": strconv.Itoa(len(lambdaFunctions)),
		},
		Timestamp: time.Now().Unix(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetCostTimeSeries returns cost metrics over time
func (h *TimeSeriesHandler) GetCostTimeSeries(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	// Parse time range
	startTime, endTime, _ := h.parseTimeSeriesParams(r)

	// Get daily cost data
	costData, err := h.appHandler.CostExplorer.GetCostAndUsage(
		context.Background(),
		startTime,
		endTime,
	)

	series := []TimeSeriesPoint{}

	if err == nil && costData != nil {
		for _, dailyCost := range costData.DailyCosts {
			// Parse the date string
			t, _ := time.Parse("2006-01-02", dailyCost.Date)

			series = append(series, TimeSeriesPoint{
				Timestamp: t,
				Value:     dailyCost.Cost,
				Metadata: map[string]interface{}{
					"currency": "USD",
				},
			})
		}
	}

	response := TimeSeriesData{
		AppID:      appID,
		MetricType: "cost:daily",
		Period:     formatPeriod(startTime, endTime),
		Interval:   "24h",
		Series:     series,
		Metadata: map[string]string{
			"unit":     "USD",
			"currency": "USD",
		},
		Timestamp: time.Now().Unix(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetAPIGatewayTimeSeries returns API Gateway metrics over time
func (h *TimeSeriesHandler) GetAPIGatewayTimeSeries(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]
	metricName := r.URL.Query().Get("metric")

	if metricName == "" {
		metricName = "count" // Default metric
	}

	// Parse time range and interval
	startTime, endTime, interval := h.parseTimeSeriesParams(r)

	// Get API Gateway for the app
	apiName := h.appHandler.AppsConfig.GetAPIGateway(appID)
	if apiName == "" {
		http.Error(w, "No API Gateway configured for this app", http.StatusNotFound)
		return
	}

	series := []TimeSeriesPoint{}

	// Generate time series data points
	for current := startTime; current.Before(endTime); current = current.Add(interval) {
		pointEnd := current.Add(interval)
		if pointEnd.After(endTime) {
			pointEnd = endTime
		}

		metrics, err := h.appHandler.CloudWatch.GetAPIGatewayMetrics(
			context.Background(),
			apiName,
			current,
			pointEnd,
		)

		value := float64(0)
		if err == nil && metrics != nil {
			switch metricName {
			case "count":
				value = metrics.Count
			case "latency":
				value = metrics.Latency
			case "4xx":
				value = metrics.Error4XX
			case "5xx":
				value = metrics.Error5XX
			case "errors":
				value = metrics.Error4XX + metrics.Error5XX
			}
		}

		series = append(series, TimeSeriesPoint{
			Timestamp: current,
			Value:     value,
			Metadata: map[string]interface{}{
				"apiName":  apiName,
				"interval": interval.String(),
			},
		})
	}

	response := TimeSeriesData{
		AppID:      appID,
		MetricType: "apigateway:" + metricName,
		Period:     formatPeriod(startTime, endTime),
		Interval:   interval.String(),
		Series:     series,
		Metadata: map[string]string{
			"unit":    h.getAPIMetricUnit(metricName),
			"apiName": apiName,
		},
		Timestamp: time.Now().Unix(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetDynamoDBTimeSeries returns DynamoDB metrics over time
func (h *TimeSeriesHandler) GetDynamoDBTimeSeries(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]
	metricName := r.URL.Query().Get("metric")

	if metricName == "" {
		metricName = "consumed" // Default metric
	}

	// Parse time range and interval
	startTime, endTime, interval := h.parseTimeSeriesParams(r)

	// Get DynamoDB tables for the app
	tables := h.appHandler.AppsConfig.GetDynamoDBTables(appID)

	series := []TimeSeriesPoint{}

	// Generate time series data points
	for current := startTime; current.Before(endTime); current = current.Add(interval) {
		pointEnd := current.Add(interval)
		if pointEnd.After(endTime) {
			pointEnd = endTime
		}

		totalValue := float64(0)

		// Aggregate metrics from all tables
		for _, tableName := range tables {
			metrics, err := h.appHandler.DynamoDB.GetTableMetrics(
				context.Background(),
				tableName,
				current,
				pointEnd,
			)
			if err != nil {
				continue
			}

			switch metricName {
			case "consumed":
				totalValue += metrics.ConsumedReadCapacity + metrics.ConsumedWriteCapacity
			case "read":
				totalValue += metrics.ConsumedReadCapacity
			case "write":
				totalValue += metrics.ConsumedWriteCapacity
			case "throttles":
				totalValue += metrics.ThrottledRequests
			case "errors":
				totalValue += metrics.UserErrors + metrics.SystemErrors
			}
		}

		series = append(series, TimeSeriesPoint{
			Timestamp: current,
			Value:     totalValue,
			Metadata: map[string]interface{}{
				"tables":   len(tables),
				"interval": interval.String(),
			},
		})
	}

	response := TimeSeriesData{
		AppID:      appID,
		MetricType: "dynamodb:" + metricName,
		Period:     formatPeriod(startTime, endTime),
		Interval:   interval.String(),
		Series:     series,
		Metadata: map[string]string{
			"unit":   h.getDynamoDBMetricUnit(metricName),
			"tables": strconv.Itoa(len(tables)),
		},
		Timestamp: time.Now().Unix(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Helper functions

func (h *TimeSeriesHandler) parseTimeSeriesParams(r *http.Request) (time.Time, time.Time, time.Duration) {
	// Default to last 24 hours with 1-hour intervals
	endTime := time.Now()
	startTime := endTime.Add(-24 * time.Hour)
	interval := 1 * time.Hour

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

	// Parse interval (in minutes)
	if intervalStr := r.URL.Query().Get("interval"); intervalStr != "" {
		if minutes, err := strconv.Atoi(intervalStr); err == nil && minutes > 0 {
			interval = time.Duration(minutes) * time.Minute
		}
	}

	// Auto-adjust interval based on time range
	timeRange := endTime.Sub(startTime)
	if interval == 0 {
		switch {
		case timeRange <= 2*time.Hour:
			interval = 5 * time.Minute
		case timeRange <= 24*time.Hour:
			interval = 1 * time.Hour
		case timeRange <= 7*24*time.Hour:
			interval = 6 * time.Hour
		default:
			interval = 24 * time.Hour
		}
	}

	return startTime, endTime, interval
}

func (h *TimeSeriesHandler) getMetricUnit(metricName string) string {
	switch metricName {
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

func (h *TimeSeriesHandler) getAPIMetricUnit(metricName string) string {
	switch metricName {
	case "count", "4xx", "5xx", "errors":
		return "count"
	case "latency":
		return "milliseconds"
	default:
		return "count"
	}
}

func (h *TimeSeriesHandler) getDynamoDBMetricUnit(metricName string) string {
	switch metricName {
	case "consumed", "read", "write":
		return "capacity_units"
	case "throttles", "errors":
		return "count"
	default:
		return "count"
	}
}
