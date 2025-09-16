package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/mux"
)

// MetricsAggregator handles aggregated metrics endpoints
type MetricsAggregator struct {
	appHandler *AppHandler
}

// NewMetricsAggregator creates a new metrics aggregator
func NewMetricsAggregator(appHandler *AppHandler) *MetricsAggregator {
	return &MetricsAggregator{
		appHandler: appHandler,
	}
}

// AggregatedMetrics represents combined metrics from all sources
type AggregatedMetrics struct {
	AppID          string                    `json:"appId"`
	Period         string                    `json:"period"`
	AWS            *AWSMetricsSummary        `json:"aws"`
	AppStore       *AppStoreMetricsSummary   `json:"appStore"`
	Health         *HealthSummary            `json:"health"`
	Timestamp      int64                     `json:"timestamp"`
}

// AWSMetricsSummary represents summarized AWS metrics
type AWSMetricsSummary struct {
	Lambda      *LambdaSummary      `json:"lambda"`
	APIGateway  *APIGatewaySummary  `json:"apiGateway"`
	DynamoDB    *DynamoDBSummary    `json:"dynamoDB"`
	Cost        *CostSummary        `json:"cost"`
}

// LambdaSummary represents summarized Lambda metrics
type LambdaSummary struct {
	TotalInvocations     float64 `json:"totalInvocations"`
	TotalErrors          float64 `json:"totalErrors"`
	ErrorRate            float64 `json:"errorRate"`
	AverageDuration      float64 `json:"averageDuration"`
	TotalThrottles       float64 `json:"totalThrottles"`
	FunctionCount        int     `json:"functionCount"`
}

// APIGatewaySummary represents summarized API Gateway metrics
type APIGatewaySummary struct {
	TotalRequests   float64 `json:"totalRequests"`
	Total4XXErrors  float64 `json:"total4xxErrors"`
	Total5XXErrors  float64 `json:"total5xxErrors"`
	ErrorRate       float64 `json:"errorRate"`
	AverageLatency  float64 `json:"averageLatency"`
}

// DynamoDBSummary represents summarized DynamoDB metrics
type DynamoDBSummary struct {
	TotalReadCapacity    float64 `json:"totalReadCapacity"`
	TotalWriteCapacity   float64 `json:"totalWriteCapacity"`
	TotalThrottles       float64 `json:"totalThrottles"`
	TotalErrors          float64 `json:"totalErrors"`
	TableCount           int     `json:"tableCount"`
	TotalItemCount       int64   `json:"totalItemCount"`
	TotalSizeBytes       int64   `json:"totalSizeBytes"`
}

// CostSummary represents summarized cost metrics
type CostSummary struct {
	CurrentPeriod  float64              `json:"currentPeriod"`
	DailyAverage   float64              `json:"dailyAverage"`
	ProjectedMonth float64              `json:"projectedMonth"`
	TopServices    []ServiceCostSummary `json:"topServices"`
}

// ServiceCostSummary represents cost for a service
type ServiceCostSummary struct {
	ServiceName string  `json:"serviceName"`
	Cost        float64 `json:"cost"`
	Percentage  float64 `json:"percentage"`
}

// AppStoreMetricsSummary represents summarized App Store metrics
type AppStoreMetricsSummary struct {
	Downloads      int64   `json:"downloads"`
	Updates        int64   `json:"updates"`
	Revenue        float64 `json:"revenue"`
	ARPU           float64 `json:"arpu"`
	ActiveDevices  int64   `json:"activeDevices"`
	AverageRating  float64 `json:"averageRating"`
	TotalRatings   int64   `json:"totalRatings"`
}

// HealthSummary represents overall health status
type HealthSummary struct {
	Status           string            `json:"status"`
	HealthyServices  int               `json:"healthyServices"`
	DegradedServices int               `json:"degradedServices"`
	UnknownServices  int               `json:"unknownServices"`
	Issues           []string          `json:"issues"`
}

