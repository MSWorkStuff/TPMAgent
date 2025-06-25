# TPM Agent MCP Server

A **Server-Sent Events (SSE)-based Model Context Protocol (MCP) server** for Technical Program Manager simulation and project management tools.

## Features

- ✅ **SSE-based MCP Server**: Full MCP protocol implementation over Server-Sent Events
- ✅ **Configurable Port**: Default port 3001, configurable via config file or environment variables
- ✅ **Structured Logging**: JSON-structured logs with configurable log levels
- ✅ **Graceful Shutdown**: Proper cleanup on SIGINT/SIGTERM signals
- ✅ **Concurrent Connections**: Handles multiple simultaneous SSE connections
- ✅ **Health Check**: Built-in health monitoring endpoint
- ✅ **Project Management Tools**: Analyze projects and generate implementation strategies

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure the Server

Copy the example config file and edit it:

```bash
cp example.sse-server.config.yaml sse-server.config.yaml
```

Edit `sse-server.config.yaml` or set environment variables:

```yaml
server:
  port: 3001
  host: "localhost"
  endpoint: "/mcp"
  messagesEndpoint: "/messages"

logging:
  level: 1  # 0=DEBUG, 1=INFO, 2=WARN, 3=ERROR
  service: "mcp-sse-server"

mcp:
  name: "tpm-agent-mcp-server"
  version: "0.1.0"
```

### 3. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run start:sse
```

The server will start and display connection endpoints:
```
MCP SSE Server started successfully
- SSE Endpoint: http://localhost:3001/mcp
- Messages Endpoint: http://localhost:3001/messages  
- Health Check: http://localhost:3001/health
```

## Server Architecture

### SSE Transport Protocol

The server implements the MCP protocol over Server-Sent Events:

1. **SSE Connection**: Clients connect to `GET /mcp` to establish the SSE stream
2. **Message Endpoint**: Clients send messages via `POST /messages?sessionId=<id>`
3. **Session Management**: Each SSE connection gets a unique session ID
4. **Concurrent Support**: Multiple clients can connect simultaneously

### Available Tools

#### `analyze_project`
Analyzes a project description and generates a comprehensive project plan.

**Parameters:**
- `projectDescription` (string, required): Description of the project
- `requirements` (array, required): List of project requirements  
- `techStack` (array, optional): Preferred technology stack

**Example:**
```json
{
  "name": "analyze_project",
  "arguments": {
    "projectDescription": "Build a web-based task management application",
    "requirements": ["User authentication", "Task CRUD operations", "Real-time updates"],
    "techStack": ["React", "Node.js", "PostgreSQL"]
  }
}
```

#### `generate_implementation_strategy`
Generates an implementation strategy based on a project plan.

**Parameters:**
- `projectPlan` (object, required): Project plan with name and description
- `timeline` (string, optional): Target timeline
- `teamSize` (number, optional): Available team size

## Configuration

### File-based Configuration

Create or edit `sse-server.config.yaml`:

```yaml
server:
  port: 3001                    # Server port
  host: "localhost"            # Server host
  endpoint: "/mcp"             # SSE endpoint path
  messagesEndpoint: "/messages" # POST messages endpoint

logging:
  level: 1                     # Log level (0-3)
  service: "mcp-sse-server"    # Service name in logs

mcp:
  name: "tpm-agent-mcp-server" # MCP server name
  version: "0.1.0"             # MCP server version
```

### Environment Variables

Override any config with environment variables:

```bash
export MCP_PORT=3002
export MCP_HOST=0.0.0.0
export LOG_LEVEL=DEBUG
export SERVICE_NAME=my-mcp-server
```

## API Endpoints

### Health Check
```bash
GET /health
```

Returns server status and active connection count:
```json
{
  "status": "healthy",
  "timestamp": "2025-06-25T12:39:32.752Z", 
  "activeConnections": 2,
  "server": "tpm-agent-mcp-server",
  "version": "0.1.0"
}
```

### SSE Connection  
```bash
GET /mcp
Accept: text/event-stream
```

Establishes Server-Sent Events connection and returns session endpoint.

### Messages
```bash  
POST /messages?sessionId=<session-id>
Content-Type: application/json
```

Send MCP protocol messages to an active session.

## Development

### Scripts

```bash
npm run dev          # Start development server with auto-reload
npm run build        # Build TypeScript to JavaScript  
npm run start        # Start built server
npm run start:sse    # Build and start server
npm run test         # Run tests
npm run lint         # Lint TypeScript files
npm run format       # Format code with Prettier
```

### Project Structure

```
src/
├── server.ts              # Main SSE server implementation
├── config/
│   └── index.ts          # Configuration management
├── utils/
│   └── logger.ts         # Structured logging utility
├── tools/
│   ├── project-tools.ts  # Project management tools
│   └── __tests__/        # Tool tests
└── types/
    └── index.ts          # TypeScript type definitions
```

### Logging

The server uses structured JSON logging:

```json
{
  "timestamp": "2025-06-25T12:39:24.395Z",
  "level": "INFO", 
  "service": "mcp-sse-server",
  "message": "MCP SSE Server started successfully",
  "context": {
    "port": 3001,
    "activeConnections": 0
  }
}
```

**Log Levels:**
- `DEBUG` (0): Detailed debugging information
- `INFO` (1): General information  
- `WARN` (2): Warning conditions
- `ERROR` (3): Error conditions

### Graceful Shutdown

The server handles shutdown signals gracefully:

- Closes all active SSE connections
- Stops accepting new connections  
- Closes HTTP server
- Exits cleanly

Trigger with `SIGINT` (Ctrl+C) or `SIGTERM`.

## Testing

Test the server endpoints:

```bash
# Health check
curl http://localhost:3001/health

# SSE connection (will stream events)
curl -N -H "Accept: text/event-stream" http://localhost:3001/mcp
```

## Production Deployment

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Set production environment variables:**
   ```bash
   export NODE_ENV=production
   export MCP_PORT=3001
   export LOG_LEVEL=WARN
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Use a process manager** like PM2 for production:
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name mcp-sse-server
   ```

## License

MIT
