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

		// Get the latest value
		latestValue := metricResult.Values[0]

		switch *metricResult.Id {
		case "invocations":
			metrics.Invocations = latestValue
		case "errors":
			metrics.Errors = latestValue
		case "duration":
			metrics.Duration = latestValue
		case "throttles":
			metrics.Throttles = latestValue
		case "concurrent":
			metrics.ConcurrentExecutions = latestValue
		}

		// Add datapoints for time series
		for i, timestamp := range metricResult.Timestamps {
			if i < len(metricResult.Values) {
				metrics.Datapoints = append(metrics.Datapoints, MetricDatapoint{
					Timestamp: timestamp,
					Value:     metricResult.Values[i],
					Unit:      string(metricResult.StatusCode),
				})
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

		latestValue := metricResult.Values[0]

		switch *metricResult.Id {
		case "count":
			metrics.Count = latestValue
		case "latency":
			metrics.Latency = latestValue
		case "error4xx":
			metrics.Error4XX = latestValue
		case "error5xx":
			metrics.Error5XX = latestValue
		}
	}

	return metrics, nil
}