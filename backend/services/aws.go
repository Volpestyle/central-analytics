package services

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/cloudwatch"
	"github.com/aws/aws-sdk-go-v2/service/cloudwatch/types"
	"github.com/aws/aws-sdk-go-v2/service/costexplorer"
	costTypes "github.com/aws/aws-sdk-go-v2/service/costexplorer/types"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/jamesvolpe/central-analytics/backend/models"
)

type AWSService struct {
	cloudwatch   *cloudwatch.Client
	costexplorer *costexplorer.Client
	dynamodb     *dynamodb.Client
}

func NewAWSService(ctx context.Context) (*AWSService, error) {
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("unable to load SDK config: %w", err)
	}

	return &AWSService{
		cloudwatch:   cloudwatch.NewFromConfig(cfg),
		costexplorer: costexplorer.NewFromConfig(cfg),
		dynamodb:     dynamodb.NewFromConfig(cfg),
	}, nil
}

// GetLambdaMetrics retrieves Lambda function metrics from CloudWatch
func (s *AWSService) GetLambdaMetrics(ctx context.Context, appID string, period string) (*models.LambdaMetrics, error) {
	endTime := time.Now()
	startTime := getStartTime(period)

	// Define Lambda functions based on appID
	functions := getLambdaFunctions(appID)

	metrics := &models.LambdaMetrics{
		Functions: make([]models.FunctionMetrics, 0, len(functions)),
		Period:    period,
		Timestamp: time.Now().Unix(),
	}

	for _, functionName := range functions {
		funcMetrics := models.FunctionMetrics{
			FunctionName: functionName,
		}

		// Get invocation count
		invocations, err := s.getMetricStatistics(ctx, "AWS/Lambda", "Invocations",
			functionName, startTime, endTime, 300, types.StatisticSum)
		if err == nil {
			funcMetrics.Invocations = calculateSum(invocations)
		}

		// Get error count
		errors, err := s.getMetricStatistics(ctx, "AWS/Lambda", "Errors",
			functionName, startTime, endTime, 300, types.StatisticSum)
		if err == nil {
			funcMetrics.Errors = calculateSum(errors)
			if funcMetrics.Invocations > 0 {
				funcMetrics.ErrorRate = (funcMetrics.Errors / funcMetrics.Invocations) * 100
			}
		}

		// Get duration
		duration, err := s.getMetricStatistics(ctx, "AWS/Lambda", "Duration",
			functionName, startTime, endTime, 300, types.StatisticAverage)
		if err == nil {
			funcMetrics.AverageDuration = calculateAverage(duration)
		}

		// Get cold starts (concurrent executions)
		coldStarts, err := s.getMetricStatistics(ctx, "AWS/Lambda", "ConcurrentExecutions",
			functionName, startTime, endTime, 300, types.StatisticMaximum)
		if err == nil {
			funcMetrics.ColdStarts = calculateMax(coldStarts)
		}

		// Calculate estimated cost (simplified: $0.20 per 1M requests + compute time)
		funcMetrics.EstimatedCost = (funcMetrics.Invocations / 1000000.0) * 0.20 +
			(funcMetrics.AverageDuration * funcMetrics.Invocations / 1000.0) * 0.0000166667

		// Time series data for charts
		funcMetrics.TimeSeries = buildTimeSeries(invocations)

		metrics.Functions = append(metrics.Functions, funcMetrics)

		// Calculate totals
		metrics.TotalInvocations += funcMetrics.Invocations
		metrics.TotalErrors += funcMetrics.Errors
		metrics.TotalCost += funcMetrics.EstimatedCost
	}

	if metrics.TotalInvocations > 0 {
		metrics.AverageErrorRate = (metrics.TotalErrors / metrics.TotalInvocations) * 100
	}

	return metrics, nil
}

