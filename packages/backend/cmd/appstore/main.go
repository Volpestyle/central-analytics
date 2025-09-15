package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/secretsmanager"
	"github.com/jamesvolpe/central-analytics/backend/internal/appstore"
	"github.com/jamesvolpe/central-analytics/backend/internal/auth"
	"github.com/jamesvolpe/central-analytics/backend/pkg/response"
)

type Handler struct {
	appStoreClient *appstore.AppStoreConnectClient
	jwtManager     *auth.JWTManager
}

type AppStoreRequest struct {
	AppID     string    `json:"appId"`
	StartDate time.Time `json:"startDate"`
	EndDate   time.Time `json:"endDate"`
}

func NewHandler() (*Handler, error) {
	// Load AWS config
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Get secrets from AWS Secrets Manager
	secretsClient := secretsmanager.NewFromConfig(cfg)

	// Get App Store Connect credentials
	appStoreSecretName := os.Getenv("APPSTORE_SECRET_NAME")
	if appStoreSecretName == "" {
		appStoreSecretName = "central-analytics/appstore-connect"
	}

	secretResult, err := secretsClient.GetSecretValue(context.Background(), &secretsmanager.GetSecretValueInput{
		SecretId: &appStoreSecretName,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get App Store Connect secret: %w", err)
	}

	var appStoreCredentials struct {
		KeyID      string `json:"keyId"`
		IssuerID   string `json:"issuerId"`
		PrivateKey string `json:"privateKey"`
	}

	if err := json.Unmarshal([]byte(*secretResult.SecretString), &appStoreCredentials); err != nil {
		return nil, fmt.Errorf("failed to parse App Store Connect credentials: %w", err)
	}

	// Initialize App Store Connect client
	appStoreClient, err := appstore.NewAppStoreConnectClient(
		appStoreCredentials.KeyID,
		appStoreCredentials.IssuerID,
		[]byte(appStoreCredentials.PrivateKey),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize App Store Connect client: %w", err)
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
		appStoreClient: appStoreClient,
		jwtManager:     jwtManager,
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

	claims, err := h.jwtManager.ValidateToken(tokenString)
	if err != nil {
		return response.Error(401, "Invalid or expired token"), nil
	}

	// Only admins can access App Store metrics
	if !claims.IsAdmin {
		return response.Error(403, "Admin access required"), nil
	}

	// Route based on path
	switch request.Path {
	case "/api/appstore/analytics":
		return h.handleAnalytics(ctx, request)
	case "/api/appstore/builds":
		return h.handleBuilds(ctx, request)
	case "/api/appstore/testflight":
		return h.handleTestFlight(ctx, request)
	case "/api/appstore/ratings":
		return h.handleRatings(ctx, request)
	default:
		return response.Error(404, "Not found"), nil
	}
}

func (h *Handler) handleAnalytics(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	var req AppStoreRequest
	if err := json.Unmarshal([]byte(request.Body), &req); err != nil {
		// Try query parameters
		req.AppID = request.QueryStringParameters["appId"]
		if startDate := request.QueryStringParameters["startDate"]; startDate != "" {
			req.StartDate, _ = time.Parse("2006-01-02", startDate)
		}
		if endDate := request.QueryStringParameters["endDate"]; endDate != "" {
			req.EndDate, _ = time.Parse("2006-01-02", endDate)
		}
	}

	// Default app ID for ilikeyacut
	if req.AppID == "" {
		req.AppID = os.Getenv("DEFAULT_APP_ID")
		if req.AppID == "" {
			return response.Error(400, "App ID is required"), nil
		}
	}

	// Default date range
	if req.EndDate.IsZero() {
		req.EndDate = time.Now()
	}
	if req.StartDate.IsZero() {
		req.StartDate = req.EndDate.AddDate(0, 0, -30) // Last 30 days
	}

	analytics, err := h.appStoreClient.GetAppAnalytics(ctx, req.AppID, req.StartDate, req.EndDate)
	if err != nil {
		return response.Error(500, fmt.Sprintf("Failed to get analytics: %v", err)), nil
	}

	return response.Success(200, analytics), nil
}

func (h *Handler) handleBuilds(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	appID := request.QueryStringParameters["appId"]
	if appID == "" {
		appID = os.Getenv("DEFAULT_APP_ID")
		if appID == "" {
			return response.Error(400, "App ID is required"), nil
		}
	}

	buildInfo, err := h.appStoreClient.GetLatestBuild(ctx, appID)
	if err != nil {
		return response.Error(500, fmt.Sprintf("Failed to get build info: %v", err)), nil
	}

	return response.Success(200, buildInfo), nil
}

func (h *Handler) handleTestFlight(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	appID := request.QueryStringParameters["appId"]
	if appID == "" {
		appID = os.Getenv("DEFAULT_APP_ID")
		if appID == "" {
			return response.Error(400, "App ID is required"), nil
		}
	}

	testFlightInfo, err := h.appStoreClient.GetTestFlightInfo(ctx, appID)
	if err != nil {
		return response.Error(500, fmt.Sprintf("Failed to get TestFlight info: %v", err)), nil
	}

	return response.Success(200, testFlightInfo), nil
}

func (h *Handler) handleRatings(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	appID := request.QueryStringParameters["appId"]
	if appID == "" {
		appID = os.Getenv("DEFAULT_APP_ID")
		if appID == "" {
			return response.Error(400, "App ID is required"), nil
		}
	}

	ratings, err := h.appStoreClient.GetAppRatings(ctx, appID)
	if err != nil {
		return response.Error(500, fmt.Sprintf("Failed to get ratings: %v", err)), nil
	}

	return response.Success(200, ratings), nil
}

func main() {
	handler, err := NewHandler()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize handler: %v", err))
	}

	lambda.Start(handler.HandleRequest)
}