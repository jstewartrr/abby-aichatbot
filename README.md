# ABBI HiveMind Chat

Multi-model AI chat interface powered by LibreChat with access to Claude, GPT-4o, Gemini, Grok, DeepSeek, and local Ollama models.

## Quick Install (Mac)

```bash
git clone https://github.com/jstewartrr/abby-aichatbot.git
cd abby-aichatbot
chmod +x setup.sh
./setup.sh
```

## Requirements

- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- API keys for models you want to use

## Configured Models

| Model | Provider | Key Required |
|-------|----------|--------------|
| Claude Opus 4.5 / Sonnet 4 | Anthropic | `ANTHROPIC_API_KEY` |
| GPT-4o / o1 | OpenAI | `OPENAI_API_KEY` |
| Gemini 2.0 Flash | Google | `GOOGLE_KEY` |
| Grok 2 | xAI | `XAI_API_KEY` |
| DeepSeek R1 | DeepSeek | `DEEPSEEK_API_KEY` |
| Llama 3.2 / Mistral | Ollama (Local) | `OLLAMA_BASE_URL` |

## Configuration

1. Copy `.env.example` to `.env`
2. Add your API keys
3. For Ollama: Set `OLLAMA_BASE_URL` to your Tailscale IP (e.g., `http://100.x.x.x:11434`)

## Usage

```bash
# Start
docker compose up -d

# Access
open http://localhost:3080

# Stop
docker compose down

# View logs
docker compose logs -f
```

## Files

- `docker-compose.yml` - Container orchestration
- `librechat.yaml` - Model configuration
- `.env` - API keys (create from `.env.example`)
- `setup.sh` - One-line installer

## Part of Sovereign Mind

This is the local chat component of the ABBI (Adaptive Second Brain Intelligence) ecosystem.

- **Web Interface**: [abbi-ai.com](https://abbi-ai.com)
- **Avatar Interface**: [create-simli-app-sm.vercel.app](https://create-simli-app-sm.vercel.app)
