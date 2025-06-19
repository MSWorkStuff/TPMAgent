# TPM Agent MCP Server

A Model Context Protocol (MCP) server that provides technical program management capabilities through LLM flows.

## Overview

This MCP server is part of the TPMAgent project, designed to simulate the behavior of a Technical Program Manager (TPM) by providing tools for project planning, implementation strategies, and code bootstrapping.

## Features

- **Project Planning Tools**: Generate comprehensive project plans with milestones and dependencies
- **Implementation Strategy Generation**: Create step-by-step implementation strategies
- **Code Bootstrap**: Generate initial code scaffolding and documentation
- **GitHub Integration**: Interact with GitHub repositories for project management

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

4. Build the project:
   ```bash
   npm run build
   ```

## Development

### Running in Development Mode

```bash
npm run dev
```

### Building the Project

```bash
npm run build
```

### Starting the Server

```bash
npm start
```

### Linting and Formatting

```bash
npm run lint
npm run format
```

## Configuration

The server can be configured using environment variables. Copy `.env.example` to `.env` and configure as needed:

- `GITHUB_TOKEN`: GitHub API token for repository operations (optional)
- `DEBUG`: Enable debug logging (optional)

## Usage with MCP Clients

This server implements the Model Context Protocol and can be used with any MCP-compatible client. The server provides tools for:

- Project analysis and planning
- Implementation strategy generation
- Code scaffolding and bootstrapping
- Technical documentation generation

## Project Structure

```
src/
├── server.ts          # Main MCP server entry point
├── tools/             # Tool implementations (to be added)
├── services/          # Business logic services (to be added)
└── types/             # TypeScript type definitions (to be added)
```

## Contributing

This project is in early development. Contributions and feedback are welcome!

## License

MIT