// GetAPIGatewayMetrics retrieves API Gateway metrics from CloudWatch
func (s *AWSService) GetAPIGatewayMetrics(ctx context.Context, appID string, period string) (*models.APIGatewayMetrics, error) {
	endTime := time.Now()
	startTime := getStartTime(period)

	apiName := getAPIGatewayName(appID)

	metrics := &models.APIGatewayMetrics{
		APIName:   apiName,
		Period:    period,
		Timestamp: time.Now().Unix(),
		Endpoints: make([]models.EndpointMetrics, 0),
	}

	// Get total request count
	requests, err := s.getAPIMetricStatistics(ctx, "Count", apiName, startTime, endTime)
	if err == nil {
		metrics.TotalRequests = calculateSum(requests)
		metrics.RequestsTimeSeries = buildTimeSeries(requests)
	}

	// Get 4XX errors
	errors4xx, err := s.getAPIMetricStatistics(ctx, "4XXError", apiName, startTime, endTime)
	if err == nil {
		metrics.Errors4XX = calculateSum(errors4xx)
	}

	// Get 5XX errors
	errors5xx, err := s.getAPIMetricStatistics(ctx, "5XXError", apiName, startTime, endTime)
	if err == nil {
		metrics.Errors5XX = calculateSum(errors5xx)
	}

	// Calculate error rates
	if metrics.TotalRequests > 0 {
		metrics.ErrorRate4XX = (metrics.Errors4XX / metrics.TotalRequests) * 100
		metrics.ErrorRate5XX = (metrics.Errors5XX / metrics.TotalRequests) * 100
	}

	// Get latency metrics
	latency, err := s.getAPIMetricStatistics(ctx, "Latency", apiName, startTime, endTime)
	if err == nil {
		metrics.AverageLatency = calculateAverage(latency)
		metrics.LatencyTimeSeries = buildTimeSeries(latency)
	}

	// Add endpoint-specific metrics for known endpoints
	endpoints := getAPIEndpoints(appID)
	for _, endpoint := range endpoints {
		endpointMetrics := models.EndpointMetrics{
			Path:   endpoint,
			Method: "POST", // Most endpoints are POST for this app
		}

		// Note: For more detailed per-endpoint metrics, you'd need to use custom CloudWatch metrics
		// or parse API Gateway access logs. This is a simplified version.

		metrics.Endpoints = append(metrics.Endpoints, endpointMetrics)
	}

	return metrics, nil
}

