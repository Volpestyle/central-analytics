package appstore

import (
	"bytes"
	"context"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	appStoreConnectBaseURL = "https://api.appstoreconnect.apple.com/v1"
	tokenTTL               = 20 * time.Minute // Apple recommends 20 minutes max
)

// AppStoreConnectClient handles App Store Connect API interactions
type AppStoreConnectClient struct {
	keyID      string
	issuerID   string
	privateKey interface{}
	httpClient *http.Client
	token      string
	tokenExp   time.Time
}

// NewAppStoreConnectClient creates a new App Store Connect API client
func NewAppStoreConnectClient(keyID, issuerID string, privateKeyPEM []byte) (*AppStoreConnectClient, error) {
	// Parse the private key
	block, _ := pem.Decode(privateKeyPEM)
	if block == nil {
		return nil, fmt.Errorf("failed to parse PEM block containing the private key")
	}

	privateKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	return &AppStoreConnectClient{
		keyID:      keyID,
		issuerID:   issuerID,
		privateKey: privateKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}, nil
}

// generateToken creates a new JWT token for App Store Connect API
func (c *AppStoreConnectClient) generateToken() error {
	now := time.Now()

	// Check if existing token is still valid
	if c.token != "" && c.tokenExp.After(now.Add(1*time.Minute)) {
		return nil
	}

	claims := jwt.MapClaims{
		"iss": c.issuerID,
		"iat": now.Unix(),
		"exp": now.Add(tokenTTL).Unix(),
		"aud": "appstoreconnect-v1",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["kid"] = c.keyID

	tokenString, err := token.SignedString(c.privateKey)
	if err != nil {
		return fmt.Errorf("failed to sign token: %w", err)
	}

	c.token = tokenString
	c.tokenExp = now.Add(tokenTTL)
	return nil
}

// makeRequest performs an authenticated request to the App Store Connect API
func (c *AppStoreConnectClient) makeRequest(ctx context.Context, method, endpoint string, body interface{}) ([]byte, error) {
	// Ensure we have a valid token
	if err := c.generateToken(); err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	url := appStoreConnectBaseURL + endpoint

	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// AppAnalytics represents app analytics data
type AppAnalytics struct {
	AppID          string                 `json:"appId"`
	AppName        string                 `json:"appName"`
	Downloads      int64                  `json:"downloads"`
	Updates        int64                  `json:"updates"`
	Revenue        float64                `json:"revenue"`
	ActiveDevices  int64                  `json:"activeDevices"`
	Crashes        int64                  `json:"crashes"`
	Ratings        RatingsData            `json:"ratings"`
	Period         string                 `json:"period"`
}

// RatingsData represents app ratings information
type RatingsData struct {
	AverageRating float64 `json:"averageRating"`
	TotalRatings  int64   `json:"totalRatings"`
	Distribution  map[int]int64 `json:"distribution"` // 1-5 star distribution
}

// GetAppAnalytics retrieves analytics for an app
func (c *AppStoreConnectClient) GetAppAnalytics(ctx context.Context, appID string, startDate, endDate time.Time) (*AppAnalytics, error) {
	// Get app information
	appData, err := c.makeRequest(ctx, "GET", fmt.Sprintf("/apps/%s", appID), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get app info: %w", err)
	}

	var appInfo struct {
		Data struct {
			Attributes struct {
				Name string `json:"name"`
			} `json:"attributes"`
		} `json:"data"`
	}
	if err := json.Unmarshal(appData, &appInfo); err != nil {
		return nil, fmt.Errorf("failed to parse app info: %w", err)
	}

	analytics := &AppAnalytics{
		AppID:   appID,
		AppName: appInfo.Data.Attributes.Name,
		Period:  fmt.Sprintf("%s to %s", startDate.Format("2006-01-02"), endDate.Format("2006-01-02")),
	}

	// Get analytics reports
	// Note: This is a simplified example. The actual App Store Connect API
	// requires more complex query parameters and response parsing
	metricsEndpoint := fmt.Sprintf("/analyticsReportRequests")
	reportRequest := map[string]interface{}{
		"data": map[string]interface{}{
			"type": "analyticsReportRequests",
			"attributes": map[string]interface{}{
				"accessType": "ONGOING",
			},
			"relationships": map[string]interface{}{
				"app": map[string]interface{}{
					"data": map[string]interface{}{
						"type": "apps",
						"id":   appID,
					},
				},
			},
		},
	}

	_, err = c.makeRequest(ctx, "POST", metricsEndpoint, reportRequest)
	if err != nil {
		// Log error but continue with available data
		fmt.Printf("Failed to get analytics report: %v\n", err)
	}

	// Get customer reviews for ratings
	ratingsData, err := c.GetAppRatings(ctx, appID)
	if err == nil {
		analytics.Ratings = *ratingsData
	}

	return analytics, nil
}

// GetAppRatings retrieves ratings data for an app
func (c *AppStoreConnectClient) GetAppRatings(ctx context.Context, appID string) (*RatingsData, error) {
	endpoint := fmt.Sprintf("/apps/%s/customerReviews", appID)
	data, err := c.makeRequest(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get ratings: %w", err)
	}

	var reviewsResponse struct {
		Data []struct {
			Attributes struct {
				Rating int `json:"rating"`
			} `json:"attributes"`
		} `json:"data"`
		Meta struct {
			Paging struct {
				Total int64 `json:"total"`
			} `json:"paging"`
		} `json:"meta"`
	}

	if err := json.Unmarshal(data, &reviewsResponse); err != nil {
		return nil, fmt.Errorf("failed to parse reviews: %w", err)
	}

	ratings := &RatingsData{
		TotalRatings: reviewsResponse.Meta.Paging.Total,
		Distribution: make(map[int]int64),
	}

	// Calculate distribution and average
	var totalScore int64
	for _, review := range reviewsResponse.Data {
		rating := review.Attributes.Rating
		ratings.Distribution[rating]++
		totalScore += int64(rating)
	}

	if len(reviewsResponse.Data) > 0 {
		ratings.AverageRating = float64(totalScore) / float64(len(reviewsResponse.Data))
	}

	return ratings, nil
}

// BuildInfo represents information about an app build
type BuildInfo struct {
	Version       string    `json:"version"`
	BuildNumber   string    `json:"buildNumber"`
	UploadedDate  time.Time `json:"uploadedDate"`
	ProcessingState string  `json:"processingState"`
	Platform      string    `json:"platform"`
}

// GetLatestBuild retrieves information about the latest build
func (c *AppStoreConnectClient) GetLatestBuild(ctx context.Context, appID string) (*BuildInfo, error) {
	endpoint := fmt.Sprintf("/apps/%s/builds?limit=1&sort=-uploadedDate", appID)
	data, err := c.makeRequest(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get builds: %w", err)
	}

	var buildsResponse struct {
		Data []struct {
			Attributes struct {
				Version         string    `json:"version"`
				BuildNumber     string    `json:"bundleVersion"`
				UploadedDate    time.Time `json:"uploadedDate"`
				ProcessingState string    `json:"processingState"`
				Platform        string    `json:"platform"`
			} `json:"attributes"`
		} `json:"data"`
	}

	if err := json.Unmarshal(data, &buildsResponse); err != nil {
		return nil, fmt.Errorf("failed to parse builds: %w", err)
	}

	if len(buildsResponse.Data) == 0 {
		return nil, fmt.Errorf("no builds found")
	}

	build := buildsResponse.Data[0].Attributes
	return &BuildInfo{
		Version:         build.Version,
		BuildNumber:     build.BuildNumber,
		UploadedDate:    build.UploadedDate,
		ProcessingState: build.ProcessingState,
		Platform:        build.Platform,
	}, nil
}

// TestFlightInfo represents TestFlight beta testing information
type TestFlightInfo struct {
	BetaTesters     int64     `json:"betaTesters"`
	BetaGroups      int64     `json:"betaGroups"`
	InstallCount    int64     `json:"installCount"`
	CrashCount      int64     `json:"crashCount"`
	FeedbackCount   int64     `json:"feedbackCount"`
	LastUpdated     time.Time `json:"lastUpdated"`
}

// GetTestFlightInfo retrieves TestFlight beta testing information
func (c *AppStoreConnectClient) GetTestFlightInfo(ctx context.Context, appID string) (*TestFlightInfo, error) {
	// Get beta testers count
	testersEndpoint := fmt.Sprintf("/apps/%s/betaTesters", appID)
	testersData, err := c.makeRequest(ctx, "GET", testersEndpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get beta testers: %w", err)
	}

	var testersResponse struct {
		Meta struct {
			Paging struct {
				Total int64 `json:"total"`
			} `json:"paging"`
		} `json:"meta"`
	}

	if err := json.Unmarshal(testersData, &testersResponse); err != nil {
		return nil, fmt.Errorf("failed to parse testers response: %w", err)
	}

	// Get beta groups count
	groupsEndpoint := fmt.Sprintf("/apps/%s/betaGroups", appID)
	groupsData, err := c.makeRequest(ctx, "GET", groupsEndpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get beta groups: %w", err)
	}

	var groupsResponse struct {
		Meta struct {
			Paging struct {
				Total int64 `json:"total"`
			} `json:"paging"`
		} `json:"meta"`
	}

	if err := json.Unmarshal(groupsData, &groupsResponse); err != nil {
		return nil, fmt.Errorf("failed to parse groups response: %w", err)
	}

	return &TestFlightInfo{
		BetaTesters: testersResponse.Meta.Paging.Total,
		BetaGroups:  groupsResponse.Meta.Paging.Total,
		LastUpdated: time.Now(),
	}, nil
}