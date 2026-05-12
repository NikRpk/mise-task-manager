# Colima Setup for Local Development

Colima is a Docker-compatible container runtime that works on macOS.

## Installation

```bash
# Install Colima
brew install colima

# Install Docker CLI (without Docker Desktop)
brew install docker docker-compose
```

## Start Colima

```bash
# Start with default settings (2 CPUs, 2GB RAM)
colima start

# Or start with custom resources
colima start --cpu 4 --memory 8

# Check status
colima status
```

## Usage

Once Colima is running, all `docker` commands work normally:

```bash
# Build locally (if needed)
docker build -t my-app .

# Run containers
docker run my-app

# Use docker-compose
docker-compose up
```

## For This Project

You DON'T need Colima for normal development since:
- `npm run dev` - No containers needed
- `gcloud run deploy --source .` - Builds in cloud

But if you want to test the Docker build locally:

```bash
# Start Colima
colima start

# Build the image
docker build --platform linux/amd64 -t hf-tasks:test .

# Test it locally
docker run -p 8080:8080 --env-file .env.local hf-tasks:test
```

## Stop Colima

```bash
colima stop
```

## Notes

- Colima stores containers in `~/.colima/`
- Compatible with all Docker commands
- Much lighter than Docker Desktop
- Open source and free
