# Foundry Development Environment
FROM ghcr.io/foundry-rs/foundry:latest

# Set working directory
WORKDIR /app

# Set up the entrypoint to keep the container running
ENTRYPOINT ["/bin/bash"]

# Default command
CMD ["-c", "echo 'Foundry development environment ready!'; forge --version; cast --version; anvil --version; exec /bin/bash"]
