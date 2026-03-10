# Foundry Docker Development Environment

Complete Foundry development environment in Docker for Ethereum smart contract development.

## What's Included

- **forge** - Smart contract testing and building
- **cast** - CLI tool for interacting with Ethereum contracts
- **anvil** - Local Ethereum node for testing
- **chisel** - Interactive Solidity REPL

## Prerequisites

- Docker Desktop installed and running on macOS

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Build and start the container:**
   ```bash
   docker-compose up -d --build
   ```

2. **Enter the container:**
   ```bash
   docker-compose exec foundry bash
   ```

3. **Verify installation:**
   ```bash
   forge --version
   cast --version
   anvil --version
   ```

4. **Stop the container:**
   ```bash
   docker-compose down
   ```

### Option 2: Using Docker CLI

1. **Build the image:**
   ```bash
   docker build -t foundry-dev .
   ```

2. **Run a container:**
   ```bash
   docker run -it -v $(pwd):/app -p 8545:8545 foundry-dev
   ```

## Usage Examples

### Create a new project
```bash
docker-compose exec foundry forge init my-project
cd my-project
```

### Run tests
```bash
docker-compose exec foundry forge test
```

### Build contracts
```bash
docker-compose exec foundry forge build
```

### Start a local node (Anvil)
```bash
docker-compose exec foundry anvil
```

### In a separate terminal, interact with the local node
```bash
docker-compose exec foundry cast balance <address> --rpc-url http://localhost:8545
```

## Docker Compose Commands

- `docker-compose up -d --build` - Build and start container in background
- `docker-compose exec foundry bash` - Open shell in container
- `docker-compose logs -f foundry` - View container logs
- `docker-compose down` - Stop and remove container
- `docker-compose restart` - Restart container

## Mounted Volumes

- Current directory is mounted to `/app` in the container
- Foundry cache is persisted in a named volume

## Troubleshooting

**If Docker daemon is not running:**
- Open Docker Desktop from Applications
- Wait for Docker to start (check menu bar icon)

**If port 8545 is already in use:**
- Change the port mapping in `docker-compose.yml`
- Or stop the service using port 8545

## Additional Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [Foundry GitHub](https://github.com/foundry-rs/foundry)
- [Solidity Documentation](https://docs.soliditylang.org/)
