#!/bin/bash

echo "======================================"
echo "  SWEEPX - Installation Script"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) found${NC}"

# Check MongoDB
echo "Checking MongoDB installation..."
if ! command -v mongod &> /dev/null && ! command -v mongo &> /dev/null; then
    echo -e "${YELLOW}⚠ MongoDB not found locally. Make sure you have MongoDB running (local or Atlas).${NC}"
else
    echo -e "${GREEN}✓ MongoDB found${NC}"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "Creating .env file..."
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}⚠ Please edit .env with your configuration${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Check for Nothing font
echo ""
echo "Checking for Nothing font..."
if [ ! -f public/fonts/NothingFont-Regular.woff2 ]; then
    echo -e "${YELLOW}⚠ Nothing font not found${NC}"
    echo "  Please download from: https://github.com/xeji01/nothingfont"
    echo "  Place files in: public/fonts/"
else
    echo -e "${GREEN}✓ Nothing font found${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}Installation Complete!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your MongoDB connection"
echo "  2. Download Nothing font (optional but recommended)"
echo "  3. Start MongoDB: mongod"
echo "  4. Run the app: npm run dev:all"
echo ""
echo "Visit: http://localhost:3000"
echo ""
