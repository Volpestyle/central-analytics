package response

import (
	"encoding/json"

	"github.com/aws/aws-lambda-go/events"
)

// StandardResponse represents a standard API response
type StandardResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// Headers returns common headers for API responses
func Headers() map[string]string {
	return map[string]string{
		"Content-Type":                 "application/json",
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
		"Access-Control-Max-Age":       "86400",
	}
}

// Success creates a successful API response
func Success(statusCode int, data interface{}) events.APIGatewayProxyResponse {
	resp := StandardResponse{
		Success: true,
		Data:    data,
	}

	body, _ := json.Marshal(resp)

	return events.APIGatewayProxyResponse{
		StatusCode: statusCode,
		Headers:    Headers(),
		Body:       string(body),
	}
}

// Error creates an error API response
func Error(statusCode int, message string) events.APIGatewayProxyResponse {
	resp := StandardResponse{
		Success: false,
		Error:   message,
	}

	body, _ := json.Marshal(resp)

	return events.APIGatewayProxyResponse{
		StatusCode: statusCode,
		Headers:    Headers(),
		Body:       string(body),
	}
}

// Raw creates a raw API response without the standard wrapper
func Raw(statusCode int, body interface{}) events.APIGatewayProxyResponse {
	bodyBytes, _ := json.Marshal(body)

	return events.APIGatewayProxyResponse{
		StatusCode: statusCode,
		Headers:    Headers(),
		Body:       string(bodyBytes),
	}
}