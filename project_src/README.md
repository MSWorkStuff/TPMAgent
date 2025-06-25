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

4. Configure the MCP server, more details in [README-SSE](./README-SSE.md):
   ```bash
   # For project management features
   cp example.tpm-agent.config.yaml tpm-agent.config.yaml
   # For SSE server
   cp example.sse-server.config.yaml sse-server.config.yaml
   ```
   Edit both config files with your settings.

5. Build the project:
   ```bash
   npm run build
   ```
6. Run the tests
   ```bash
   npm test
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
npm run dev          # Development with auto-reload
npm run start:sse    # Production SSE server
```

### Linting and Formatting

```bash
npm run lint
npm run format
```

## Configuration

### 1. Environment variables

This project uses a YAML configuration file and environment variables for setup. The server can be configured using environment variables. Copy `.env.example` to `.env` and configure as needed:

- `GITHUB_TOKEN`: GitHub API token for repository operations (optional)
- `DEBUG`: Enable debug logging (optional)

### 2. YAML Configuration

Copy the provided `example.tpm-agent.config.yaml` from the project root and rename it to `tpm-agent.config.yaml` to get started:

- `example.tpm-agent.config.yaml` contains a sample configuration with all supported fields.
- Edit your `tpm-agent.config.yaml` as needed for your project.

See [`example.tpm-agent.config.yaml`](./example.tpm-agent.config.yaml) for the full example and field documentation.

- `repository`: GitHub repository in `owner/name` format
- `projectId`: GitHub Project ID (string or number)
- `milestoneDuration`: Milestone duration in days (default: 14)
- `defaultLabels`: List of labels to create
- `issueTemplates`: List of issue templates (name, description, body)

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
