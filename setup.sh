#!/bin/bash

# ABBI HiveMind Chat - LibreChat Setup Script
# One-line install: git clone https://github.com/jstewartrr/abby-aichatbot.git && cd abby-aichatbot && ./setup.sh

set -e

echo "🧠 ABBI HiveMind Chat - Setup"
echo "=============================="

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker Desktop first:"
    echo "   https://www.docker.com/products/docker-desktop/"
    exit 1
fi

echo "✅ Docker found"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Docker is running"

# Create .env from example if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file with your API keys:"
    echo "   nano .env"
    echo ""
    echo "   Required keys:"
    echo "   - ANTHROPIC_API_KEY (Claude)"
    echo "   - OPENAI_API_KEY (GPT-4o)"
    echo "   - GOOGLE_KEY (Gemini)"
    echo "   - XAI_API_KEY (Grok)"
    echo "   - DEEPSEEK_API_KEY (DeepSeek)"
    echo "   - OLLAMA_BASE_URL (Tailscale IP for local Ollama)"
    echo ""
    read -p "Press Enter after editing .env to continue..."
fi

# Create required directories
echo "📁 Creating directories..."
mkdir -p images logs

# Pull and start containers
echo "🐳 Starting LibreChat containers..."
docker compose pull
docker compose up -d

echo ""
echo "✅ ABBI HiveMind Chat is starting!"
echo ""
echo "🌐 Access at: http://localhost:3080"
echo ""
echo "📊 Configured Models:"
echo "   • Claude Opus 4.5 / Sonnet 4"
echo "   • GPT-4o / o1"
echo "   • Gemini 2.0 Flash"
echo "   • Grok 2"
echo "   • DeepSeek R1"
echo "   • Ollama (via Tailscale)"
echo ""
echo "🛑 To stop: docker compose down"
echo "📋 View logs: docker compose logs -f"
