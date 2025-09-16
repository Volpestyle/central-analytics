package aws

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/cloudwatch"
	"github.com/aws/aws-sdk-go-v2/service/cloudwatch/types"
)

// CloudWatchClient wraps the CloudWatch client
type CloudWatchClient struct {
	client *cloudwatch.Client
}

// NewCloudWatchClient creates a new CloudWatch client
func NewCloudWatchClient(cfg aws.Config) *CloudWatchClient {
	return &CloudWatchClient{
		client: cloudwatch.NewFromConfig(cfg),
	}
}

// LambdaMetrics represents Lambda function metrics
type LambdaMetrics struct {
	FunctionName string                 `json:"functionName"`
	Invocations  float64                `json:"invocations"`
	Errors       float64                `json:"errors"`
	Duration     float64                `json:"duration"`
	Throttles    float64                `json:"throttles"`
	ConcurrentExecutions float64        `json:"concurrentExecutions"`
	Period       string                 `json:"period"`
	Datapoints   []MetricDatapoint      `json:"datapoints"`
}

// MetricDatapoint represents a single metric data point
type MetricDatapoint struct {
	Timestamp time.Time `json:"timestamp"`
	Value     float64   `json:"value"`
	Unit      string    `json:"unit"`
}

// GetLambdaMetrics retrieves metrics for a Lambda function
func (c *CloudWatchClient) GetLambdaMetrics(ctx context.Context, functionName string, startTime, endTime time.Time) (*LambdaMetrics, error) {
	metrics := &LambdaMetrics{
		FunctionName: functionName,
		Period:       fmt.Sprintf("%s to %s", startTime.Format(time.RFC3339), endTime.Format(time.RFC3339)),
	}

	// Define metric queries
	queries := []types.MetricDataQuery{
		{
			Id: aws.String("invocations"),
			MetricStat: &types.MetricStat{
				Metric: &types.Metric{
					Namespace:  aws.String("AWS/Lambda"),
					MetricName: aws.String("Invocations"),
					Dimensions: []types.Dimension{
						{
							Name:  aws.String("FunctionName"),
							Value: aws.String(functionName),
						},
					},
				},
				Period: aws.Int32(300), // 5 minutes
				Stat:   aws.String("Sum"),
			},
			ReturnData: aws.Bool(true),
		},
		{
			Id: aws.String("errors"),
			MetricStat: &types.MetricStat{
				Metric: &types.Metric{
					Namespace:  aws.String("AWS/Lambda"),
					MetricName: aws.String("Errors"),
					Dimensions: []types.Dimension{
						{
							Name:  aws.String("FunctionName"),
							Value: aws.String(functionName),
						},
					},
				},
				Period: aws.Int32(300),
				Stat:   aws.String("Sum"),
			},
			ReturnData: aws.Bool(true),
		},
		{
			Id: aws.String("duration"),
			MetricStat: &types.MetricStat{
				Metric: &types.Metric{
					Namespace:  aws.String("AWS/Lambda"),
					MetricName: aws.String("Duration"),
					Dimensions: []types.Dimension{
						{
							Name:  aws.String("FunctionName"),
							Value: aws.String(functionName),
						},
					},
				},
				Period: aws.Int32(300),
				Stat:   aws.String("Average"),
			},
			ReturnData: aws.Bool(true),
		},
		{
			Id: aws.String("throttles"),
			MetricStat: &types.MetricStat{
				Metric: &types.Metric{
					Namespace:  aws.String("AWS/Lambda"),
					MetricName: aws.String("Throttles"),
					Dimensions: []types.Dimension{
						{
							Name:  aws.String("FunctionName"),
							Value: aws.String(functionName),
						},
					},
				},
				Period: aws.Int32(300),
				Stat:   aws.String("Sum"),
			},
			ReturnData: aws.Bool(true),
		},
		{
			Id: aws.String("concurrent"),
			MetricStat: &types.MetricStat{
				Metric: &types.Metric{
					Namespace:  aws.String("AWS/Lambda"),
					MetricName: aws.String("ConcurrentExecutions"),
					Dimensions: []types.Dimension{
						{
							Name:  aws.String("FunctionName"),
							Value: aws.String(functionName),
						},
					},
				},
				Period: aws.Int32(300),
				Stat:   aws.String("Maximum"),
			},
			ReturnData: aws.Bool(true),
		},
	}

	// Get metric data
	input := &cloudwatch.GetMetricDataInput{
		MetricDataQueries: queries,
		StartTime:        &startTime,
		EndTime:          &endTime,
	}

	result, err := c.client.GetMetricData(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get metric data: %w", err)
	}

	// Process results
	for _, metricResult := range result.MetricDataResults {
		if metricResult.Id == nil || len(metricResult.Values) == 0 {
			continue
		}

		// Calculate sum of all values for aggregated metrics
		var total float64
		for _, value := range metricResult.Values {
			total += value
		}

		// For duration, we want the average across all data points
		if *metricResult.Id == "duration" && len(metricResult.Values) > 0 {
			total = total / float64(len(metricResult.Values))
		}

		switch *metricResult.Id {
		case "invocations":
			metrics.Invocations = total
		case "errors":
			metrics.Errors = total
		case "duration":
			metrics.Duration = total
		case "throttles":
			metrics.Throttles = total
		case "concurrent":
			// For concurrent executions, we want the maximum value
			maxConcurrent := float64(0)
			for _, value := range metricResult.Values {
				if value > maxConcurrent {
					maxConcurrent = value
				}
			}
			metrics.ConcurrentExecutions = maxConcurrent
		}

		// Add datapoints for time series (only for invocations to avoid duplication)
		if *metricResult.Id == "invocations" {
			for i, timestamp := range metricResult.Timestamps {
				if i < len(metricResult.Values) {
					metrics.Datapoints = append(metrics.Datapoints, MetricDatapoint{
						Timestamp: timestamp,
						Value:     metricResult.Values[i],
						Unit:      "Count",
					})
				}
			}
		}
	}

	return metrics, nil
}

