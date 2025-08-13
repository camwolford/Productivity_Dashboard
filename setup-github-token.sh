#!/bin/bash

# Setup script for storing GitHub Personal Access Token in macOS keychain
# This enables auto-updates for the private repository

echo "🔐 Setting up GitHub token for auto-updates..."
echo ""
echo "This script will securely store your GitHub Personal Access Token"
echo "in the macOS keychain so the app can access private repository updates."
echo ""
echo "Make sure you have created a GitHub Personal Access Token with minimal permissions."
echo "Recommended: fine-grained token with read-only access to this repository."
echo ""
echo "Create token at: https://github.com/settings/personal-access-tokens/new"
echo "Select only the 'Productivity_Dashboard' repository with 'Contents: read' permission."
echo "" 

# Prompt for token
read -s -p "Enter your GitHub Personal Access Token: " token
echo ""

if [ -z "$token" ]; then
    echo "❌ No token provided. Exiting."
    exit 1
fi

# Validate token has read access to the update repository
REPO="camwolford/Productivity_Dashboard"
status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $token" \
    -H "Accept: application/vnd.github+json" \
    https://api.github.com/repos/$REPO)

if [ "$status" != "200" ]; then
    echo "❌ Token cannot access $REPO. Ensure it has read-only permissions for this repository."
    exit 1
fi

# Display token scopes when available (classic tokens)
scopes=$(curl -sI -H "Authorization: Bearer $token" https://api.github.com/user | \
    tr -d '\r' | grep -i '^x-oauth-scopes:' | cut -d' ' -f2-)
if [ -n "$scopes" ]; then
    echo "ℹ️ Token scopes: $scopes"
else
    echo "ℹ️ Fine-grained token detected (no classic OAuth scopes returned)."
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