// GetAggregatedMetrics returns combined metrics from all sources
func (ma *MetricsAggregator) GetAggregatedMetrics(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	appID := vars["appId"]

	// Parse time range
	startTime, endTime := parseTimeRange(r)

	// Create wait group for concurrent fetching
	var wg sync.WaitGroup
	ctx := r.Context()

	aggregated := &AggregatedMetrics{
		AppID:     appID,
		Period:    formatPeriod(startTime, endTime),
		Timestamp: time.Now().Unix(),
		AWS:       &AWSMetricsSummary{},
	}

	// Channel for collecting errors
	errChan := make(chan error, 10)

	// Fetch Lambda metrics concurrently
	wg.Add(1)
	go func() {
		defer wg.Done()
		summary := ma.fetchLambdaSummary(ctx, appID, startTime, endTime)
		aggregated.AWS.Lambda = summary
	}()

	// Fetch API Gateway metrics concurrently
	wg.Add(1)
	go func() {
		defer wg.Done()
		summary := ma.fetchAPIGatewaySummary(ctx, appID, startTime, endTime)
		aggregated.AWS.APIGateway = summary
	}()

	// Fetch DynamoDB metrics concurrently
	wg.Add(1)
	go func() {
		defer wg.Done()
		summary := ma.fetchDynamoDBSummary(ctx, appID, startTime, endTime)
		aggregated.AWS.DynamoDB = summary
	}()

	// Fetch Cost metrics concurrently
	wg.Add(1)
	go func() {
		defer wg.Done()
		summary := ma.fetchCostSummary(ctx, startTime, endTime)
		aggregated.AWS.Cost = summary
	}()

	// Fetch App Store metrics if configured
	if ma.appHandler.appStore != nil {
		wg.Add(1)
		go func() {
			defer wg.Done()
			summary := ma.fetchAppStoreSummary(ctx, appID, startTime, endTime)
			aggregated.AppStore = summary
		}()
	}

	// Fetch health status
	wg.Add(1)
	go func() {
		defer wg.Done()
		summary := ma.fetchHealthSummary(ctx, appID)
		aggregated.Health = summary
	}()

	// Wait for all goroutines to complete
	wg.Wait()
	close(errChan)

	// Send response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(aggregated)
}

// Helper functions for fetching summaries

func (ma *MetricsAggregator) fetchLambdaSummary(ctx context.Context, appID string, startTime, endTime time.Time) *LambdaSummary {
	summary := &LambdaSummary{}

	lambdaFunctions := ma.appHandler.getLambdaFunctionsForApp(appID)
	summary.FunctionCount = len(lambdaFunctions)

	var totalDuration float64
	var durationCount int

	for _, functionName := range lambdaFunctions {
		metrics, err := ma.appHandler.cloudWatch.GetLambdaMetrics(ctx, functionName, startTime, endTime)
		if err != nil {
			continue
		}

		summary.TotalInvocations += metrics.Invocations
		summary.TotalErrors += metrics.Errors
		summary.TotalThrottles += metrics.Throttles

		if metrics.Duration > 0 {
			totalDuration += metrics.Duration
			durationCount++
		}
	}

	if summary.TotalInvocations > 0 {
		summary.ErrorRate = (summary.TotalErrors / summary.TotalInvocations) * 100
	}

	if durationCount > 0 {
		summary.AverageDuration = totalDuration / float64(durationCount)
	}

	return summary
}

func (ma *MetricsAggregator) fetchAPIGatewaySummary(ctx context.Context, appID string, startTime, endTime time.Time) *APIGatewaySummary {
	summary := &APIGatewaySummary{}

	apiName := ma.appHandler.getAPIGatewayForApp(appID)
	if apiName == "" {
		return summary
	}

	metrics, err := ma.appHandler.cloudWatch.GetAPIGatewayMetrics(ctx, apiName, startTime, endTime)
	if err != nil {
		return summary
	}

	summary.TotalRequests = metrics.Count
	summary.Total4XXErrors = metrics.Error4XX
	summary.Total5XXErrors = metrics.Error5XX
	summary.AverageLatency = metrics.Latency

	if summary.TotalRequests > 0 {
		summary.ErrorRate = ((summary.Total4XXErrors + summary.Total5XXErrors) / summary.TotalRequests) * 100
	}

	return summary
}

func (ma *MetricsAggregator) fetchDynamoDBSummary(ctx context.Context, appID string, startTime, endTime time.Time) *DynamoDBSummary {
	summary := &DynamoDBSummary{}

	tables := ma.appHandler.getDynamoDBTablesForApp(appID)
	summary.TableCount = len(tables)

	for _, tableName := range tables {
		metrics, err := ma.appHandler.dynamoDB.GetTableMetrics(ctx, tableName, startTime, endTime)
		if err != nil {
			continue
		}

		summary.TotalReadCapacity += metrics.ConsumedReadCapacity
		summary.TotalWriteCapacity += metrics.ConsumedWriteCapacity
		summary.TotalThrottles += metrics.ThrottledRequests
		summary.TotalErrors += metrics.UserErrors + metrics.SystemErrors
		summary.TotalItemCount += metrics.ItemCount
		summary.TotalSizeBytes += metrics.TableSizeBytes
	}

	return summary
}

func (ma *MetricsAggregator) fetchCostSummary(ctx context.Context, startTime, endTime time.Time) *CostSummary {
	summary := &CostSummary{}

	costData, err := ma.appHandler.costExplorer.GetCostAndUsage(ctx, startTime, endTime)
	if err != nil {
		return summary
	}

	summary.CurrentPeriod = costData.TotalCost

	// Calculate daily average
	days := endTime.Sub(startTime).Hours() / 24
	if days > 0 {
		summary.DailyAverage = costData.TotalCost / days
	}

	// Project monthly cost (assume 30 days)
	summary.ProjectedMonth = summary.DailyAverage * 30

	// Get top services
	for i, service := range costData.Services {
		if i >= 5 { // Top 5 services only
			break
		}
		summary.TopServices = append(summary.TopServices, ServiceCostSummary{
			ServiceName: service.ServiceName,
			Cost:        service.Cost,
			Percentage:  service.Percentage,
		})
	}

	return summary
}