// GetDynamoDBMetrics retrieves DynamoDB table metrics from CloudWatch
func (s *AWSService) GetDynamoDBMetrics(ctx context.Context, appID string, period string) (*models.DynamoDBMetrics, error) {
	endTime := time.Now()
	startTime := getStartTime(period)

	tables := getDynamoDBTables(appID)

	metrics := &models.DynamoDBMetrics{
		Tables:    make([]models.TableMetrics, 0, len(tables)),
		Period:    period,
		Timestamp: time.Now().Unix(),
	}

	for _, tableName := range tables {
		tableMetrics := models.TableMetrics{
			TableName: tableName,
		}

		// Get consumed read capacity units
		readCapacity, err := s.getDynamoDBMetricStatistics(ctx, "ConsumedReadCapacityUnits",
			tableName, startTime, endTime, types.StatisticSum)
		if err == nil {
			tableMetrics.ConsumedReadCapacity = calculateSum(readCapacity)
		}

		// Get consumed write capacity units
		writeCapacity, err := s.getDynamoDBMetricStatistics(ctx, "ConsumedWriteCapacityUnits",
			tableName, startTime, endTime, types.StatisticSum)
		if err == nil {
			tableMetrics.ConsumedWriteCapacity = calculateSum(writeCapacity)
		}

		// Get throttled requests
		readThrottles, err := s.getDynamoDBMetricStatistics(ctx, "ReadThrottleEvents",
			tableName, startTime, endTime, types.StatisticSum)
		if err == nil {
			tableMetrics.ThrottledReadRequests = calculateSum(readThrottles)
		}

		writeThrottles, err := s.getDynamoDBMetricStatistics(ctx, "WriteThrottleEvents",
			tableName, startTime, endTime, types.StatisticSum)
		if err == nil {
			tableMetrics.ThrottledWriteRequests = calculateSum(writeThrottles)
		}

		// Get table description for item count and storage size
		describeInput := &dynamodb.DescribeTableInput{
			TableName: aws.String(tableName),
		}

		tableDesc, err := s.dynamodb.DescribeTable(ctx, describeInput)
		if err == nil && tableDesc.Table != nil {
			tableMetrics.ItemCount = tableDesc.Table.ItemCount
			tableMetrics.StorageSize = tableDesc.Table.TableSizeBytes / (1024 * 1024) // Convert to MB

			// Calculate estimated cost
			// Simplified: $0.25 per GB-month for storage + $0.25 per million read/write units
			storageCostGB := float64(tableDesc.Table.TableSizeBytes) / (1024 * 1024 * 1024)
			tableMetrics.EstimatedCost = (storageCostGB * 0.25) +
				((tableMetrics.ConsumedReadCapacity + tableMetrics.ConsumedWriteCapacity) / 1000000.0 * 0.25)
		}

		// Time series data
		tableMetrics.ReadCapacityTimeSeries = buildTimeSeries(readCapacity)
		tableMetrics.WriteCapacityTimeSeries = buildTimeSeries(writeCapacity)

		metrics.Tables = append(metrics.Tables, tableMetrics)

		// Calculate totals
		metrics.TotalReadCapacity += tableMetrics.ConsumedReadCapacity
		metrics.TotalWriteCapacity += tableMetrics.ConsumedWriteCapacity
		metrics.TotalThrottledRequests += tableMetrics.ThrottledReadRequests + tableMetrics.ThrottledWriteRequests
		metrics.TotalStorageMB += tableMetrics.StorageSize
		metrics.TotalCost += tableMetrics.EstimatedCost
	}

	return metrics, nil
}

// GetCostMetrics retrieves AWS cost data from Cost Explorer
func (s *AWSService) GetCostMetrics(ctx context.Context, appID string) (*models.CostMetrics, error) {
	endDate := time.Now().Format("2006-01-02")
	startDate := time.Now().AddDate(0, 0, -30).Format("2006-01-02")

	metrics := &models.CostMetrics{
		Period:    "30d",
		Timestamp: time.Now().Unix(),
	}

	// Get daily costs for the last 30 days
	costInput := &costexplorer.GetCostAndUsageInput{
		TimePeriod: &costTypes.DateInterval{
			Start: aws.String(startDate),
			End:   aws.String(endDate),
		},
		Granularity: costTypes.GranularityDaily,
		Metrics:     []string{"UnblendedCost"},
		GroupBy: []costTypes.GroupDefinition{
			{
				Type: costTypes.GroupDefinitionTypeDimension,
				Key:  aws.String("SERVICE"),
			},
		},
		Filter: getCostFilter(appID),
	}

	result, err := s.costexplorer.GetCostAndUsage(ctx, costInput)
	if err != nil {
		return nil, fmt.Errorf("failed to get cost data: %w", err)
	}

	// Process cost data
	dailyCosts := make([]models.DailyCost, 0)
	serviceBreakdown := make(map[string]float64)

	for _, timeResult := range result.ResultsByTime {
		date := *timeResult.TimePeriod.Start
		dailyCost := models.DailyCost{
			Date: date,
		}

		for _, group := range timeResult.Groups {
			if len(group.Keys) > 0 && len(group.Metrics) > 0 {
				service := group.Keys[0]
				cost := parseFloat(group.Metrics["UnblendedCost"].Amount)

				dailyCost.Cost += cost
				serviceBreakdown[service] += cost
			}
		}

		dailyCosts = append(dailyCosts, dailyCost)
		metrics.DailySpend += dailyCost.Cost
	}

	metrics.DailyCosts = dailyCosts
	metrics.ServiceBreakdown = make([]models.ServiceCost, 0)

	for service, cost := range serviceBreakdown {
		metrics.ServiceBreakdown = append(metrics.ServiceBreakdown, models.ServiceCost{
			Service: service,
			Cost:    cost,
		})
	}

	// Calculate month-to-date and projections
	metrics.MonthToDate = metrics.DailySpend
	daysInMonth := time.Now().Day()
	metrics.ProjectedMonthly = (metrics.DailySpend / float64(daysInMonth)) * 30

	// Get last month's total for comparison
	lastMonthStart := time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	lastMonthEnd := time.Now().AddDate(0, 0, -30).Format("2006-01-02")

	lastMonthInput := &costexplorer.GetCostAndUsageInput{
		TimePeriod: &costTypes.DateInterval{
			Start: aws.String(lastMonthStart),
			End:   aws.String(lastMonthEnd),
		},
		Granularity: costTypes.GranularityMonthly,
		Metrics:     []string{"UnblendedCost"},
		Filter:      getCostFilter(appID),
	}

	lastMonthResult, err := s.costexplorer.GetCostAndUsage(ctx, lastMonthInput)
	if err == nil && len(lastMonthResult.ResultsByTime) > 0 {
		for _, result := range lastMonthResult.ResultsByTime {
			if result.Total != nil && result.Total["UnblendedCost"] != nil {
				metrics.LastMonth = parseFloat(result.Total["UnblendedCost"].Amount)
			}
		}
	}

	return metrics, nil
}

