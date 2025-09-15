package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// SessionClaims represents the JWT claims for user sessions
type SessionClaims struct {
	jwt.RegisteredClaims
	UserID  string `json:"user_id"`
	Email   string `json:"email"`
	IsAdmin bool   `json:"is_admin"`
}

// JWTManager handles JWT creation and validation
type JWTManager struct {
	secretKey []byte
	issuer    string
	ttl       time.Duration
}

// NewJWTManager creates a new JWT manager
func NewJWTManager(secretKey []byte, issuer string, ttl time.Duration) *JWTManager {
	return &JWTManager{
		secretKey: secretKey,
		issuer:    issuer,
		ttl:       ttl,
	}
}

// GenerateToken creates a new JWT token for a user session
func (m *JWTManager) GenerateToken(userInfo *AppleUserInfo) (string, error) {
	now := time.Now()
	claims := SessionClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    m.issuer,
			Subject:   userInfo.Sub,
			ExpiresAt: jwt.NewNumericDate(now.Add(m.ttl)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ID:        GenerateSessionID(),
		},
		UserID:  userInfo.Sub,
		Email:   userInfo.Email,
		IsAdmin: userInfo.IsAdmin,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(m.secretKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// ValidateToken validates a JWT token and returns the claims
func (m *JWTManager) ValidateToken(tokenString string) (*SessionClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &SessionClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return m.secretKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*SessionClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	// Additional validation
	if claims.Issuer != m.issuer {
		return nil, fmt.Errorf("invalid token issuer")
	}

	return claims, nil
}

// RefreshToken creates a new token with extended expiration
func (m *JWTManager) RefreshToken(claims *SessionClaims) (string, error) {
	now := time.Now()
	claims.ExpiresAt = jwt.NewNumericDate(now.Add(m.ttl))
	claims.IssuedAt = jwt.NewNumericDate(now)
	claims.ID = GenerateSessionID()

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(m.secretKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign refreshed token: %w", err)
	}

	return tokenString, nil
}

// GenerateSessionID creates a unique session identifier
func GenerateSessionID() string {
	return fmt.Sprintf("%d-%s", time.Now().Unix(), generateRandomString(16))
}

// generateRandomString creates a random string of specified length
func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}