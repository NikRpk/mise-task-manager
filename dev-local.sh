#!/bin/bash

# Local Development with Emulators
# Run Firebase emulators for local testing without affecting production

set -e

echo "🏠 Starting Local Development Environment..."
echo ""

# Check if Firebase emulators are installed
if ! firebase --version &> /dev/null; then
    echo "❌ Firebase CLI not found. Install with:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

echo "🔥 Starting Firebase emulators..."
echo "   - Firestore emulator on port 8080"
echo "   - Auth emulator on port 9099"
echo ""

# Start emulators in background
firebase emulators:start --only firestore,auth &
EMULATOR_PID=$!

# Wait for emulators to be ready
echo "⏳ Waiting for emulators to start..."
sleep 5

echo ""
echo "🚀 Starting Next.js development server..."
echo ""

# Set environment variables to use emulators
export FIRESTORE_EMULATOR_HOST="localhost:8080"
export FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"
export NEXT_PUBLIC_USE_EMULATOR="true"

# Start Next.js dev server
npm run dev

# Cleanup on exit
trap "kill $EMULATOR_PID 2>/dev/null" EXIT
