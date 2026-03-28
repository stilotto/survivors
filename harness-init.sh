#!/bin/bash
# harness-init.sh — Initialize a new project from the 0harness template
# Run this INSIDE your new project directory after copying template files.
#
# Usage: ./harness-init.sh

set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  0harness — Project Initialization"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Collect project info
read -p "Project name (e.g., MyNewGame): " PROJECT_NAME
if [ -z "$PROJECT_NAME" ]; then
  echo "Error: Project name cannot be empty."
  exit 1
fi

read -p "Xcode scheme (default: \"${PROJECT_NAME} iOS\"): " SCHEME
SCHEME="${SCHEME:-${PROJECT_NAME} iOS}"

read -p "Simulator destination (default: platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5): " DESTINATION
DESTINATION="${DESTINATION:-platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5}"

read -p "GitHub remote URL (e.g., https://github.com/user/repo.git, or leave blank): " REMOTE_URL

echo ""
echo "Configuration:"
echo "  Project:     $PROJECT_NAME"
echo "  Scheme:      $SCHEME"
echo "  Simulator:   $DESTINATION"
echo "  Remote:      ${REMOTE_URL:-none}"
echo ""
read -p "Proceed? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
  echo "Aborted."
  exit 0
fi

PROJECT_ROOT="$(pwd)"

# Initialize git repo if needed
if [ ! -d ".git" ]; then
  echo "Initializing git repository..."
  git init
fi

# Set up remote if provided
if [ -n "$REMOTE_URL" ]; then
  if git remote get-url origin &>/dev/null; then
    echo "Remote 'origin' already exists, updating..."
    git remote set-url origin "$REMOTE_URL"
  else
    echo "Adding remote origin..."
    git remote add origin "$REMOTE_URL"
  fi
fi

# Fill in project.config.md
echo "Configuring project.config.md..."
sed -i '' "s|REPLACEME.xcodeproj|${PROJECT_NAME}.xcodeproj|g" project.config.md
sed -i '' "s|\"REPLACEME iOS\"|\"${SCHEME}\"|g" project.config.md
sed -i '' "s|platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5|${DESTINATION}|g" project.config.md
sed -i '' "s|PROJECT_ROOT|${PROJECT_ROOT}|g" project.config.md
sed -i '' "s|<ProjectName>|${PROJECT_NAME}|g" project.config.md

# Fill in ARCHITECTURE.md
echo "Configuring ARCHITECTURE.md..."
sed -i '' "s|<ProjectName>|${PROJECT_NAME}|g" ARCHITECTURE.md

# Fill in CLAUDE.md
echo "Configuring CLAUDE.md..."
sed -i '' "s|<ProjectName>|${PROJECT_NAME}|g" CLAUDE.md

# Make loop.sh executable
chmod +x loop.sh

# Create looplog directory if it doesn't exist
mkdir -p looplog

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Initialization complete!"
echo ""
echo "  Next steps:"
echo "  1. Create your Xcode project (${PROJECT_NAME}.xcodeproj)"
echo "  2. Fill in the Project Brief section of CLAUDE.md"
echo "  3. Add ideas to IDEAS.md"
echo "  4. Create an implementation-plan.md from your ideas"
echo "  5. Run: ./loop.sh <number-of-iterations>"
echo ""
echo "  To view the dashboard:"
echo "  python3 -m http.server 8080"
echo "  Open: http://localhost:8080/dashboard.html"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
