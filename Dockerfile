FROM ghcr.io/danny-avila/librechat:latest

# Switch to root to install curl and create startup script
USER root

# Install curl
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Create startup script that downloads config at runtime
RUN printf '#!/bin/bash\n\
set -e\n\
CONFIG_URL="${CONFIG_URL:-https://raw.githubusercontent.com/jstewartrr/abby-aichatbot/main/librechat.yaml}"\n\
echo "Downloading config from $CONFIG_URL..."\n\
curl -fsSL "$CONFIG_URL" -o /app/librechat.yaml\n\
echo "Config downloaded successfully"\n\
cat /app/librechat.yaml | head -20\n\
exec npm run backend\n' > /app/start.sh && chmod +x /app/start.sh

# Switch back to node user
USER node

WORKDIR /app

# Expose port
EXPOSE 3080

# Start with our script
CMD ["/bin/bash", "/app/start.sh"]
