#!/bin/bash

# Install Chrome on Ubuntu/Debian
echo "Installing Google Chrome..."

# Update package list
sudo apt-get update

# Install dependencies
sudo apt-get install -y wget gnupg

# Add Google Chrome repository
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list'

# Update package list again
sudo apt-get update

# Install Google Chrome
sudo apt-get install -y google-chrome-stable

# Install Xvfb for headless display
sudo apt-get install -y xvfb

echo "Chrome installation completed!"
echo "Chrome location: $(which google-chrome-stable)"
