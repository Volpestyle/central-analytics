package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	awslib "github.com/jamesvolpe/central-analytics/backend/internal/aws"
	"github.com/jamesvolpe/central-analytics/backend/internal/auth"
	"github.com/jamesvolpe/central-analytics/backend/pkg/response"
)

type Handler struct {
	cloudWatchClient *awslib.CloudWatchClient
	dynamoDBClient   *awslib.DynamoDBClient
	jwtManager       *auth.JWTManager
}

type MetricsRequest struct {
	Service   string    `json:"service"`   // lambda, apigateway, dynamodb
	Resources []string  `json:"resources"` // Function names, API names, or table names
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime"`
}

func NewHandler() (*Handler, error) {
	// Load AWS config
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Initialize JWT manager for auth validation
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET environment variable not set")
	}

	jwtManager := auth.NewJWTManager(
		[]byte(jwtSecret),
		"central-analytics",
		24*time.Hour,
	)

	return &Handler{
		cloudWatchClient: awslib.NewCloudWatchClient(cfg),
		dynamoDBClient:   awslib.NewDynamoDBClient(cfg),
		jwtManager:       jwtManager,
	}, nil
}

func (h *Handler) HandleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// Handle preflight CORS
	if request.HTTPMethod == "OPTIONS" {
		return response.Success(200, nil), nil
	}

	// Validate authentication
	authHeader := request.Headers["Authorization"]
	if authHeader == "" {
		authHeader = request.Headers["authorization"]
	}

	if authHeader == "" {
		return response.Error(401, "Authorization required"), nil
	}

	tokenString := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		tokenString = authHeader[7:]
	}

	_, err := h.jwtManager.ValidateToken(tokenString)
	if err != nil {
		return response.Error(401, "Invalid or expired token"), nil
	}

	// Route based on path
	pathParts := strings.Split(request.Path, "/")
	if len(pathParts) < 4 {
		return response.Error(404, "Not found"), nil
	}

	service := pathParts[3] // /api/metrics/{service}

	switch service {
	case "lambda":
		return h.handleLambdaMetrics(ctx, request)
	case "apigateway":
		return h.handleAPIGatewayMetrics(ctx, request)
	case "dynamodb":
		return h.handleDynamoDBMetrics(ctx, request)
	case "all":
		return h.handleAllMetrics(ctx, request)
	default:
		return response.Error(404, "Unknown service"), nil
	}
}

func (h *Handler) handleLambdaMetrics(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	var req MetricsRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		// Try query parameters
		req = h.parseQueryParams(request.QueryStringParameters)
	}

	// Default time range if not specified
	if req.EndTime.IsZero() {
		req.EndTime = time.Now()
	}
	if req.StartTime.IsZero() {
		req.StartTime = req.EndTime.Add(-24 * time.Hour)
	}

	// Default Lambda functions for ilikeyacut app
	if len(req.Resources) == 0 {
		req.Resources = []string{
			"gemini-proxy",
			"auth",
			"templates",
			"user-data",
			"purchase",
			"iap-webhook",
		}
	}

	var allMetrics []interface{}
	for _, functionName := range req.Resources {
		metrics, err := h.cloudWatchClient.GetLambdaMetrics(ctx, functionName, req.StartTime, req.EndTime)
		if err != nil {
			fmt.Printf("Error getting metrics for Lambda %s: %v\n", functionName, err)
			continue
		}
		allMetrics = append(allMetrics, metrics)
	}

	return response.Success(200, map[string]interface{}{
		"service": "lambda",
		"metrics": allMetrics,
		"period": map[string]string{
			"start": req.StartTime.Format(time.RFC3339),
			"end":   req.EndTime.Format(time.RFC3339),
		},
	}), nil
}