// Helper functions

func (s *AWSService) getMetricStatistics(ctx context.Context, namespace, metricName, functionName string,
	startTime, endTime time.Time, period int32, stat types.Statistic) ([]types.Datapoint, error) {

	input := &cloudwatch.GetMetricStatisticsInput{
		Namespace:  aws.String(namespace),
		MetricName: aws.String(metricName),
		Dimensions: []types.Dimension{
			{
				Name:  aws.String("FunctionName"),
				Value: aws.String(functionName),
			},
		},
		StartTime:  aws.Time(startTime),
		EndTime:    aws.Time(endTime),
		Period:     aws.Int32(period),
		Statistics: []types.Statistic{stat},
	}

	result, err := s.cloudwatch.GetMetricStatistics(ctx, input)
	if err != nil {
		return nil, err
	}

	return result.Datapoints, nil
}

func (s *AWSService) getAPIMetricStatistics(ctx context.Context, metricName, apiName string,
	startTime, endTime time.Time) ([]types.Datapoint, error) {

	input := &cloudwatch.GetMetricStatisticsInput{
		Namespace:  aws.String("AWS/ApiGateway"),
		MetricName: aws.String(metricName),
		Dimensions: []types.Dimension{
			{
				Name:  aws.String("ApiName"),
				Value: aws.String(apiName),
			},
		},
		StartTime:  aws.Time(startTime),
		EndTime:    aws.Time(endTime),
		Period:     aws.Int32(300),
		Statistics: []types.Statistic{types.StatisticSum},
	}

	if metricName == "Latency" {
		input.Statistics = []types.Statistic{types.StatisticAverage}
	}

	result, err := s.cloudwatch.GetMetricStatistics(ctx, input)
	if err != nil {
		return nil, err
	}

	return result.Datapoints, nil
}

