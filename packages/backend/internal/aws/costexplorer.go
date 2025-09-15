package aws

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/costexplorer"
	"github.com/aws/aws-sdk-go-v2/service/costexplorer/types"
)

// CostExplorerClient wraps the Cost Explorer client
type CostExplorerClient struct {
	client *costexplorer.Client
}

// NewCostExplorerClient creates a new Cost Explorer client
func NewCostExplorerClient(cfg aws.Config) *CostExplorerClient {
	return &CostExplorerClient{
		client: costexplorer.NewFromConfig(cfg),
	}
}

// CostData represents AWS cost information
type CostData struct {
	TotalCost      float64                `json:"totalCost"`
	Currency       string                 `json:"currency"`
	Services       []ServiceCost          `json:"services"`
	DailyCosts     []DailyCost            `json:"dailyCosts"`
	Period         string                 `json:"period"`
}

// ServiceCost represents cost breakdown by service
type ServiceCost struct {
	ServiceName string  `json:"serviceName"`
	Cost        float64 `json:"cost"`
	Percentage  float64 `json:"percentage"`
}

// DailyCost represents daily cost data
type DailyCost struct {
	Date string  `json:"date"`
	Cost float64 `json:"cost"`
}

// GetCostAndUsage retrieves cost and usage data
func (c *CostExplorerClient) GetCostAndUsage(ctx context.Context, startDate, endDate time.Time) (*CostData, error) {
	// Format dates for AWS API
	start := startDate.Format("2006-01-02")
	end := endDate.Format("2006-01-02")

	costData := &CostData{
		Currency: "USD",
		Period:   fmt.Sprintf("%s to %s", start, end),
	}

	// Get total cost and daily breakdown
	dailyInput := &costexplorer.GetCostAndUsageInput{
		TimePeriod: &types.DateInterval{
			Start: &start,
			End:   &end,
		},
		Granularity: types.GranularityDaily,
		Metrics:     []string{"UnblendedCost"},
	}

	dailyResult, err := c.client.GetCostAndUsage(ctx, dailyInput)
	if err != nil {
		return nil, fmt.Errorf("failed to get daily costs: %w", err)
	}

	// Process daily costs
	var totalCost float64
	for _, result := range dailyResult.ResultsByTime {
		if result.TimePeriod != nil && result.Total != nil {
			if costAmount, ok := result.Total["UnblendedCost"]; ok {
				if costAmount.Amount != nil {
					cost := parseFloat(*costAmount.Amount)
					dailyCost := DailyCost{
						Date: *result.TimePeriod.Start,
						Cost: cost,
					}
					costData.DailyCosts = append(costData.DailyCosts, dailyCost)
					totalCost += cost
				}
			}
		}
	}
	costData.TotalCost = totalCost

	// Get cost breakdown by service
	serviceInput := &costexplorer.GetCostAndUsageInput{
		TimePeriod: &types.DateInterval{
			Start: &start,
			End:   &end,
		},
		Granularity: types.GranularityMonthly,
		Metrics:     []string{"UnblendedCost"},
		GroupBy: []types.GroupDefinition{
			{
				Type: types.GroupDefinitionTypeTag,
				Key:  aws.String("SERVICE"),
			},
		},
	}

	serviceResult, err := c.client.GetCostAndUsage(ctx, serviceInput)
	if err != nil {
		// Log error but continue with available data
		fmt.Printf("Failed to get service breakdown: %v\n", err)
	} else {
		// Process service costs
		for _, result := range serviceResult.ResultsByTime {
			for _, group := range result.Groups {
				if group.Metrics != nil {
					if costAmount, ok := group.Metrics["UnblendedCost"]; ok {
						if costAmount.Amount != nil && len(group.Keys) > 0 {
							cost := parseFloat(*costAmount.Amount)
							serviceCost := ServiceCost{
								ServiceName: group.Keys[0],
								Cost:        cost,
								Percentage:  (cost / totalCost) * 100,
							}
							costData.Services = append(costData.Services, serviceCost)
						}
					}
				}
			}
		}
	}

	return costData, nil
}

// GetForecast retrieves cost forecast data
func (c *CostExplorerClient) GetForecast(ctx context.Context, days int) (*CostData, error) {
	// Calculate date range
	startDate := time.Now().AddDate(0, 0, 1) // Start from tomorrow
	endDate := startDate.AddDate(0, 0, days-1)

	start := startDate.Format("2006-01-02")
	end := endDate.Format("2006-01-02")

	input := &costexplorer.GetCostForecastInput{
		TimePeriod: &types.DateInterval{
			Start: &start,
			End:   &end,
		},
		Metric:      types.MetricUnblendedCost,
		Granularity: types.GranularityDaily,
	}

	result, err := c.client.GetCostForecast(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get cost forecast: %w", err)
	}

	costData := &CostData{
		Currency: "USD",
		Period:   fmt.Sprintf("%s to %s (forecast)", start, end),
	}

	// Process forecast data
	if result.Total != nil && result.Total.Amount != nil {
		costData.TotalCost = parseFloat(*result.Total.Amount)
	}

	for _, forecast := range result.ForecastResultsByTime {
		if forecast.TimePeriod != nil && forecast.MeanValue != nil {
			dailyCost := DailyCost{
				Date: *forecast.TimePeriod.Start,
				Cost: parseFloat(*forecast.MeanValue),
			}
			costData.DailyCosts = append(costData.DailyCosts, dailyCost)
		}
	}

	return costData, nil
}

// GetServiceCosts retrieves costs for specific services
func (c *CostExplorerClient) GetServiceCosts(ctx context.Context, services []string, startDate, endDate time.Time) ([]ServiceCost, error) {
	start := startDate.Format("2006-01-02")
	end := endDate.Format("2006-01-02")

	var serviceCosts []ServiceCost

	for _, service := range services {
		input := &costexplorer.GetCostAndUsageInput{
			TimePeriod: &types.DateInterval{
				Start: &start,
				End:   &end,
			},
			Granularity: types.GranularityMonthly,
			Metrics:     []string{"UnblendedCost"},
			Filter: &types.Expression{
				Dimensions: &types.DimensionValues{
					Key:    types.DimensionService,
					Values: []string{service},
				},
			},
		}

		result, err := c.client.GetCostAndUsage(ctx, input)
		if err != nil {
			fmt.Printf("Failed to get cost for service %s: %v\n", service, err)
			continue
		}

		var totalCost float64
		for _, r := range result.ResultsByTime {
			if r.Total != nil {
				if costAmount, ok := r.Total["UnblendedCost"]; ok {
					if costAmount.Amount != nil {
						totalCost += parseFloat(*costAmount.Amount)
					}
				}
			}
		}

		serviceCosts = append(serviceCosts, ServiceCost{
			ServiceName: service,
			Cost:        totalCost,
		})
	}

	// Calculate percentages
	var total float64
	for _, sc := range serviceCosts {
		total += sc.Cost
	}
	for i := range serviceCosts {
		if total > 0 {
			serviceCosts[i].Percentage = (serviceCosts[i].Cost / total) * 100
		}
	}

	return serviceCosts, nil
}

// parseFloat converts string to float64
func parseFloat(s string) float64 {
	var f float64
	fmt.Sscanf(s, "%f", &f)
	return f
}