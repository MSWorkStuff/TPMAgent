import { 
  CallToolRequest,
  CallToolResult,
  ListToolsRequest, 
  ListToolsResult,
  ErrorCode,
  McpError 
} from '@modelcontextprotocol/sdk/types';
import { toolRegistry, ToolExecutionError, ToolNotFoundError } from './registry';
import { createLogger } from '../utils/logger';

const logger = createLogger('mcp-handlers');

/**
 * Handle MCP list_tools request
 */
export async function handleListTools(request: ListToolsRequest): Promise<ListToolsResult> {
  try {
    logger.info('Handling list_tools request');

    const tools = toolRegistry.getToolDefinitions();
    
    logger.info(`Returning ${tools.length} tools`, { 
      toolNames: tools.map(t => t.name)
    });

    return {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: {
          ...tool.inputSchema,
          type: 'object' as const,
          properties: tool.inputSchema?.properties || {},
        } as any,
      })),
    };
  } catch (error) {
    logger.error('Error handling list_tools request', {
      error: error instanceof Error ? error.message : String(error)
    });

    throw new McpError(
      ErrorCode.InternalError,
      `Failed to list tools: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Handle MCP call_tool request
 */
export async function handleCallTool(request: CallToolRequest): Promise<CallToolResult> {
  const { name: toolName, arguments: toolArgs } = request.params;

  try {
    logger.info('Handling call_tool request', { 
      toolName,
      hasArguments: !!toolArgs && Object.keys(toolArgs).length > 0
    });

    // Validate tool exists
    if (!toolRegistry.hasTool(toolName)) {
      logger.warn(`Tool not found: ${toolName}`);
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Tool '${toolName}' not found`
      );
    }

    // Execute the tool
    const result = await toolRegistry.execute(
      toolName,
      toolArgs || {},
      { requestId: 'mcp-request' }
    );

    logger.info(`Tool '${toolName}' executed successfully`, { 
      hasError: result.isError
    });

    return {
      content: result.content,
      isError: result.isError,
    };

  } catch (error) {
    logger.error(`Error executing tool '${toolName}'`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Handle specific error types
    if (error instanceof McpError) {
      throw error;
    }

    if (error instanceof ToolNotFoundError) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Tool '${toolName}' not found`
      );
    }

    if (error instanceof ToolExecutionError) {
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error.message}`
      );
    }

    // Generic error handling
    throw new McpError(
      ErrorCode.InternalError,
      `Unexpected error executing tool '${toolName}': ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate tool arguments against schema (if available)
 */
export function validateToolArguments(toolName: string, args: any): boolean {
  const tool = toolRegistry.getTool(toolName);
  
  if (!tool || !tool.getInputSchema) {
    return true; // No validation if no schema available
  }

  const schema = tool.getInputSchema();
  
  // Basic validation - this could be enhanced with a proper JSON schema validator
  if (schema.required) {
    for (const requiredField of schema.required) {
      if (!(requiredField in args)) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Missing required parameter: ${requiredField}`
        );
      }
    }
  }

  return true;
}

/**
 * Get tool registry statistics for monitoring
 */
export function getToolRegistryStats() {
  return {
    registeredTools: toolRegistry.getToolCount(),
    toolNames: toolRegistry.getToolNames(),
    executionStats: toolRegistry.getExecutionStats(),
  };
}
