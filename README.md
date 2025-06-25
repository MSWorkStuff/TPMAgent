# TPMAgent: Technical Program Manager Simulation with LLM Flows

## Overview

TPMAgent is a project that leverages Large Language Model (LLM) flows and targeted prompts to simulate the behavior of a Technical Program Manager (TPM). The goal is to automate the process of creating project plans, implementation strategies, and bootstrap code for specific technical problems, enabling rapid prototyping and structured project initiation.

## Problem Space

In many organizations, TPMs play a critical role in bridging the gap between business requirements and technical execution. They are responsible for:
- Defining project scope and deliverables
- Creating detailed implementation strategies
- Coordinating between stakeholders
- Generating initial technical documentation and code scaffolding

However, this process is often manual, time-consuming, and dependent on individual expertise. There is a need for tools that can:
- Accelerate the planning and bootstrapping phase
- Ensure consistency and best practices
- Reduce the cognitive load on TPMs and engineering leads

## Project Scope

TPMAgent aims to:
1. **Simulate TPM Reasoning:** Use LLMs to analyze a targeted problem and generate a comprehensive project plan, including milestones, risks, and dependencies.
2. **Implementation Strategy Generation:** Automatically produce a step-by-step implementation strategy tailored to the problem domain and technology stack.
3. **Bootstrap Code Creation:** Generate initial code scaffolding and documentation to kickstart development, following industry best practices.
4. **Prompt Engineering:** Develop targeted prompts and LLM flows that guide the model to produce high-quality, actionable outputs.

## Key Features

- Modular LLM flow design for extensibility
- Customizable prompt templates for different project types
- Integration with code generation and documentation tools
- Output formats suitable for direct use by engineering teams

## Example Use Cases

- Bootstrapping a new web application with a defined tech stack
- Generating a migration plan for legacy systems
- Creating a technical roadmap for feature development

## Getting Started

*Instructions for setup, usage, and contributing will be added as the project evolves.*

## Configuration

This project uses a YAML configuration file and environment variables for setup.

### 1. Environment Variables

Create a `.env` file in the project root with the following:

```
GITHUB_TOKEN=your_github_token_here
```

### 2. YAML Configuration

Copy the provided `example.config.yaml` from the project root and rename it to `config.yaml` to get started:

- `example.config.yaml` contains a sample configuration with all supported fields.
- Edit your `config.yaml` as needed for your project.

See [`example.config.yaml`](./example.config.yaml) for the full example and field documentation.

- `repository`: GitHub repository in `owner/name` format
- `projectId`: GitHub Project ID (string or number)
- `milestoneDuration`: Milestone duration in days (default: 14)
- `defaultLabels`: List of labels to create
- `issueTemplates`: List of issue templates (name, description, body)

### 3. Validation

The config loader validates both the YAML and environment variables. If validation fails, you will receive a detailed error message indicating the problem.

## Running Tests

To run the unit tests for configuration and validation, simply use:

```
npm test
```

This will run all Jest tests using the correct configuration.

## Building and Running the App

To build the TypeScript source code:

```
npm run build
```

To start the server after building:

```
npm start
```

This will launch the TPM Agent MCP Server. You should see:

```
TPM Agent MCP Server running on stdio
```

---

*This project is in early development. Contributions and feedback are welcome!*