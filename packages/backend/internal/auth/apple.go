package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
)

const (
	appleKeysURL = "https://appleid.apple.com/auth/keys"
	appleIssuer  = "https://appleid.apple.com"
)

// AppleTokenClaims represents the claims in an Apple ID token
type AppleTokenClaims struct {
	Sub            string `json:"sub"`
	Email          string `json:"email"`
	EmailVerified  string `json:"email_verified"`
	IsPrivateEmail string `json:"is_private_email"`
	AuthTime       int64  `json:"auth_time"`
	NonceSupported bool   `json:"nonce_supported"`
}

// AppleAuthVerifier handles Apple Sign In token verification
type AppleAuthVerifier struct {
	keySet   jwk.Set
	adminSub string
}

// NewAppleAuthVerifier creates a new Apple auth verifier
func NewAppleAuthVerifier(adminSub string) (*AppleAuthVerifier, error) {
	keySet, err := jwk.Fetch(context.Background(), appleKeysURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Apple public keys: %w", err)
	}

	return &AppleAuthVerifier{
		keySet:   keySet,
		adminSub: adminSub,
	}, nil
}

// VerifyToken verifies an Apple ID token and returns the claims
func (v *AppleAuthVerifier) VerifyToken(tokenString string) (*AppleTokenClaims, error) {
	// Parse and verify the token
	token, err := jwt.Parse(
		[]byte(tokenString),
		jwt.WithKeySet(v.keySet),
		jwt.WithValidate(true),
		jwt.WithIssuer(appleIssuer),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to verify token: %w", err)
	}

	// Extract claims
	claims := &AppleTokenClaims{}
	claimsMap, ok := token.PrivateClaims().(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid token claims format")
	}

	// Map claims
	if sub, ok := token.Subject(); ok {
		claims.Sub = sub
	}

	if email, ok := claimsMap["email"].(string); ok {
		claims.Email = email
	}

	if emailVerified, ok := claimsMap["email_verified"].(string); ok {
		claims.EmailVerified = emailVerified
	}

	if isPrivateEmail, ok := claimsMap["is_private_email"].(string); ok {
		claims.IsPrivateEmail = isPrivateEmail
	}

	if authTime, ok := claimsMap["auth_time"].(float64); ok {
		claims.AuthTime = int64(authTime)
	}

	if nonceSupported, ok := claimsMap["nonce_supported"].(bool); ok {
		claims.NonceSupported = nonceSupported
	}

	return claims, nil
}

// IsAdmin checks if the user is an admin based on their Apple ID sub
func (v *AppleAuthVerifier) IsAdmin(sub string) bool {
	return sub == v.adminSub
}

// RefreshKeys refreshes the Apple public keys from the JWKS endpoint
func (v *AppleAuthVerifier) RefreshKeys() error {
	keySet, err := jwk.Fetch(context.Background(), appleKeysURL)
	if err != nil {
		return fmt.Errorf("failed to refresh Apple public keys: %w", err)
	}
	v.keySet = keySet
	return nil
}

// AppleUserInfo represents user information from Apple
type AppleUserInfo struct {
	Sub           string    `json:"sub"`
	Email         string    `json:"email"`
	EmailVerified bool      `json:"email_verified"`
	IsAdmin       bool      `json:"is_admin"`
	AuthTime      time.Time `json:"auth_time"`
}

// GetUserInfo extracts user information from Apple token claims
func (v *AppleAuthVerifier) GetUserInfo(claims *AppleTokenClaims) *AppleUserInfo {
	return &AppleUserInfo{
		Sub:           claims.Sub,
		Email:         claims.Email,
		EmailVerified: claims.EmailVerified == "true",
		IsAdmin:       v.IsAdmin(claims.Sub),
		AuthTime:      time.Unix(claims.AuthTime, 0),
	}
}