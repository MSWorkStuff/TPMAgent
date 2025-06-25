# MCP Tool Registration Framework

This document describes the MCP (Model Context Protocol) tool registration framework implemented in this project. The framework provides a type-safe, extensible way to create, register, and execute tools in the MCP environment.

## Architecture Overview

The framework consists of several key components:

### Core Components

1. **Tool Interface** (`src/types/index.ts`) - Defines the contract for all tools
2. **ToolRegistry** (`src/tools/registry.ts`) - Manages tool registration and execution
3. **MCP Handlers** (`src/tools/handlers.ts`) - Implements MCP protocol handlers
4. **Base Tool Classes** (`src/tools/base-tool.ts`) - Provides base implementations
5. **Concrete Tools** (`src/tools/project-tools-new.ts`) - Actual tool implementations

## Tool Interface

All tools must implement the `Tool<TInput, TOutput>` interface:

```typescript
interface Tool<TInput = any, TOutput = any> {
  getName(): string;
  getDescription(): string;
  getInputSchema?(): ToolSchema;
  execute(params: TInput): Promise<TOutput>;
}
```

### Tool Types

- **TInput**: Type of input parameters
- **TOutput**: Type of output result
- **ToolSchema**: JSON Schema for input validation

## Creating Tools

### Option 1: Using BaseTool

```typescript
import { BaseTool } from './base-tool.js';

class MyTool extends BaseTool<MyInput, MyOutput> {
  constructor() {
    super(
      'my_tool',
      'Description of my tool',
      {
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'First parameter' },
          param2: { type: 'number', description: 'Second parameter' }
        },
        required: ['param1']
      }
    );
  }

  async execute(params: MyInput): Promise<MyOutput> {
    // Implementation here
    return result;
  }
}
```

### Option 2: Using ZodTool (Recommended)

```typescript
import { ZodTool } from './base-tool.js';
import { z } from 'zod';

const MyToolSchema = z.object({
  param1: z.string().describe('First parameter'),
  param2: z.number().optional().describe('Second parameter')
});

class MyZodTool extends ZodTool<typeof MyToolSchema> {
  constructor() {
    super(
      'my_zod_tool',
      'Description of my Zod tool',
      MyToolSchema
    );
  }

  protected async executeWithValidatedParams(
    params: z.infer<typeof MyToolSchema>
  ): Promise<MyOutput> {
    // Params are automatically validated
    return result;
  }
}
```

## Tool Registry

The `ToolRegistry` class manages tool registration and execution:

### Registration

```typescript
import { toolRegistry } from './tools/index.js';

const myTool = new MyTool();
toolRegistry.register(myTool);
```

### Execution

```typescript
const result = await toolRegistry.execute('my_tool', { param1: 'value' });
```

### Registry Methods

- `register(tool)` - Register a tool
- `unregister(toolName)` - Unregister a tool
- `hasTool(toolName)` - Check if tool exists
- `getTool(toolName)` - Get tool instance
- `getToolDefinitions()` - Get all tool definitions for MCP
- `execute(toolName, params)` - Execute a tool
- `getExecutionStats()` - Get execution statistics

## MCP Protocol Integration

The framework automatically handles MCP protocol requests:

### List Tools

```json
{
  "method": "tools/list",
  "params": {}
}
```

Response includes all registered tools with their schemas.

### Call Tool

```json
{
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": { "param1": "value" }
  }
}
```

## Error Handling

The framework provides comprehensive error handling:

### Error Types

- **ToolNotFoundError** - Tool doesn't exist
- **ToolExecutionError** - Tool execution failed
- **McpError** - MCP protocol errors (converted automatically)

### Error Propagation

- Validation errors are caught and converted to MCP errors
- Tool execution errors are wrapped in `ToolExecutionError`
- All errors are logged with context information

## Type Safety

The framework provides full TypeScript type safety:

```typescript
// Input and output types are preserved
class TypedTool extends BaseTool<
  { name: string; age: number },  // Input type
  { greeting: string }            // Output type
> {
  // TypeScript will enforce these types
}
```

## Monitoring and Debugging

### Execution History

```typescript
const history = toolRegistry.getExecutionHistory();
// Returns array of execution records with timing and success/failure
```

### Statistics

```typescript
const stats = toolRegistry.getExecutionStats();
// Returns comprehensive execution statistics
```

### Logging

All tool operations are automatically logged with structured data:

- Tool registration/unregistration
- Tool execution start/completion
- Errors and failures
- Performance metrics

## Built-in Tools

The framework includes several built-in tools:

### ProjectAnalysisTool

Analyzes project requirements and generates comprehensive project plans.

**Input:**
- `projectDescription` (string) - Project description
- `requirements` (string[]) - List of requirements
- `techStack` (string[], optional) - Preferred technologies

**Output:** Complete `ProjectPlan` object

### ImplementationStrategyTool

Generates implementation strategies based on project plans.

**Input:**
- `projectPlan` (object) - Project plan
- `timeline` (string, optional) - Target timeline
- `teamSize` (number, optional) - Team size

**Output:** Complete `ImplementationStrategy` object

### ProjectStatusTool

Gets current project status and progress.

**Input:**
- `projectId` (string) - Project identifier
- `includeDetails` (boolean, optional) - Include detailed information

**Output:** Project status with optional details

## Testing

The framework includes comprehensive tests:

### Running Tests

```bash
npm test
```

### Test Coverage

- Unit tests for ToolRegistry
- Integration tests for MCP handlers
- Tool implementation tests
- Error handling tests
- Type safety tests

## Best Practices

### Tool Development

1. **Use ZodTool** for automatic validation
2. **Provide clear descriptions** in schemas
3. **Handle errors gracefully** with meaningful messages
4. **Use TypeScript generics** for type safety
5. **Write comprehensive tests** for each tool

### Schema Design

1. **Required vs Optional** - Mark optional parameters correctly
2. **Descriptions** - Provide helpful descriptions for all parameters
3. **Validation** - Use appropriate validation constraints
4. **Defaults** - Consider default values where appropriate

### Error Handling

1. **Specific Error Types** - Throw specific errors for different scenarios
2. **Error Messages** - Provide clear, actionable error messages
3. **Logging Context** - Include relevant context in logs
4. **Recovery** - Consider how tools can recover from failures

## Extension Points

The framework is designed to be extensible:

### Custom Base Classes

You can create custom base classes for specific tool types:

```typescript
abstract class DatabaseTool<TInput, TOutput> extends BaseTool<TInput, TOutput> {
  // Common database functionality
}
```

### Custom Validation

Beyond Zod, you can implement custom validation:

```typescript
class CustomValidationTool extends BaseTool<TInput, TOutput> {
  async execute(params: TInput): Promise<TOutput> {
    this.customValidate(params);
    // ...
  }

  private customValidate(params: TInput): void {
    // Custom validation logic
  }
}
```

### Middleware

Tool execution can be enhanced with middleware patterns:

```typescript
// Registry could be extended to support middleware
toolRegistry.use(loggingMiddleware);
toolRegistry.use(authenticationMiddleware);
```

## Configuration

Tools can be configured through the main configuration system:

```yaml
# sse-server.config.yaml
tools:
  enabled: true
  maxExecutionTime: 30000
  logging:
    level: info
    includeParams: true
```

This framework provides a solid foundation for building robust, type-safe MCP tools with comprehensive error handling, monitoring, and extensibility.
