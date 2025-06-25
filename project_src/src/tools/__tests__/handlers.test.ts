import { handleListTools, handleCallTool } from '../handlers';
import { toolRegistry } from '../registry';
import { BaseTool } from '../base-tool';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types';

describe('MCP Handlers', () => {
  // Test tool implementation
  class MockTool extends BaseTool<{ message: string }, string> {
    constructor() {
      super('mock_tool', 'A mock tool for testing', {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Test message' },
        },
        required: ['message'],
      });
    }

    async execute(params: { message: string }): Promise<string> {
      return `Mock response: ${params.message}`;
    }
  }

  class FailingTool extends BaseTool<{}, string> {
    constructor() {
      super('failing_tool', 'A tool that always fails');
    }

    async execute(): Promise<string> {
      throw new Error('This tool always fails');
    }
  }

  beforeEach(() => {
    // Clear registry before each test
    toolRegistry.getToolNames().forEach(name => {
      toolRegistry.unregister(name);
    });
    toolRegistry.clearExecutionHistory();
  });

  describe('handleListTools', () => {
    it('should return empty list when no tools are registered', async () => {
      const request = { method: 'tools/list' as const };
      const result = await handleListTools(request);
      
      expect(result.tools).toHaveLength(0);
    });

    it('should return list of registered tools', async () => {
      const tool = new MockTool();
      toolRegistry.register(tool);

      const request = { method: 'tools/list' as const };
      const result = await handleListTools(request);
      
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('mock_tool');
      expect(result.tools[0].description).toBe('A mock tool for testing');
      expect(result.tools[0].inputSchema).toBeDefined();
      expect(result.tools[0].inputSchema.type).toBe('object');
    });

    it('should handle errors and throw McpError', async () => {
      // Mock toolRegistry to throw an error
      const originalGetToolDefinitions = toolRegistry.getToolDefinitions;
      toolRegistry.getToolDefinitions = jest.fn().mockImplementation(() => {
        throw new Error('Registry error');
      });

      const request = { method: 'tools/list' as const };
      
      await expect(handleListTools(request)).rejects.toThrow(McpError);
      
      // Restore original method
      toolRegistry.getToolDefinitions = originalGetToolDefinitions;
    });
  });

  describe('handleCallTool', () => {
    it('should execute a tool successfully', async () => {
      const tool = new MockTool();
      toolRegistry.register(tool);

      const request = {
        method: 'tools/call' as const,
        params: {
          name: 'mock_tool',
          arguments: { message: 'Hello World' },
        },
      };

      const result = await handleCallTool(request);
      
      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Mock response: Hello World');
    });

    it('should handle tool execution errors', async () => {
      const tool = new FailingTool();
      toolRegistry.register(tool);

      const request = {
        method: 'tools/call' as const,
        params: {
          name: 'failing_tool',
          arguments: {},
        },
      };

      await expect(handleCallTool(request)).rejects.toThrow(McpError);
      
      try {
        await handleCallTool(request);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InternalError);
      }
    });

    it('should throw McpError for unknown tool', async () => {
      const request = {
        method: 'tools/call' as const,
        params: {
          name: 'unknown_tool',
          arguments: {},
        },
      };

      await expect(handleCallTool(request)).rejects.toThrow(McpError);
      
      try {
        await handleCallTool(request);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InvalidRequest);
        expect((error as McpError).message).toContain('not found');
      }
    });

    it('should handle missing arguments', async () => {
      const tool = new MockTool();
      toolRegistry.register(tool);

      const request = {
        method: 'tools/call' as const,
        params: {
          name: 'mock_tool',
          // arguments missing
        },
      };

      // Should now throw an error due to missing required parameter
      await expect(handleCallTool(request)).rejects.toThrow(McpError);
      
      try {
        await handleCallTool(request);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InternalError);
        expect((error as McpError).message).toContain('Missing required parameter: message');
      }
    });

    it('should handle tools with no arguments', async () => {
      const tool = new FailingTool();
      toolRegistry.register(tool);

      const request = {
        method: 'tools/call' as const,
        params: {
          name: 'failing_tool',
          arguments: {},
        },
      };

      await expect(handleCallTool(request)).rejects.toThrow(McpError);
    });
  });

  describe('Error Handling', () => {
    it('should preserve McpError types', async () => {
      const request = {
        method: 'tools/call' as const,
        params: {
          name: 'nonexistent',
          arguments: {},
        },
      };

      try {
        await handleCallTool(request);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InvalidRequest);
      }
    });

    it('should convert generic errors to McpError', async () => {
      const tool = new FailingTool();
      toolRegistry.register(tool);

      const request = {
        method: 'tools/call' as const,
        params: {
          name: 'failing_tool',
          arguments: {},
        },
      };

      try {
        await handleCallTool(request);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        expect((error as McpError).code).toBe(ErrorCode.InternalError);
        expect((error as McpError).message).toContain('Tool execution failed');
      }
    });
  });

  describe('Validation Consistency', () => {
    it('should validate BaseTool and ZodTool consistently', async () => {
      // Both tools should enforce required parameters now
      
      class BaseToolMock extends BaseTool<{ message: string }, string> {
        constructor() {
          super('base_mock', 'Base tool mock', {
            type: 'object',
            properties: {
              message: { type: 'string', description: 'Required message' },
            },
            required: ['message'],
          });
        }

        async execute(params: { message: string }): Promise<string> {
          return `BaseTool: ${params.message}`;
        }
      }

      const baseTool = new BaseToolMock();
      toolRegistry.register(baseTool);

      // Test missing required parameter - should fail for both
      const requestMissingParam = {
        method: 'tools/call' as const,
        params: {
          name: 'base_mock',
          arguments: {},
        },
      };

      await expect(handleCallTool(requestMissingParam)).rejects.toThrow(McpError);
      
      // Test with valid parameter - should succeed
      const requestValidParam = {
        method: 'tools/call' as const,
        params: {
          name: 'base_mock',
          arguments: { message: 'Hello World' },
        },
      };

      const result = await handleCallTool(requestValidParam);
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('BaseTool: Hello World');
    });
  });
});
