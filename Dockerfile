# WhatsApp AI Bot - Python Edition
# Multi-stage Docker build for optimized production image

FROM python:3.11-slim AS builder

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies for building
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Production stage
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    DISPLAY=:99

# Install Chrome/Chromium and system dependencies
RUN apt-get update && apt-get install -y \
    # Chrome dependencies
    wget \
    gnupg \
    unzip \
    curl \
    xvfb \
    x11-utils \
    ca-certificates \
    # Architecture detection and browser installation
    && ARCH=$(dpkg --print-architecture) \
    && if [ "$ARCH" = "amd64" ]; then \
        # Install Google Chrome for AMD64
        wget -q -O /tmp/google-chrome-key.gpg https://dl-ssl.google.com/linux/linux_signing_key.pub \
        && gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg /tmp/google-chrome-key.gpg \
        && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
        && apt-get update \
        && apt-get install -y google-chrome-stable \
        && rm -f /tmp/google-chrome-key.gpg \
        # Install latest chromedriver
        && wget -O /tmp/chromedriver.zip "https://storage.googleapis.com/chrome-for-testing-public/130.0.6723.69/linux64/chromedriver-linux64.zip" \
        && unzip /tmp/chromedriver.zip -d /tmp/ \
        && mv /tmp/chromedriver-linux64/chromedriver /usr/local/bin/chromedriver \
        && chmod +x /usr/local/bin/chromedriver \
        && rm -rf /tmp/chromedriver.zip /tmp/chromedriver-linux64; \
    else \
        # Install Chromium for ARM64 and other architectures
        apt-get install -y chromium chromium-driver \
        && ln -s /usr/bin/chromedriver /usr/local/bin/chromedriver; \
    fi \
    # Cleanup
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Create non-root user for security
RUN groupadd -r whatsapp && useradd -r -g whatsapp -s /bin/bash -m whatsapp

# Create application directory
WORKDIR /usr/src/app

# Copy application code
COPY src/ ./src/
COPY pyproject.toml .
COPY config.example.json .

# Create necessary directories and set permissions
RUN mkdir -p data logs .chrome_user_data .wwebjs_auth && \
    chown -R whatsapp:whatsapp /usr/src/app && \
    mkdir -p /home/whatsapp/.local/share/applications && \
    chown -R whatsapp:whatsapp /home/whatsapp

# Switch to non-root user
USER whatsapp

# Create startup script
COPY <<EOF /usr/src/app/start.sh
#!/bin/bash
set -e

echo "🐳 Starting WhatsApp AI Bot in Docker..."

# Setup display for headless Chrome
export DISPLAY=:99

# Clean up any existing X11 locks
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99 2>/dev/null || true

# Start Xvfb in background
echo "🖥️ Starting virtual display..."
Xvfb :99 -screen 0 1024x768x24 -ac +extension GLX +render -noreset &
XVFB_PID=\$!

# Wait for display to be ready
echo "⏳ Waiting for display to be ready..."
timeout=30
while [ \$timeout -gt 0 ]; do
    if xdpyinfo -display :99 >/dev/null 2>&1; then
        echo "✅ Display ready"
        break
    fi
    sleep 1
    timeout=\$((timeout - 1))
done

if [ \$timeout -eq 0 ]; then
    echo "❌ Display failed to start"
    exit 1
fi

# Cleanup function
cleanup() {
    echo "🛑 Shutting down..."
    if [ ! -z "\$XVFB_PID" ]; then
        kill \$XVFB_PID 2>/dev/null || true
    fi
    rm -f /tmp/.X99-lock /tmp/.X11-unix/X99 2>/dev/null || true
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Start the bot
echo "🤖 Starting WhatsApp AI Bot..."
cd /usr/src/app

# Set Chrome/Chromium path based on architecture
ARCH=\$(dpkg --print-architecture)
if [ "\$ARCH" = "amd64" ]; then
    export CHROME_PATH="/usr/bin/google-chrome-stable"
else
    export CHROME_PATH="/usr/bin/chromium"
fi

python -m whatsapp_ai.main start
EOF

# Make startup script executable
USER root
RUN chmod +x /usr/src/app/start.sh && chown whatsapp:whatsapp /usr/src/app/start.sh
USER whatsapp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -m whatsapp_ai.main health || exit 1

# Expose port (if needed for health checks)
EXPOSE 8080

# Set Python path
ENV PYTHONPATH="/usr/src/app/src"

# Default command
CMD ["/usr/src/app/start.sh"]