func (s *AWSService) getDynamoDBMetricStatistics(ctx context.Context, metricName, tableName string,
	startTime, endTime time.Time, stat types.Statistic) ([]types.Datapoint, error) {

	input := &cloudwatch.GetMetricStatisticsInput{
		Namespace:  aws.String("AWS/DynamoDB"),
		MetricName: aws.String(metricName),
		Dimensions: []types.Dimension{
			{
				Name:  aws.String("TableName"),
				Value: aws.String(tableName),
			},
		},
		StartTime:  aws.Time(startTime),
		EndTime:    aws.Time(endTime),
		Period:     aws.Int32(300),
		Statistics: []types.Statistic{stat},
	}

	result, err := s.cloudwatch.GetMetricStatistics(ctx, input)
	if err != nil {
		return nil, err
	}

	return result.Datapoints, nil
}

func getStartTime(period string) time.Time {
	switch period {
	case "24h":
		return time.Now().Add(-24 * time.Hour)
	case "7d":
		return time.Now().AddDate(0, 0, -7)
	case "30d":
		return time.Now().AddDate(0, 0, -30)
	default:
		return time.Now().Add(-24 * time.Hour)
	}
}

func getLambdaFunctions(appID string) []string {
	if appID == "ilikeyacut" {
		return []string{
			"ilikeyacut-gemini-proxy-dev",
			"ilikeyacut-auth-dev",
			"ilikeyacut-templates-dev",
			"ilikeyacut-user-data-dev",
			"ilikeyacut-purchase-dev",
			"ilikeyacut-iap-webhook-dev",
		}
	}
	return []string{}
}

func getAPIGatewayName(appID string) string {
	if appID == "ilikeyacut" {
		return "ilikeyacut-api-dev"
	}
	return ""
}

func getAPIEndpoints(appID string) []string {
	if appID == "ilikeyacut" {
		return []string{
			"/auth",
			"/templates",
			"/user-data",
			"/purchase",
			"/gemini-proxy",
			"/iap-webhook",
		}
	}
	return []string{}
}

func getDynamoDBTables(appID string) []string {
	if appID == "ilikeyacut" {
		return []string{
			"ilikeyacut-users-dev",
			"ilikeyacut-transactions-dev",
			"ilikeyacut-templates-dev",
			"ilikeyacut-rate-limits-dev",
		}
	}
	return []string{}
}

func getCostFilter(appID string) *costTypes.Expression {
	if appID == "ilikeyacut" {
		// Filter by tags or resource names specific to the app
		return &costTypes.Expression{
			Tags: &costTypes.TagValues{
				Key:    aws.String("Application"),
				Values: []string{"ilikeyacut"},
			},
		}
	}
	return nil
}

func calculateSum(datapoints []types.Datapoint) float64 {
	sum := 0.0
	for _, dp := range datapoints {
		if dp.Sum != nil {
			sum += *dp.Sum
		}
	}
	return sum
}

func calculateAverage(datapoints []types.Datapoint) float64 {
	if len(datapoints) == 0 {
		return 0.0
	}
	sum := 0.0
	count := 0
	for _, dp := range datapoints {
		if dp.Average != nil {
			sum += *dp.Average
			count++
		}
	}
	if count == 0 {
		return 0.0
	}
	return sum / float64(count)
}

func calculateMax(datapoints []types.Datapoint) float64 {
	max := 0.0
	for _, dp := range datapoints {
		if dp.Maximum != nil && *dp.Maximum > max {
			max = *dp.Maximum
		}
	}
	return max
}

func buildTimeSeries(datapoints []types.Datapoint) []models.TimeSeriesPoint {
	series := make([]models.TimeSeriesPoint, 0, len(datapoints))
	for _, dp := range datapoints {
		point := models.TimeSeriesPoint{
			Timestamp: dp.Timestamp.Unix(),
		}
		if dp.Sum != nil {
			point.Value = *dp.Sum
		} else if dp.Average != nil {
			point.Value = *dp.Average
		} else if dp.Maximum != nil {
			point.Value = *dp.Maximum
		}
		series = append(series, point)
	}
	return series
}

func parseFloat(s *string) float64 {
	if s == nil {
		return 0.0
	}
	var f float64
	fmt.Sscanf(*s, "%f", &f)
	return f
}