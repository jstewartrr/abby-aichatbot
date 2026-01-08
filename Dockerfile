FROM ghcr.io/danny-avila/librechat-dev:latest

# Copy custom config
COPY librechat.yaml /app/librechat.yaml

# Expose port
EXPOSE 3080

# Start the app
CMD ["npm", "run", "backend"]
