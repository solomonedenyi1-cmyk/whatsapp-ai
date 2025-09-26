#!/bin/bash

# WhatsApp AI Bot - Fix Volume Permissions Script
# This script fixes file permissions for Docker volumes

echo "🔧 Fixing Docker volume permissions for WhatsApp AI Bot..."

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define volume paths (adjust these if you use different paths)
DATA_DIR="$HOME/docker/docker-data/whatsapp-ai"
SESSIONS_DIR="$DATA_DIR/whatsapp_sessions"
APP_DATA_DIR="$DATA_DIR/app_data"

echo "📁 Creating volume directories..."
mkdir -p "$SESSIONS_DIR"
mkdir -p "$APP_DATA_DIR"

echo "🔐 Setting proper permissions..."
# Set permissions for the whatsapp user (UID 999 in container)
sudo chown -R 999:999 "$SESSIONS_DIR"
sudo chown -R 999:999 "$APP_DATA_DIR"
sudo chmod -R 755 "$SESSIONS_DIR"
sudo chmod -R 755 "$APP_DATA_DIR"

echo "✅ Permissions fixed!"
echo "📍 Volume directories:"
echo "   Sessions: $SESSIONS_DIR"
echo "   App Data: $APP_DATA_DIR"
echo ""
echo "🚀 You can now run: docker-compose up -d"
