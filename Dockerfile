FROM ghcr.io/danny-avila/librechat-dev:latest

# Switch to root to download and set permissions
USER root

# Download the config file from GitHub
ADD https://raw.githubusercontent.com/jstewartrr/abby-aichatbot/main/librechat.yaml /app/librechat.yaml

# Ensure the file has correct permissions
RUN chmod 644 /app/librechat.yaml && chown node:node /app/librechat.yaml

# Switch back to node user
USER node

# Expose port
EXPOSE 3080

# Start the app
CMD ["npm", "run", "backend"]