// APIGatewayMetrics represents API Gateway metrics
type APIGatewayMetrics struct {
	APIName      string              `json:"apiName"`
	Count        float64             `json:"count"`
	Latency      float64             `json:"latency"`
	Error4XX     float64             `json:"error4xx"`
	Error5XX     float64             `json:"error5xx"`
	Period       string              `json:"period"`
	Datapoints   []MetricDatapoint   `json:"datapoints"`
}

// GetAPIGatewayMetrics retrieves metrics for an API Gateway
func (c *CloudWatchClient) GetAPIGatewayMetrics(ctx context.Context, apiName string, startTime, endTime time.Time) (*APIGatewayMetrics, error) {
	metrics := &APIGatewayMetrics{
		APIName: apiName,
		Period:  fmt.Sprintf("%s to %s", startTime.Format(time.RFC3339), endTime.Format(time.RFC3339)),
	}

	// Define metric queries
	queries := []types.MetricDataQuery{
		{
			Id: aws.String("count"),
			MetricStat: &types.MetricStat{
				Metric: &types.Metric{
					Namespace:  aws.String("AWS/ApiGateway"),
					MetricName: aws.String("Count"),
					Dimensions: []types.Dimension{
						{
							Name:  aws.String("ApiName"),
							Value: aws.String(apiName),
						},
					},
				},
				Period: aws.Int32(300),
				Stat:   aws.String("Sum"),
			},
			ReturnData: aws.Bool(true),
		},
		{
			Id: aws.String("latency"),
			MetricStat: &types.MetricStat{
				Metric: &types.Metric{
					Namespace:  aws.String("AWS/ApiGateway"),
					MetricName: aws.String("Latency"),
					Dimensions: []types.Dimension{
						{
							Name:  aws.String("ApiName"),
							Value: aws.String(apiName),
						},
					},
				},
				Period: aws.Int32(300),
				Stat:   aws.String("Average"),
			},
			ReturnData: aws.Bool(true),
		},
		{
			Id: aws.String("error4xx"),
			MetricStat: &types.MetricStat{
				Metric: &types.Metric{
					Namespace:  aws.String("AWS/ApiGateway"),
					MetricName: aws.String("4XXError"),
					Dimensions: []types.Dimension{
						{
							Name:  aws.String("ApiName"),
							Value: aws.String(apiName),
						},
					},
				},
				Period: aws.Int32(300),
				Stat:   aws.String("Sum"),
			},
			ReturnData: aws.Bool(true),
		},
		{
			Id: aws.String("error5xx"),
			MetricStat: &types.MetricStat{
				Metric: &types.Metric{
					Namespace:  aws.String("AWS/ApiGateway"),
					MetricName: aws.String("5XXError"),
					Dimensions: []types.Dimension{
						{
							Name:  aws.String("ApiName"),
							Value: aws.String(apiName),
						},
					},
				},
				Period: aws.Int32(300),
				Stat:   aws.String("Sum"),
			},
			ReturnData: aws.Bool(true),
		},
	}

	// Get metric data
	input := &cloudwatch.GetMetricDataInput{
		MetricDataQueries: queries,
		StartTime:        &startTime,
		EndTime:          &endTime,
	}

	result, err := c.client.GetMetricData(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get API Gateway metrics: %w", err)
	}

	// Process results
	for _, metricResult := range result.MetricDataResults {
		if metricResult.Id == nil || len(metricResult.Values) == 0 {
			continue
		}

		// Calculate sum of all values for count metrics
		var total float64
		for _, value := range metricResult.Values {
			total += value
		}

		// For latency, we want the average across all data points
		if *metricResult.Id == "latency" && len(metricResult.Values) > 0 {
			total = total / float64(len(metricResult.Values))
		}

		switch *metricResult.Id {
		case "count":
			metrics.Count = total
		case "latency":
			metrics.Latency = total
		case "error4xx":
			metrics.Error4XX = total
		case "error5xx":
			metrics.Error5XX = total
		}

		// Add datapoints for time series (only for count to avoid duplication)
		if *metricResult.Id == "count" {
			for i, timestamp := range metricResult.Timestamps {
				if i < len(metricResult.Values) {
					metrics.Datapoints = append(metrics.Datapoints, MetricDatapoint{
						Timestamp: timestamp,
						Value:     metricResult.Values[i],
						Unit:      "Count",
					})
				}
			}
		}
	}

	return metrics, nil
}