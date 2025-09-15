package aws

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/cloudwatch"
	"github.com/aws/aws-sdk-go-v2/service/cloudwatch/types"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

// DynamoDBClient wraps DynamoDB and CloudWatch clients for metrics
type DynamoDBClient struct {
	dynamoClient *dynamodb.Client
	cwClient     *cloudwatch.Client
}

// NewDynamoDBClient creates a new DynamoDB metrics client
func NewDynamoDBClient(cfg aws.Config) *DynamoDBClient {
	return &DynamoDBClient{
		dynamoClient: dynamodb.NewFromConfig(cfg),
		cwClient:     cloudwatch.NewFromConfig(cfg),
	}
}

// DynamoDBMetrics represents DynamoDB table metrics
type DynamoDBMetrics struct {
	TableName              string                 `json:"tableName"`
	ConsumedReadCapacity   float64                `json:"consumedReadCapacity"`
	ConsumedWriteCapacity  float64                `json:"consumedWriteCapacity"`
	ProvisionedReadCapacity  float64              `json:"provisionedReadCapacity"`
	ProvisionedWriteCapacity float64              `json:"provisionedWriteCapacity"`
	ThrottledRequests      float64                `json:"throttledRequests"`
	UserErrors             float64                `json:"userErrors"`
	SystemErrors           float64                `json:"systemErrors"`
	ItemCount              int64                  `json:"itemCount"`
	TableSizeBytes         int64                  `json:"tableSizeBytes"`
	Period                 string                 `json:"period"`
	Datapoints            []MetricDatapoint       `json:"datapoints"`
}

