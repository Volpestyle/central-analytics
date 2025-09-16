package main

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
)

// HTTPSProxy wraps an HTTP server with HTTPS using local certificates
type HTTPSProxy struct {
	targetPort  string
	httpsPort   string
	certFile    string
	keyFile     string
	proxy       *httputil.ReverseProxy
}

// NewHTTPSProxy creates a new HTTPS proxy server
func NewHTTPSProxy(targetPort, httpsPort string) (*HTTPSProxy, error) {
	// Certificate files are always in root certs directory
	certFile := filepath.Join("certs", "cert.pem")
	keyFile := filepath.Join("certs", "key.pem")

	// Verify certificates exist
	if _, err := os.Stat(certFile); os.IsNotExist(err) {
		return nil, fmt.Errorf("certificate file not found: %s", certFile)
	}
	if _, err := os.Stat(keyFile); os.IsNotExist(err) {
		return nil, fmt.Errorf("key file not found: %s", keyFile)
	}

	// Create reverse proxy to target port
	targetURL, err := url.Parse(fmt.Sprintf("http://127.0.0.1:%s", targetPort))
	if err != nil {
		return nil, fmt.Errorf("failed to parse target URL: %w", err)
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)

	// Custom director to preserve headers
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		// Preserve the original host header for the backend
		req.Host = targetURL.Host
		// Add forwarded headers
		req.Header.Set("X-Forwarded-Proto", "https")
		req.Header.Set("X-Forwarded-Host", req.Header.Get("Host"))
	}

	// Custom error handler
	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("Proxy error: %v", err)
		http.Error(w, "Backend service unavailable", http.StatusServiceUnavailable)
	}

	return &HTTPSProxy{
		targetPort: targetPort,
		httpsPort:  httpsPort,
		certFile:   certFile,
		keyFile:    keyFile,
		proxy:      proxy,
	}, nil
}

// Start starts the HTTPS proxy server
func (p *HTTPSProxy) Start() error {
	// Load certificates
	cert, err := tls.LoadX509KeyPair(p.certFile, p.keyFile)
	if err != nil {
		return fmt.Errorf("failed to load certificates: %w", err)
	}

	// Configure TLS
	tlsConfig := &tls.Config{
		Certificates: []tls.Certificate{cert},
		MinVersion:   tls.VersionTLS12,
		CipherSuites: []uint16{
			tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
			tls.TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305,
			tls.TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305,
			tls.TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
			tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
		},
	}

	// Create HTTPS server
	server := &http.Server{
		Addr:      fmt.Sprintf(":%s", p.httpsPort),
		Handler:   p,
		TLSConfig: tlsConfig,
	}

	log.Printf("Starting HTTPS proxy on https://local-dev.jcvolpe.me:%s", p.httpsPort)
	log.Printf("Proxying to HTTP backend on port %s", p.targetPort)

	return server.ListenAndServeTLS("", "")
}

// ServeHTTP handles incoming HTTPS requests and forwards them to the HTTP backend
func (p *HTTPSProxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Log the request for debugging
	log.Printf("Proxying request: %s %s", r.Method, r.URL.Path)

	// Forward to backend
	p.proxy.ServeHTTP(w, r)
}

// StartHTTPSProxy is a convenience function to start the HTTPS proxy
func StartHTTPSProxy(httpPort, httpsPort string) error {
	proxy, err := NewHTTPSProxy(httpPort, httpsPort)
	if err != nil {
		return err
	}
	return proxy.Start()
}