#!/bin/bash

# Setup script for storing GitHub Personal Access Token in macOS keychain
# This enables auto-updates for the private repository

echo "🔐 Setting up GitHub token for auto-updates..."
echo ""
echo "This script will securely store your GitHub Personal Access Token"
echo "in the macOS keychain so the app can access private repository updates."
echo ""
echo "Make sure you have created a GitHub Personal Access Token with:"
echo "  ✅ repo (Full control of private repositories)"
echo "  ✅ read:packages (Download packages)"
echo ""
echo "Create token at: https://github.com/settings/tokens"
echo ""

# Prompt for token
read -s -p "Enter your GitHub Personal Access Token: " token
echo ""

if [ -z "$token" ]; then
    echo "❌ No token provided. Exiting."
    exit 1
fi

# Store in keychain
security add-generic-password \
    -a "productivity-dashboard" \
    -s "github-token" \
    -w "$token" \
    -U

if [ $? -eq 0 ]; then
    echo "✅ GitHub token stored successfully in keychain!"
    echo ""
    echo "The Productivity Dashboard app can now:"
    echo "  • Check for updates automatically"
    echo "  • Download updates from the private repository"
    echo "  • Install updates seamlessly"
    echo ""
    echo "🔒 Your token is stored securely in macOS keychain and won't appear in any files."
else
    echo "❌ Failed to store token in keychain."
    echo "Make sure you have the necessary permissions."
    exit 1
fi