package config

import (
	"os"
	"strings"
)

// AppConfig represents configuration for a single application
type AppConfig struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	AppStoreID       string   `json:"appStoreId"`
	LambdaFunctions  []string `json:"lambdaFunctions"`
	APIGateway       string   `json:"apiGateway"`
	DynamoDBTables   []string `json:"dynamodbTables"`
	Environment      string   `json:"environment"`
}

// AppsConfiguration manages application configurations
type AppsConfiguration struct {
	Apps map[string]*AppConfig
}

// NewAppsConfiguration creates a new apps configuration
func NewAppsConfiguration() *AppsConfiguration {
	config := &AppsConfiguration{
		Apps: make(map[string]*AppConfig),
	}

	// Load configuration from environment or use defaults
	config.loadAppConfigurations()

	return config
}

// loadAppConfigurations loads app configurations from environment variables
func (c *AppsConfiguration) loadAppConfigurations() {
	// ilikeyacut app configuration
	ilikeyacutConfig := &AppConfig{
		ID:          "ilikeyacut",
		Name:        "I Like Ya Cut",
		AppStoreID:  getEnvOrDefault("ILIKEYACUT_APP_STORE_ID", ""),
		Environment: getEnvOrDefault("ILIKEYACUT_ENV", "dev"),
	}

	// Parse Lambda functions from environment
	lambdaFuncs := getEnvOrDefault("ILIKEYACUT_LAMBDA_FUNCTIONS",
		"ilikeyacut-gemini-proxy-dev,ilikeyacut-auth-dev,ilikeyacut-templates-dev,ilikeyacut-user-data-dev,ilikeyacut-purchase-dev,ilikeyacut-iap-webhook-dev")
	ilikeyacutConfig.LambdaFunctions = strings.Split(lambdaFuncs, ",")

	// Set API Gateway
	ilikeyacutConfig.APIGateway = getEnvOrDefault("ILIKEYACUT_API_GATEWAY", "ilikeyacut-api-dev")

	// Parse DynamoDB tables from environment
	dynamoTables := getEnvOrDefault("ILIKEYACUT_DYNAMODB_TABLES",
		"ilikeyacut-users-dev,ilikeyacut-transactions-dev,ilikeyacut-templates-dev,ilikeyacut-rate-limits-dev")
	ilikeyacutConfig.DynamoDBTables = strings.Split(dynamoTables, ",")

	c.Apps["ilikeyacut"] = ilikeyacutConfig

	// Add more apps as needed
	// Example for future apps:
	// anotherAppConfig := &AppConfig{
	//     ID:          "anotherapp",
	//     Name:        "Another App",
	//     AppStoreID:  getEnvOrDefault("ANOTHERAPP_APP_STORE_ID", ""),
	//     Environment: getEnvOrDefault("ANOTHERAPP_ENV", "dev"),
	// }
	// c.Apps["anotherapp"] = anotherAppConfig
}

// GetAppConfig returns configuration for a specific app
func (c *AppsConfiguration) GetAppConfig(appID string) *AppConfig {
	return c.Apps[appID]
}

// GetAllApps returns all configured apps
func (c *AppsConfiguration) GetAllApps() []*AppConfig {
	apps := make([]*AppConfig, 0, len(c.Apps))
	for _, app := range c.Apps {
		apps = append(apps, app)
	}
	return apps
}

// GetLambdaFunctions returns Lambda functions for an app
func (c *AppsConfiguration) GetLambdaFunctions(appID string) []string {
	if app := c.GetAppConfig(appID); app != nil {
		return app.LambdaFunctions
	}
	return []string{}
}

// GetAPIGateway returns the API Gateway name for an app
func (c *AppsConfiguration) GetAPIGateway(appID string) string {
	if app := c.GetAppConfig(appID); app != nil {
		return app.APIGateway
	}
	return ""
}

// GetDynamoDBTables returns DynamoDB tables for an app
func (c *AppsConfiguration) GetDynamoDBTables(appID string) []string {
	if app := c.GetAppConfig(appID); app != nil {
		return app.DynamoDBTables
	}
	return []string{}
}

// GetAppStoreID returns the App Store ID for an app
func (c *AppsConfiguration) GetAppStoreID(appID string) string {
	if app := c.GetAppConfig(appID); app != nil {
		return app.AppStoreID
	}
	return ""
}

// Helper function to get environment variable with default
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}