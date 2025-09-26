# Use Node.js 18 LTS as base image
FROM node:18-slim

# Install system dependencies for Puppeteer and Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libgconf-2-4 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libcairo-gobject2 \
    libgtk-3-0 \
    libgdk-pixbuf2.0-0 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libatspi2.0-0 \
    xvfb \
    x11-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome Stable (AMD64) or Chromium (ARM64)
RUN if [ "$(dpkg --print-architecture)" = "amd64" ]; then \
        wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg && \
        sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
        apt-get update && \
        apt-get install -y google-chrome-stable && \
        rm -rf /var/lib/apt/lists/*; \
    else \
        apt-get update && \
        apt-get install -y chromium chromium-driver && \
        rm -rf /var/lib/apt/lists/*; \
    fi

# Create app directory
WORKDIR /usr/src/app

# Create non-root user for security with specific UID/GID for volume compatibility
RUN groupadd -r whatsapp --gid=1000 && useradd -r -g whatsapp --uid=1000 -G audio,video whatsapp \
    && mkdir -p /home/whatsapp/Downloads \
    && chown -R whatsapp:whatsapp /home/whatsapp \
    && chown -R whatsapp:whatsapp /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create data directory for persistence and startup script
RUN mkdir -p /usr/src/app/data /usr/src/app/.wwebjs_auth /usr/src/app/.wwebjs_cache \
    && chown -R whatsapp:whatsapp /usr/src/app \
    && chmod -R 777 /usr/src/app/data /usr/src/app/.wwebjs_auth /usr/src/app/.wwebjs_cache

# Create startup script with better display management and permission fixes
RUN echo '#!/bin/bash\n\
echo "🖥️ Starting virtual display..."\n\
# Clean up any existing display locks\n\
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99 2>/dev/null || true\n\
# Create X11 directory with proper permissions\n\
mkdir -p /tmp/.X11-unix\n\
chmod 1777 /tmp/.X11-unix\n\
# Ensure volume directories have correct permissions\n\
mkdir -p /usr/src/app/.wwebjs_auth /usr/src/app/data\n\
chmod 777 /usr/src/app/.wwebjs_auth /usr/src/app/data\n\
# Start Xvfb with better error handling\n\
Xvfb :99 -screen 0 $XVFB_WHD -ac +extension GLX +render -noreset -nolisten tcp &\n\
XVFB_PID=$!\n\
echo "⏳ Waiting for display to be ready..."\n\
# Wait for display to be ready with timeout\n\
for i in {1..10}; do\n\
  if xdpyinfo -display :99 >/dev/null 2>&1; then\n\
    echo "✅ Display :99 is ready"\n\
    break\n\
  fi\n\
  echo "Waiting for display... ($i/10)"\n\
  sleep 1\n\
done\n\
echo "🚀 Starting WhatsApp AI Bot..."\n\
npm start' > /usr/src/app/start.sh \
    && chmod +x /usr/src/app/start.sh \
    && chown whatsapp:whatsapp /usr/src/app/start.sh

# Switch to non-root user
USER whatsapp

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-accelerated-2d-canvas --no-first-run --no-zygote --disable-gpu --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-extensions --disable-default-apps --disable-sync --disable-translate --hide-scrollbars --mute-audio --no-default-browser-check --no-pings --single-process"
ENV DISPLAY=:99
ENV XVFB_WHD=1280x720x16

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Start the application with virtual display
CMD ["bash", "/usr/src/app/start.sh"]
