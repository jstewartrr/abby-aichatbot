FROM ghcr.io/danny-avila/librechat-dev:latest

# Download the config file from GitHub (using ADD with URL)
ADD https://raw.githubusercontent.com/jstewartrr/abby-aichatbot/main/librechat.yaml /app/librechat.yaml

# Ensure the file has correct permissions
RUN chmod 644 /app/librechat.yaml

# Expose port
EXPOSE 3080

# Start the app
CMD ["npm", "run", "backend"]