func (ma *MetricsAggregator) fetchAppStoreSummary(ctx context.Context, appID string, startTime, endTime time.Time) *AppStoreMetricsSummary {
	summary := &AppStoreMetricsSummary{}

	appStoreID := ma.appHandler.getAppStoreIDForApp(appID)
	if appStoreID == "" {
		return summary
	}

	analytics, err := ma.appHandler.appStore.GetAppAnalytics(ctx, appStoreID, startTime, endTime)
	if err != nil {
		return summary
	}

	summary.Downloads = analytics.Downloads
	summary.Updates = analytics.Updates
	summary.Revenue = analytics.Revenue
	summary.ActiveDevices = analytics.ActiveDevices
	summary.AverageRating = analytics.Ratings.AverageRating
	summary.TotalRatings = analytics.Ratings.TotalRatings

	if summary.ActiveDevices > 0 {
		summary.ARPU = summary.Revenue / float64(summary.ActiveDevices)
	}

	return summary
}

func (ma *MetricsAggregator) fetchHealthSummary(ctx context.Context, appID string) *HealthSummary {
	summary := &HealthSummary{
		Status: "healthy",
		Issues: []string{},
	}

	// Get current time for recent metrics (last hour)
	endTime := time.Now()
	startTime := endTime.Add(-1 * time.Hour)

	// Check Lambda health
	lambdaFunctions := ma.appHandler.getLambdaFunctionsForApp(appID)
	for _, functionName := range lambdaFunctions {
		metrics, err := ma.appHandler.cloudWatch.GetLambdaMetrics(ctx, functionName, startTime, endTime)
		if err != nil {
			summary.UnknownServices++
			continue
		}

		errorRate := float64(0)
		if metrics.Invocations > 0 {
			errorRate = (metrics.Errors / metrics.Invocations) * 100
		}

		if errorRate > 5 {
			summary.DegradedServices++
			summary.Issues = append(summary.Issues,
				formatIssue("Lambda %s has high error rate: %.2f%%", functionName, errorRate))
		} else if metrics.Throttles > 0 {
			summary.DegradedServices++
			summary.Issues = append(summary.Issues,
				formatIssue("Lambda %s is being throttled", functionName))
		} else {
			summary.HealthyServices++
		}
	}

	// Check API Gateway health
	apiName := ma.appHandler.getAPIGatewayForApp(appID)
	if apiName != "" {
		apiMetrics, err := ma.appHandler.cloudWatch.GetAPIGatewayMetrics(ctx, apiName, startTime, endTime)
		if err != nil {
			summary.UnknownServices++
		} else {
			errorRate := float64(0)
			if apiMetrics.Count > 0 {
				errorRate = ((apiMetrics.Error4XX + apiMetrics.Error5XX) / apiMetrics.Count) * 100
			}

			if errorRate > 5 {
				summary.DegradedServices++
				summary.Issues = append(summary.Issues,
					formatIssue("API Gateway has high error rate: %.2f%%", errorRate))
			} else if apiMetrics.Latency > 1000 {
				summary.DegradedServices++
				summary.Issues = append(summary.Issues,
					formatIssue("API Gateway has high latency: %.0fms", apiMetrics.Latency))
			} else {
				summary.HealthyServices++
			}
		}
	}

	// Check DynamoDB health
	tables := ma.appHandler.getDynamoDBTablesForApp(appID)
	for _, tableName := range tables {
		metrics, err := ma.appHandler.dynamoDB.GetTableMetrics(ctx, tableName, startTime, endTime)
		if err != nil {
			summary.UnknownServices++
			continue
		}

		if metrics.ThrottledRequests > 0 {
			summary.DegradedServices++
			summary.Issues = append(summary.Issues,
				formatIssue("DynamoDB table %s is being throttled", tableName))
		} else if metrics.SystemErrors > 0 {
			summary.DegradedServices++
			summary.Issues = append(summary.Issues,
				formatIssue("DynamoDB table %s has system errors", tableName))
		} else {
			summary.HealthyServices++
		}
	}

	// Update overall status
	if summary.DegradedServices > 0 {
		summary.Status = "degraded"
	}
	if summary.DegradedServices > summary.HealthyServices {
		summary.Status = "critical"
	}

	return summary
}

func formatPeriod(startTime, endTime time.Time) string {
	return formatTime(startTime) + " to " + formatTime(endTime)
}

func formatTime(t time.Time) string {
	return t.Format("2006-01-02 15:04:05")
}

func formatIssue(format string, args ...interface{}) string {
	return fmt.Sprintf(format, args...)
}