func (h *Handler) handleAPIGatewayMetrics(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	var req MetricsRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		req = h.parseQueryParams(request.QueryStringParameters)
	}

	// Default time range
	if req.EndTime.IsZero() {
		req.EndTime = time.Now()
	}
	if req.StartTime.IsZero() {
		req.StartTime = req.EndTime.Add(-24 * time.Hour)
	}

	// Default API Gateway for ilikeyacut app
	if len(req.Resources) == 0 {
		req.Resources = []string{"ilikeyacut-api-dev"}
	}

	var allMetrics []interface{}
	for _, apiName := range req.Resources {
		metrics, err := h.cloudWatchClient.GetAPIGatewayMetrics(ctx, apiName, req.StartTime, req.EndTime)
		if err != nil {
			fmt.Printf("Error getting metrics for API Gateway %s: %v\n", apiName, err)
			continue
		}
		allMetrics = append(allMetrics, metrics)
	}

	return response.Success(200, map[string]interface{}{
		"service": "apigateway",
		"metrics": allMetrics,
		"period": map[string]string{
			"start": req.StartTime.Format(time.RFC3339),
			"end":   req.EndTime.Format(time.RFC3339),
		},
	}), nil
}

func (h *Handler) handleDynamoDBMetrics(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	var req MetricsRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		req = h.parseQueryParams(request.QueryStringParameters)
	}

	// Default time range
	if req.EndTime.IsZero() {
		req.EndTime = time.Now()
	}
	if req.StartTime.IsZero() {
		req.StartTime = req.EndTime.Add(-24 * time.Hour)
	}

	// Default DynamoDB tables for ilikeyacut app
	if len(req.Resources) == 0 {
		req.Resources = []string{
			"users",
			"transactions",
			"templates",
			"rate-limits",
		}
	}

	metrics, err := h.dynamoDBClient.GetMultipleTableMetrics(ctx, req.Resources, req.StartTime, req.EndTime)
	if err != nil {
		return response.Error(500, fmt.Sprintf("Failed to get DynamoDB metrics: %v", err)), nil
	}

	return response.Success(200, map[string]interface{}{
		"service": "dynamodb",
		"metrics": metrics,
		"period": map[string]string{
			"start": req.StartTime.Format(time.RFC3339),
			"end":   req.EndTime.Format(time.RFC3339),
		},
	}), nil
}

func (h *Handler) handleAllMetrics(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	var req MetricsRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		req = h.parseQueryParams(request.QueryStringParameters)
	}

	// Default time range
	if req.EndTime.IsZero() {
		req.EndTime = time.Now()
	}
	if req.StartTime.IsZero() {
		req.StartTime = req.EndTime.Add(-24 * time.Hour)
	}

	// Collect all metrics in parallel
	allMetrics := make(map[string]interface{})

	// Lambda metrics
	lambdaFunctions := []string{"gemini-proxy", "auth", "templates", "user-data", "purchase", "iap-webhook"}
	var lambdaMetrics []interface{}
	for _, fn := range lambdaFunctions {
		metrics, err := h.cloudWatchClient.GetLambdaMetrics(ctx, fn, req.StartTime, req.EndTime)
		if err == nil {
			lambdaMetrics = append(lambdaMetrics, metrics)
		}
	}
	allMetrics["lambda"] = lambdaMetrics

	// API Gateway metrics
	apiMetrics, err := h.cloudWatchClient.GetAPIGatewayMetrics(ctx, "ilikeyacut-api-dev", req.StartTime, req.EndTime)
	if err == nil {
		allMetrics["apigateway"] = apiMetrics
	}

	// DynamoDB metrics
	tables := []string{"users", "transactions", "templates", "rate-limits"}
	dynamoMetrics, err := h.dynamoDBClient.GetMultipleTableMetrics(ctx, tables, req.StartTime, req.EndTime)
	if err == nil {
		allMetrics["dynamodb"] = dynamoMetrics
	}

	return response.Success(200, map[string]interface{}{
		"metrics": allMetrics,
		"period": map[string]string{
			"start": req.StartTime.Format(time.RFC3339),
			"end":   req.EndTime.Format(time.RFC3339),
		},
	}), nil
}

func (h *Handler) parseQueryParams(params map[string]string) MetricsRequest {
	req := MetricsRequest{}

	if startTime, ok := params["startTime"]; ok {
		if t, err := time.Parse(time.RFC3339, startTime); err == nil {
			req.StartTime = t
		}
	}

	if endTime, ok := params["endTime"]; ok {
		if t, err := time.Parse(time.RFC3339, endTime); err == nil {
			req.EndTime = t
		}
	}

	if resources, ok := params["resources"]; ok {
		req.Resources = strings.Split(resources, ",")
	}

	return req
}

func main() {
	handler, err := NewHandler()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize handler: %v", err))
	}

	lambda.Start(handler.HandleRequest)
}