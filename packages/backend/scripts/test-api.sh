#!/bin/bash

# Test script for Central Analytics Backend API
# This script helps test the API endpoints locally

BASE_URL="${API_BASE_URL:-http://localhost:8080}"
APP_ID="${APP_ID:-ilikeyacut}"
TOKEN="${AUTH_TOKEN:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Central Analytics Backend API Test Script"
echo "==========================================="
echo "Base URL: $BASE_URL"
echo "App ID: $APP_ID"
echo ""

# Function to make authenticated request
make_request() {
    local endpoint=$1
    local description=$2

    echo -e "${YELLOW}Testing: ${description}${NC}"
    echo "Endpoint: ${endpoint}"

    if [ -z "$TOKEN" ]; then
        response=$(curl -s -w "\n%{http_code}" "${BASE_URL}${endpoint}")
    else
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}${endpoint}")
    fi

    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ Success (HTTP ${http_code})${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ Failed (HTTP ${http_code})${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
    echo ""
}

# Test health endpoints
echo "=== Health Checks ==="
make_request "/health" "Basic health check"
make_request "/api/health" "API health status"

# Set time range for metrics
END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
START_TIME=$(date -u -v-24H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "24 hours ago" +"%Y-%m-%dT%H:%M:%SZ")

echo "=== Metrics Endpoints ==="
echo "Time Range: ${START_TIME} to ${END_TIME}"
echo ""

# Test metrics endpoints
make_request "/api/apps/${APP_ID}/metrics/lambda?start=${START_TIME}&end=${END_TIME}" "Lambda metrics"
make_request "/api/apps/${APP_ID}/metrics/apigateway?start=${START_TIME}&end=${END_TIME}" "API Gateway metrics"
make_request "/api/apps/${APP_ID}/metrics/dynamodb?start=${START_TIME}&end=${END_TIME}" "DynamoDB metrics"

# Test cost metrics (last 30 days)
COST_START=$(date -u -v-30d +"%Y-%m-%dT00:00:00Z" 2>/dev/null || date -u -d "30 days ago" +"%Y-%m-%dT00:00:00Z")
make_request "/api/apps/${APP_ID}/metrics/costs?start=${COST_START}&end=${END_TIME}" "Cost analytics"

# Test App Store metrics (if configured)
if [ ! -z "$APP_STORE_KEY_ID" ]; then
    echo "=== App Store Metrics ==="
    make_request "/api/apps/${APP_ID}/metrics/appstore/downloads?start=${START_TIME}&end=${END_TIME}" "App Store downloads"
    make_request "/api/apps/${APP_ID}/metrics/appstore/revenue?start=${START_TIME}&end=${END_TIME}" "App Store revenue"
fi

# Test aggregated metrics
make_request "/api/apps/${APP_ID}/metrics/aggregated?start=${START_TIME}&end=${END_TIME}" "Aggregated metrics"

# Test time series endpoints
echo "=== Time Series Endpoints ==="
make_request "/api/apps/${APP_ID}/timeseries/lambda?start=${START_TIME}&end=${END_TIME}&interval=60" "Lambda time series"
make_request "/api/apps/${APP_ID}/timeseries/apigateway?start=${START_TIME}&end=${END_TIME}&interval=60" "API Gateway time series"
make_request "/api/apps/${APP_ID}/timeseries/dynamodb?start=${START_TIME}&end=${END_TIME}&interval=60" "DynamoDB time series"
make_request "/api/apps/${APP_ID}/timeseries/cost?start=${COST_START}&end=${END_TIME}" "Cost time series"

echo "==========================================="
echo "✅ Test completed!"
echo ""
echo "To test with authentication:"
echo "export AUTH_TOKEN='your-jwt-token'"
echo "./scripts/test-api.sh"