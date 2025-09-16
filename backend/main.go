package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jamesvolpe/central-analytics/backend/handlers"
	"github.com/jamesvolpe/central-analytics/backend/services"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize services
	ctx := context.Background()

	awsService, err := services.NewAWSService(ctx)
	if err != nil {
		log.Fatalf("Failed to initialize AWS service: %v", err)
	}

	appStoreService := services.NewAppStoreService()

	// Initialize handlers
	metricsHandler := handlers.NewMetricsHandler(awsService, appStoreService)

	// Setup Gin router
	r := gin.Default()

	// Configure CORS
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:4321", "http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	r.Use(cors.New(config))

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "healthy",
			"timestamp": time.Now().Unix(),
		})
	})

	// API routes
	api := r.Group("/api")
	{
		apps := api.Group("/apps/:appId")
		{
			// AWS metrics endpoints
			apps.GET("/metrics/aws/lambda", metricsHandler.GetLambdaMetrics)
			apps.GET("/metrics/aws/apigateway", metricsHandler.GetAPIGatewayMetrics)
			apps.GET("/metrics/aws/dynamodb", metricsHandler.GetDynamoDBMetrics)
			apps.GET("/metrics/aws/costs", metricsHandler.GetCostMetrics)

			// App Store metrics endpoints
			apps.GET("/metrics/appstore/downloads", metricsHandler.GetDownloadMetrics)
			apps.GET("/metrics/appstore/revenue", metricsHandler.GetRevenueMetrics)
			apps.GET("/metrics/appstore/engagement", metricsHandler.GetEngagementMetrics)

			// App health endpoint
			apps.GET("/health", metricsHandler.GetAppHealth)
		}
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}