// GetTableMetrics retrieves metrics for a DynamoDB table
func (c *DynamoDBClient) GetTableMetrics(ctx context.Context, tableName string, startTime, endTime time.Time) (*DynamoDBMetrics, error) {
	metrics := &DynamoDBMetrics{
		TableName: tableName,
		Period:    fmt.Sprintf("%s to %s", startTime.Format(time.RFC3339), endTime.Format(time.RFC3339)),
	}

	// Get table description for size and item count
	describeOutput, err := c.dynamoClient.DescribeTable(ctx, &dynamodb.DescribeTableInput{
		TableName: aws.String(tableName),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to describe table: %w", err)
	}

	if describeOutput.Table != nil {
		if describeOutput.Table.ItemCount != nil {
			metrics.ItemCount = *describeOutput.Table.ItemCount
		}
		if describeOutput.Table.TableSizeBytes != nil {
			metrics.TableSizeBytes = *describeOutput.Table.TableSizeBytes
		}
		if describeOutput.Table.ProvisionedThroughput != nil {
			if describeOutput.Table.ProvisionedThroughput.ReadCapacityUnits != nil {
				metrics.ProvisionedReadCapacity = float64(*describeOutput.Table.ProvisionedThroughput.ReadCapacityUnits)
			}
			if describeOutput.Table.ProvisionedThroughput.WriteCapacityUnits != nil {
				metrics.ProvisionedWriteCapacity = float64(*describeOutput.Table.ProvisionedThroughput.WriteCapacityUnits)
			}
		}
	}

	// Define CloudWatch metric queries
	queries := []types.MetricDataQuery{
		{
			Id: aws.String("consumedRead"),
			MetricStat: &types.MetricStat{
				Metric: &types.Metric{
					Namespace:  aws.String("AWS/DynamoDB"),
					MetricName: aws.String("ConsumedReadCapacityUnits"),
					Dimensions: []types.Dimension{
						{
							Name:  aws.String("TableName"),
							Value: aws.String(tableName),
						},
					},
				},
				Period: aws.Int32(300),
				Stat:   aws.String("Sum"),
			},
			ReturnData: aws.Bool(true),
		},
		{
			Id: aws.String("consumedWrite"),
			MetricStat: &types.MetricStat{
				Metric: &types.Metric{
					Namespace:  aws.String("AWS/DynamoDB"),
					MetricName: aws.String("ConsumedWriteCapacityUnits"),
					Dimensions: []types.Dimension{
						{
							Name:  aws.String("TableName"),
							Value: aws.String(tableName),
						},
					},
				},
				Period: aws.Int32(300),
				Stat:   aws.String("Sum"),
			},
			ReturnData: aws.Bool(true),
		},
		{
			Id: aws.String("throttled"),
			MetricStat: &types.MetricStat{
				Metric: &types.Metric{
					Namespace:  aws.String("AWS/DynamoDB"),
					MetricName: aws.String("ThrottledRequests"),
					Dimensions: []types.Dimension{
						{
							Name:  aws.String("TableName"),
							Value: aws.String(tableName),
						},
					},
				},
				Period: aws.Int32(300),
				Stat:   aws.String("Sum"),
			},
			ReturnData: aws.Bool(true),
		},
		{
			Id: aws.String("userErrors"),
			MetricStat: &types.MetricStat{
				Metric: &types.Metric{
					Namespace:  aws.String("AWS/DynamoDB"),
					MetricName: aws.String("UserErrors"),
					Dimensions: []types.Dimension{
						{
							Name:  aws.String("TableName"),
							Value: aws.String(tableName),
						},
					},
				},
				Period: aws.Int32(300),
				Stat:   aws.String("Sum"),
			},
			ReturnData: aws.Bool(true),
		},
		{
			Id: aws.String("systemErrors"),
			MetricStat: &types.MetricStat{
				Metric: &types.Metric{
					Namespace:  aws.String("AWS/DynamoDB"),
					MetricName: aws.String("SystemErrors"),
					Dimensions: []types.Dimension{
						{
							Name:  aws.String("TableName"),
							Value: aws.String(tableName),
						},
					},
				},
				Period: aws.Int32(300),
				Stat:   aws.String("Sum"),
			},
			ReturnData: aws.Bool(true),
		},
	}

	// Get metric data from CloudWatch
	input := &cloudwatch.GetMetricDataInput{
		MetricDataQueries: queries,
		StartTime:        &startTime,
		EndTime:          &endTime,
	}

	result, err := c.cwClient.GetMetricData(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get CloudWatch metrics: %w", err)
	}

	// Process results
	for _, metricResult := range result.MetricDataResults {
		if metricResult.Id == nil || len(metricResult.Values) == 0 {
			continue
		}

		// Sum all values for the period
		var total float64
		for _, value := range metricResult.Values {
			total += value
		}

		switch *metricResult.Id {
		case "consumedRead":
			metrics.ConsumedReadCapacity = total
		case "consumedWrite":
			metrics.ConsumedWriteCapacity = total
		case "throttled":
			metrics.ThrottledRequests = total
		case "userErrors":
			metrics.UserErrors = total
		case "systemErrors":
			metrics.SystemErrors = total
		}

		// Add datapoints for the first metric only to avoid duplication
		if *metricResult.Id == "consumedRead" {
			for i, timestamp := range metricResult.Timestamps {
				if i < len(metricResult.Values) {
					metrics.Datapoints = append(metrics.Datapoints, MetricDatapoint{
						Timestamp: timestamp,
						Value:     metricResult.Values[i],
						Unit:      "ConsumedCapacityUnits",
					})
				}
			}
		}
	}

	return metrics, nil
}

// GetMultipleTableMetrics retrieves metrics for multiple DynamoDB tables
func (c *DynamoDBClient) GetMultipleTableMetrics(ctx context.Context, tableNames []string, startTime, endTime time.Time) ([]*DynamoDBMetrics, error) {
	var results []*DynamoDBMetrics

	for _, tableName := range tableNames {
		metrics, err := c.GetTableMetrics(ctx, tableName, startTime, endTime)
		if err != nil {
			// Log error but continue with other tables
			fmt.Printf("Error getting metrics for table %s: %v\n", tableName, err)
			continue
		}
		results = append(results, metrics)
	}

	return results, nil
}