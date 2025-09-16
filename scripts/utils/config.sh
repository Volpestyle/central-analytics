#!/bin/bash

# Shared configuration for all scripts
# This file standardizes variable names across the project

# Default configuration values
DEFAULT_BASE_DOMAIN="ilikeyacut.com"
DEFAULT_LOCAL_SUBDOMAIN="dev"
DEFAULT_FRONTEND_PORT="4321"
DEFAULT_BACKEND_HTTP_PORT="8080"
DEFAULT_BACKEND_HTTPS_PORT="3000"

# Configuration file path
CONFIG_FILE=".domain.config"

# Function to load configuration
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
    else
        # Set defaults if no config exists
        BASE_DOMAIN="${BASE_DOMAIN:-$DEFAULT_BASE_DOMAIN}"
        LOCAL_SUBDOMAIN="${LOCAL_SUBDOMAIN:-$DEFAULT_LOCAL_SUBDOMAIN}"
        FRONTEND_PORT="${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}"
        BACKEND_HTTP_PORT="${BACKEND_HTTP_PORT:-$DEFAULT_BACKEND_HTTP_PORT}"
        BACKEND_HTTPS_PORT="${BACKEND_HTTPS_PORT:-$DEFAULT_BACKEND_HTTPS_PORT}"
    fi

    # Always construct LOCAL_DOMAIN from components
    LOCAL_DOMAIN="${LOCAL_SUBDOMAIN}.${BASE_DOMAIN}"

    # Export all variables for child processes
    export BASE_DOMAIN
    export LOCAL_SUBDOMAIN
    export LOCAL_DOMAIN
    export FRONTEND_PORT
    export BACKEND_HTTP_PORT
    export BACKEND_HTTPS_PORT
}

# Function to save configuration
save_config() {
    cat > "$CONFIG_FILE" << EOF
# Domain configuration
BASE_DOMAIN="${BASE_DOMAIN}"
LOCAL_SUBDOMAIN="${LOCAL_SUBDOMAIN}"
LOCAL_DOMAIN="${LOCAL_DOMAIN}"

# Port configuration
FRONTEND_PORT="${FRONTEND_PORT}"
BACKEND_HTTP_PORT="${BACKEND_HTTP_PORT}"
BACKEND_HTTPS_PORT="${BACKEND_HTTPS_PORT}"
EOF
    echo "Configuration saved to $CONFIG_FILE"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i:"$1" >/dev/null 2>&1
}

# Function to make script executable
ensure_executable() {
    if [ -f "$1" ]; then
        chmod +x "$1"
    else
        echo "Warning: Script $1 not found"
        return 1
    fi
}