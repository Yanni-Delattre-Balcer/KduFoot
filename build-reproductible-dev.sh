#!/bin/bash

# Reproducible build script for local development (Dev version for CI)
# Uses the npm workaround to avoid Yarn workspaces resolution conflicts

set -e

echo "🔨 Reproducible build (Dev) with npm workaround"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backup workspace files
echo -e "${YELLOW}💾 Backing up workspace files...${NC}"
if [ -f "package.json" ]; then
    mv package.json package.json.bak
fi


# Clean existing node_modules
echo -e "${YELLOW}🧹 Cleaning node_modules...${NC}"
rm -rf node_modules
rm -rf apps/client/node_modules 
rm -rf apps/cloudflare-worker/node_modules
rm -rf .turbo
rm -rf apps/client/.turbo
rm -rf apps/client/dist

# npm install in each app
echo -e "${YELLOW}📦 npm install in client...${NC}"
cd apps/client
npm install
cd ../../

echo -e "${YELLOW}📦 npm install in cloudflare-worker...${NC}"
cd apps/cloudflare-worker
npm install
cd ../../

# Restore files
echo -e "${YELLOW}🔄 Restoring files...${NC}"
if [ -f "package.json.bak" ]; then
    mv package.json.bak package.json
fi

# Reinstall for Turborepo
echo -e "${YELLOW}⚡ Installing for Turborepo...${NC}"
npm install

# Build client with environment
echo -e "${YELLOW}🔨 Building project...${NC}"
npm run build:env

# Check
if [ -d "apps/client/dist" ]; then
    echo -e "${GREEN}✅ Client build succeeded${NC}"
    
    # Check HeroUI styles
    echo -e "${YELLOW}🎨 Checking HeroUI styles...${NC}"
    if find apps/client/dist -name "*.css" -exec grep -l "rounded\|heroui" {} \; | grep -q .; then
        echo -e "${GREEN}✅ HeroUI styles detected${NC}"
    else
        echo -e "${RED}⚠️  HeroUI styles not detected${NC}"
    fi
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Reproducible build finished${NC}"
