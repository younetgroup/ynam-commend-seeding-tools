#!/bin/bash
# Script to start Chrome with debugging enabled for YNAM Comment Verification Tool

echo "🔍 Checking for existing Chrome processes..."

# Check if Chrome is already running
if pgrep -f "Google Chrome" > /dev/null; then
    echo "⚠️  Chrome is currently running. You need to close all Chrome windows first."
    echo ""
    read -p "Press Enter after you've closed all Chrome windows, or Ctrl+C to cancel..."
fi

# Double-check Chrome is closed
if pgrep -f "Google Chrome" > /dev/null; then
    echo "❌ Chrome is still running. Please close all Chrome windows and try again."
    exit 1
fi

echo "✅ Starting Chrome with debugging enabled on port 9222..."
echo ""

# Create a separate Chrome profile for debugging (required by Chrome)
DEBUG_PROFILE_DIR="$HOME/.chrome-debug-profile"

# Create the directory if it doesn't exist
mkdir -p "$DEBUG_PROFILE_DIR"

echo "📁 Using debug profile directory: $DEBUG_PROFILE_DIR"
echo ""
echo "⚠️  NOTE: You will need to log into Facebook again in this Chrome window"
echo "   (This is a separate Chrome profile used only for debugging)"
echo ""

# Start Chrome with debugging using a non-default profile
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
    --remote-debugging-port=9222 \
    --user-data-dir="$DEBUG_PROFILE_DIR" \
    > /dev/null 2>&1 &

echo "📝 IMPORTANT:"
echo "   1. Wait for Chrome window to fully open"
echo "   2. You'll need to log into Facebook in this window"
echo ""
read -p "Press Enter after Chrome has opened..."

# Wait for Chrome debugging to be ready (with retries)
echo ""
echo "🔍 Waiting for Chrome debugging to be ready..."

MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:9222/json/version > /dev/null 2>&1; then
        echo "✅ Chrome debugging is ready!"
        echo ""
        echo "Next steps:"
        echo "1. Log into Facebook in the Chrome window"
        echo "2. Run: npm start verify"
        exit 0
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "   Waiting... (attempt $RETRY_COUNT/$MAX_RETRIES)"
        sleep 1
    fi
done

echo ""
echo "❌ Failed to verify Chrome debugging port after $MAX_RETRIES attempts."
echo ""
echo "Troubleshooting:"
echo "  1. Check if Chrome actually opened"
echo "  2. Try running manually in a new terminal:"
echo "     /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\"
echo "       --remote-debugging-port=9222 \\"
echo "       --user-data-dir=\"\$HOME/.chrome-debug-profile\""
echo "  3. Verify the port is accessible:"
echo "     curl http://localhost:9222/json/version"
exit 1
