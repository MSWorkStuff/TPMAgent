import { ToolRegistry, ToolExecutionError, ToolNotFoundError } from '../registry';
import { BaseTool, ZodTool } from '../base-tool';
import { z } from 'zod';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  // Test tool implementation
  class TestTool extends BaseTool<{ message: string }, string> {
    constructor() {
      super('test_tool', 'A test tool for unit testing', {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Test message' },
        },
        required: ['message'],
      });
    }

    async execute(params: { message: string }): Promise<string> {
      return `Hello, ${params.message}!`;
    }
  }

  class ErrorTool extends BaseTool<{}, string> {
    constructor() {
      super('error_tool', 'A tool that always throws an error');
    }

    async execute(): Promise<string> {
      throw new Error('This tool always fails');
    }
  }

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('Tool Registration', () => {
    it('should register a tool successfully', () => {
      const tool = new TestTool();
      registry.register(tool);

      expect(registry.hasTool('test_tool')).toBe(true);
      expect(registry.getToolCount()).toBe(1);
      expect(registry.getToolNames()).toContain('test_tool');
    });

    it('should get tool definitions', () => {
      const tool = new TestTool();
      registry.register(tool);

      const definitions = registry.getToolDefinitions();
      expect(definitions).toHaveLength(1);
      expect(definitions[0]).toEqual({
        name: 'test_tool',
        description: 'A test tool for unit testing',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Test message' },
          },
          required: ['message'],
        },
      });
    });

    it('should unregister a tool', () => {
      const tool = new TestTool();
      registry.register(tool);
      
      expect(registry.hasTool('test_tool')).toBe(true);
      
      const removed = registry.unregister('test_tool');
      expect(removed).toBe(true);
      expect(registry.hasTool('test_tool')).toBe(false);
      expect(registry.getToolCount()).toBe(0);
    });

    it('should return false when unregistering non-existent tool', () => {
      const removed = registry.unregister('nonexistent_tool');
      expect(removed).toBe(false);
    });

    it('should overwrite existing tool with warning', () => {
      const tool1 = new TestTool();
      const tool2 = new TestTool();
      
      registry.register(tool1);
      registry.register(tool2); // Should overwrite
      
      expect(registry.getToolCount()).toBe(1);
    });
  });

  describe('Tool Execution', () => {
    it('should execute a tool successfully', async () => {
      const tool = new TestTool();
      registry.register(tool);

      const result = await registry.execute('test_tool', { message: 'World' });
      
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Hello, World!');
    });

    it('should throw ToolNotFoundError for unknown tool', async () => {
      await expect(
        registry.execute('unknown_tool', {})
      ).rejects.toThrow(ToolNotFoundError);
    });

    it('should handle tool execution errors', async () => {
      const tool = new ErrorTool();
      registry.register(tool);

      await expect(
        registry.execute('error_tool', {})
      ).rejects.toThrow(ToolExecutionError);
    });

    it('should track execution history', async () => {
      const tool = new TestTool();
      registry.register(tool);

      await registry.execute('test_tool', { message: 'Test' });
      
      const history = registry.getExecutionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].toolName).toBe('test_tool');
      expect(history[0].success).toBe(true);
      expect(history[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('should track failed executions in history', async () => {
      const tool = new ErrorTool();
      registry.register(tool);

      try {
        await registry.execute('error_tool', {});
      } catch (error) {
        // Expected error
      }
      
      const history = registry.getExecutionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].toolName).toBe('error_tool');
      expect(history[0].success).toBe(false);
    });

    it('should clear execution history', async () => {
      const tool = new TestTool();
      registry.register(tool);

      await registry.execute('test_tool', { message: 'Test' });
      expect(registry.getExecutionHistory()).toHaveLength(1);
      
      registry.clearExecutionHistory();
      expect(registry.getExecutionHistory()).toHaveLength(0);
    });
  });

  describe('Execution Statistics', () => {
    it('should provide execution statistics', async () => {
      const testTool = new TestTool();
      const errorTool = new ErrorTool();
      
      registry.register(testTool);
      registry.register(errorTool);

      // Execute successful tool
      await registry.execute('test_tool', { message: 'Test1' });
      await registry.execute('test_tool', { message: 'Test2' });
      
      // Execute failing tool
      try {
        await registry.execute('error_tool', {});
      } catch (error) {
        // Expected
      }

      const stats = registry.getExecutionStats();
      
      expect(stats.totalExecutions).toBe(3);
      expect(stats.successfulExecutions).toBe(2);
      expect(stats.failedExecutions).toBe(1);
      expect(stats.averageDuration).toBeGreaterThanOrEqual(0);
      expect(stats.toolUsageCount).toEqual({
        test_tool: 2,
        error_tool: 1,
      });
    });
  });
});

describe('ZodTool', () => {
  const TestSchema = z.object({
    name: z.string().describe('The name to greet'),
    age: z.number().optional().describe('The age of the person'),
  });

  class ZodTestTool extends ZodTool<typeof TestSchema> {
    constructor() {
      super('zod_test_tool', 'A test tool using Zod validation', TestSchema);
    }

    protected async executeWithValidatedParams(params: z.infer<typeof TestSchema>) {
      return `Hello ${params.name}${params.age ? `, you are ${params.age} years old` : ''}!`;
    }
  }

  it('should validate input using Zod schema', async () => {
    const tool = new ZodTestTool();
    
    const result = await tool.execute({ name: 'Alice', age: 30 });
    expect(result).toBe('Hello Alice, you are 30 years old!');
  });

  it('should work with optional parameters', async () => {
    const tool = new ZodTestTool();
    
    const result = await tool.execute({ name: 'Bob' });
    expect(result).toBe('Hello Bob!');
  });

  it('should throw validation error for invalid input', async () => {
    const tool = new ZodTestTool();
    
    await expect(
      tool.execute({ age: 25 }) // Missing required 'name'
    ).rejects.toThrow();
  });

  it('should generate correct input schema', () => {
    const tool = new ZodTestTool();
    const schema = tool.getInputSchema?.();
    
    expect(schema?.type).toBe('object');
    expect(schema?.properties).toHaveProperty('name');
    expect(schema?.properties).toHaveProperty('age');
    expect(schema?.required).toContain('name');
    expect(schema?.required).not.toContain('age');
  });
});
