#!/bin/bash

echo "🧹 Cleaning up Chrome sessions and locks..."

# Kill any existing Chrome processes
pkill -f chrome
pkill -f chromium
pkill -f google-chrome

# Remove Chrome session locks
rm -rf /home/cloud/whatsapp-ai/.wwebjs_auth/session/SingletonLock
rm -rf /home/cloud/whatsapp-ai/.wwebjs_auth/session/.org.chromium.Chromium.*
rm -rf /home/cloud/whatsapp-ai/.wwebjs_cache

# Clean up any X11 locks
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99

# Kill existing Xvfb processes
pkill -f Xvfb

echo "✅ Cleanup completed!"

# Restart Xvfb with proper settings
echo "🖥️ Starting virtual display..."
export DISPLAY=:99
Xvfb :99 -screen 0 1280x720x16 -ac +extension GLX +render -noreset &

# Wait for display to be ready
sleep 2

echo "🚀 Ready to start WhatsApp bot!"
echo "Run: npm start"
