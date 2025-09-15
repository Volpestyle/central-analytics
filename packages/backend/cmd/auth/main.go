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
	"github.com/jamesvolpe/central-analytics/backend/internal/auth"
	"github.com/jamesvolpe/central-analytics/backend/pkg/response"
)

type AuthRequest struct {
	IDToken string `json:"idToken"`
}

type AuthResponse struct {
	AccessToken string `json:"accessToken"`
	User        struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		IsAdmin bool   `json:"isAdmin"`
	} `json:"user"`
	ExpiresIn int64 `json:"expiresIn"`
}

type Handler struct {
	appleVerifier *auth.AppleAuthVerifier
	jwtManager    *auth.JWTManager
}

func NewHandler() (*Handler, error) {
	// Load AWS config
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Get secrets from AWS Secrets Manager
	secretsClient := secretsmanager.NewFromConfig(cfg)

	// Get JWT secret
	jwtSecretName := os.Getenv("JWT_SECRET_NAME")
	if jwtSecretName == "" {
		jwtSecretName = "central-analytics/jwt-secret"
	}

	secretResult, err := secretsClient.GetSecretValue(context.Background(), &secretsmanager.GetSecretValueInput{
		SecretId: &jwtSecretName,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get JWT secret: %w", err)
	}

	// Get admin Apple ID sub
	adminSub := os.Getenv("ADMIN_APPLE_SUB")
	if adminSub == "" {
		return nil, fmt.Errorf("ADMIN_APPLE_SUB environment variable not set")
	}

	// Initialize Apple verifier
	appleVerifier, err := auth.NewAppleAuthVerifier(adminSub)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Apple verifier: %w", err)
	}

	// Initialize JWT manager
	jwtTTL := 24 * time.Hour // Default 24 hours
	jwtManager := auth.NewJWTManager(
		[]byte(*secretResult.SecretString),
		"central-analytics",
		jwtTTL,
	)

	return &Handler{
		appleVerifier: appleVerifier,
		jwtManager:    jwtManager,
	}, nil
}

func (h *Handler) HandleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// Handle preflight CORS
	if request.HTTPMethod == "OPTIONS" {
		return response.Success(200, nil), nil
	}

	switch request.Path {
	case "/api/auth/verify":
		return h.handleVerify(ctx, request)
	case "/api/auth/refresh":
		return h.handleRefresh(ctx, request)
	case "/api/auth/logout":
		return h.handleLogout(ctx, request)
	default:
		return response.Error(404, "Not found"), nil
	}
}

func (h *Handler) handleVerify(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	var authReq AuthRequest
	if err := json.Unmarshal([]byte(request.Body), &authReq); err != nil {
		return response.Error(400, "Invalid request body"), nil
	}

	if authReq.IDToken == "" {
		return response.Error(400, "ID token is required"), nil
	}

	// Verify Apple ID token
	claims, err := h.appleVerifier.VerifyToken(authReq.IDToken)
	if err != nil {
		// Try refreshing keys once and retry
		if refreshErr := h.appleVerifier.RefreshKeys(); refreshErr == nil {
			claims, err = h.appleVerifier.VerifyToken(authReq.IDToken)
		}
		if err != nil {
			return response.Error(401, "Invalid Apple ID token"), nil
		}
	}

	// Get user info
	userInfo := h.appleVerifier.GetUserInfo(claims)

	// Generate JWT session token
	accessToken, err := h.jwtManager.GenerateToken(userInfo)
	if err != nil {
		return response.Error(500, "Failed to generate session token"), nil
	}

	// Build response
	authResp := AuthResponse{
		AccessToken: accessToken,
		ExpiresIn:   86400, // 24 hours in seconds
	}
	authResp.User.ID = userInfo.Sub
	authResp.User.Email = userInfo.Email
	authResp.User.IsAdmin = userInfo.IsAdmin

	return response.Success(200, authResp), nil
}

func (h *Handler) handleRefresh(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// Extract token from Authorization header
	authHeader := request.Headers["Authorization"]
	if authHeader == "" {
		authHeader = request.Headers["authorization"]
	}

	if authHeader == "" {
		return response.Error(401, "Authorization header required"), nil
	}

	// Remove "Bearer " prefix
	tokenString := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		tokenString = authHeader[7:]
	}

	// Validate current token
	claims, err := h.jwtManager.ValidateToken(tokenString)
	if err != nil {
		return response.Error(401, "Invalid or expired token"), nil
	}

	// Generate new token
	newToken, err := h.jwtManager.RefreshToken(claims)
	if err != nil {
		return response.Error(500, "Failed to refresh token"), nil
	}

	return response.Success(200, map[string]interface{}{
		"accessToken": newToken,
		"expiresIn":   86400,
	}), nil
}

func (h *Handler) handleLogout(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// In a stateless JWT implementation, logout is handled client-side
	// We can optionally add token to a blacklist in DynamoDB if needed
	return response.Success(200, map[string]string{
		"message": "Logged out successfully",
	}), nil
}

func main() {
	handler, err := NewHandler()
	if err != nil {
		panic(fmt.Sprintf("Failed to initialize handler: %v", err))
	}

	lambda.Start(handler.HandleRequest)
}