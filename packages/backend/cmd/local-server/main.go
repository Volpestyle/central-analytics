package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	// Parse command-line flags
	var (
		httpsMode = flag.Bool("https", false, "Enable HTTPS proxy mode for Apple Sign In testing")
		httpsPort = flag.String("https-port", "3000", "HTTPS proxy port (default: 3000)")
	)
	flag.Parse()

	cfg, err := LoadConfig()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// If HTTPS mode is enabled, start both HTTP server and HTTPS proxy
	if *httpsMode {
		// Start the main HTTP server in a goroutine
		app, err := NewApp(cfg)
		if err != nil {
			log.Fatal("Failed to initialize app:", err)
		}

		srv := &http.Server{
			Addr:         ":" + cfg.Port,
			Handler:      app.Router(),
			ReadTimeout:  cfg.ReadTimeout,
			WriteTimeout: cfg.WriteTimeout,
			IdleTimeout:  cfg.IdleTimeout,
		}

		// Start HTTP server in background
		go func() {
			app.logger.Info("Starting HTTP server", "port", cfg.Port)
			if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				app.logger.Error("HTTP server failed to start", "error", err)
				os.Exit(1)
			}
		}()

		// Give HTTP server time to start
		time.Sleep(1 * time.Second)

		// Start HTTPS proxy in another goroutine
		go func() {
			fmt.Printf("\n🔐 Starting HTTPS proxy for Apple Sign In testing...\n")
			fmt.Printf("   HTTPS: https://local-dev.jcvolpe.me:%s\n", *httpsPort)
			fmt.Printf("   Proxying to HTTP backend on port %s\n\n", cfg.Port)

			if err := StartHTTPSProxy(cfg.Port, *httpsPort); err != nil {
				log.Fatal("Failed to start HTTPS proxy:", err)
			}
		}()

		// Handle graceful shutdown
		done := make(chan os.Signal, 1)
		signal.Notify(done, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)
		<-done

		app.logger.Info("Shutting down servers...")

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			app.logger.Error("Server shutdown failed", "error", err)
		}
		if err := app.Shutdown(ctx); err != nil {
			app.logger.Error("App shutdown failed", "error", err)
		}

	} else {
		// Normal HTTP-only mode (original behavior)
		app, err := NewApp(cfg)
		if err != nil {
			log.Fatal("Failed to initialize app:", err)
		}

		srv := &http.Server{
			Addr:         ":" + cfg.Port,
			Handler:      app.Router(),
			ReadTimeout:  cfg.ReadTimeout,
			WriteTimeout: cfg.WriteTimeout,
			IdleTimeout:  cfg.IdleTimeout,
		}

		// Graceful shutdown
		done := make(chan os.Signal, 1)
		signal.Notify(done, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

		go func() {
			app.logger.Info("Starting server", "port", cfg.Port)
			if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				app.logger.Error("Server failed to start", "error", err)
				os.Exit(1)
			}
		}()

		<-done
		app.logger.Info("Server stopping")

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			app.logger.Error("Server shutdown failed", "error", err)
			os.Exit(1)
		}

		if err := app.Shutdown(ctx); err != nil {
			app.logger.Error("App shutdown failed", "error", err)
			os.Exit(1)
		}

		app.logger.Info("Server exited")
	}
}
