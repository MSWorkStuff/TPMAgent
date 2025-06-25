import { Tool, ToolDefinition, ToolResult, ToolExecutionContext } from '../types/index';
import { createLogger } from '../utils/logger';

const logger = createLogger('tool-registry');

/**
 * Error thrown when tool execution fails
 */
export class ToolExecutionError extends Error {
  constructor(
    public readonly toolName: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(`Tool '${toolName}' execution failed: ${message}`);
    this.name = 'ToolExecutionError';
  }
}

/**
 * Error thrown when tool is not found
 */
export class ToolNotFoundError extends Error {
  constructor(public readonly toolName: string) {
    super(`Tool '${toolName}' not found in registry`);
    this.name = 'ToolNotFoundError';
  }
}

/**
 * Registry for managing MCP tools
 */
export class ToolRegistry {
  private tools = new Map<string, Tool<any, any>>();
  private executionHistory: Array<ToolExecutionContext & { success: boolean; duration: number }> = [];

  /**
   * Register a tool in the registry
   */
  register<TInput, TOutput>(tool: Tool<TInput, TOutput>): void {
    const name = tool.getName();
    
    if (this.tools.has(name)) {
      logger.warn(`Tool '${name}' is already registered. Overwriting...`);
    }

    this.tools.set(name, tool);
    logger.info(`Tool '${name}' registered successfully`);
  }

  /**
   * Unregister a tool from the registry
   */
  unregister(toolName: string): boolean {
    const removed = this.tools.delete(toolName);
    if (removed) {
      logger.info(`Tool '${toolName}' unregistered successfully`);
    } else {
      logger.warn(`Tool '${toolName}' was not found in registry`);
    }
    return removed;
  }

  /**
   * Get all registered tools as definitions
   */
  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.getName(),
      description: tool.getDescription(),
      inputSchema: tool.getInputSchema?.(),
    }));
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): Tool<any, any> | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get the count of registered tools
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Get all tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Execute a tool with the given parameters
   */
  async execute<TInput, TOutput>(
    toolName: string,
    params: TInput,
    context?: Partial<ToolExecutionContext>
  ): Promise<ToolResult<TOutput>> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new ToolNotFoundError(toolName);
    }

    const executionContext: ToolExecutionContext = {
      toolName,
      requestId: context?.requestId,
      timestamp: new Date(),
    };

    const startTime = Date.now();
    let success = false;

    try {
      logger.info(`Executing tool '${toolName}'`, { 
        requestId: executionContext.requestId,
        params: typeof params === 'object' ? Object.keys(params as any) : params
      });

      // Validate input parameters if the tool supports validation
      let validatedParams = params;
      if ('validate' in tool && typeof tool.validate === 'function') {
        try {
          validatedParams = (tool as any).validate(params);
        } catch (validationError) {
          throw new ToolExecutionError(
            toolName,
            `Validation failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`,
            validationError instanceof Error ? validationError : undefined
          );
        }
      }

      const result = await tool.execute(validatedParams);
      success = true;

      const duration = Date.now() - startTime;
      this.executionHistory.push({
        ...executionContext,
        success,
        duration,
      });

      logger.info(`Tool '${toolName}' executed successfully`, { 
        duration: `${duration}ms`,
        requestId: executionContext.requestId
      });

      // Format result according to MCP specification
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
        isError: false,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.executionHistory.push({
        ...executionContext,
        success,
        duration,
      });

      logger.error(`Tool '${toolName}' execution failed`, {
        error: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
        requestId: executionContext.requestId
      });

      if (error instanceof ToolExecutionError) {
        throw error;
      }

      throw new ToolExecutionError(
        toolName,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get execution history for debugging and monitoring
   */
  getExecutionHistory(): Array<ToolExecutionContext & { success: boolean; duration: number }> {
    return [...this.executionHistory];
  }

  /**
   * Clear execution history
   */
  clearExecutionHistory(): void {
    this.executionHistory = [];
    logger.info('Execution history cleared');
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDuration: number;
    toolUsageCount: Record<string, number>;
  } {
    const totalExecutions = this.executionHistory.length;
    const successfulExecutions = this.executionHistory.filter(h => h.success).length;
    const failedExecutions = totalExecutions - successfulExecutions;
    
    const totalDuration = this.executionHistory.reduce((sum, h) => sum + h.duration, 0);
    const averageDuration = totalExecutions > 0 ? totalDuration / totalExecutions : 0;

    const toolUsageCount: Record<string, number> = {};
    this.executionHistory.forEach(h => {
      toolUsageCount[h.toolName] = (toolUsageCount[h.toolName] || 0) + 1;
    });

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageDuration: Math.round(averageDuration * 100) / 100,
      toolUsageCount,
    };
  }
}

// Global tool registry instance
export const toolRegistry = new ToolRegistry();
