#!/bin/bash

# YNG Sheet Utilities Build Script
# Usage:
#   ./build.sh              # Build all platforms (win + mac)
#   ./build.sh --win        # Build only Windows
#   ./build.sh --mac        # Build only macOS
#   ./build.sh --help       # Show help

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_step() {
    echo -e "${GREEN}==>${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}Warning:${NC} $1"
}

echo_error() {
    echo -e "${RED}Error:${NC} $1"
}

# Show help
show_help() {
    cat << EOF
YNG Sheet Utilities Build Script

Usage: ./build.sh [OPTIONS]

Options:
    --win       Build only Windows x64 installer + portable
    --mac       Build only macOS DMG installer
    --all       Build all platforms (default)
    --help      Show this help message

Examples:
    ./build.sh                 # Build for both Windows and macOS
    ./build.sh --win           # Build only Windows
    ./build.sh --mac           # Build only macOS
    ./build.sh --win --mac     # Build both explicitly

Output:
    Built files will be in: dist-electron/
    - Windows: YNG STool Setup x.x.x.exe + YNG STool-x.x.x-win.zip
    - macOS:   YNG STool-x.x.x.dmg
EOF
}

# Parse arguments
BUILD_WIN=false
BUILD_MAC=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --win)
            BUILD_WIN=true
            shift
            ;;
        --mac)
            BUILD_MAC=true
            shift
            ;;
        --all)
            BUILD_WIN=true
            BUILD_MAC=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            echo_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Default: build all if nothing specified
if [[ "$BUILD_WIN" == false && "$BUILD_MAC" == false ]]; then
    BUILD_WIN=true
    BUILD_MAC=true
fi

echo_step "YNG Sheet Utilities Build Script"
echo_step "================================"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo_error "npm is not installed or not in PATH"
    exit 1
fi

# Clean previous builds
echo_step "Cleaning previous builds..."
rm -rf dist-electron/*

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo_step "Installing dependencies..."
    npm install
fi

# Build TypeScript
echo_step "Building TypeScript..."
npm run build

# Build Electron
echo_step "Building Electron files..."
npm run build:electron

# Build based on platform selection
if [ "$BUILD_WIN" == true ]; then
    echo_step "Building for Windows x64..."
    npm run electron:build:win
    echo -e "${GREEN}Windows build complete!${NC}"
fi

if [ "$BUILD_MAC" == true ]; then
    echo_step "Building for macOS..."
    npm run electron:build:mac
    echo -e "${GREEN}macOS build complete!${NC}"
fi

echo_step "================================"
echo_step "Build Summary:"
echo "--------------"

if [ "$BUILD_WIN" == true ]; then
    echo "Windows (x64):"
    ls -lh dist-electron/*.exe 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
    ls -lh dist-electron/*.zip 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
fi

if [ "$BUILD_MAC" == true ]; then
    echo "macOS:"
    ls -lh dist-electron/*.dmg 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
fi

echo ""
echo_step "All builds completed successfully!"
