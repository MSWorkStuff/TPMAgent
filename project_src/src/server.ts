#!/usr/bin/env node

import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import { createLogger, LogLevel } from './utils/logger.js';
import { loadConfig } from './config/index.js';
import { readExistingTools, MCPTool } from './tools/project-tools.js';
import Ajv from 'ajv';

// Load environment variables
dotenv.config();

const logger = createLogger('mcp-sse-server');
const ajv = new Ajv();

// Global server instances tracking
const activeTransports = new Set<SSEServerTransport>();
let httpServer: any = null;
let mcpServer: Server | null = null;

/**
 * Create and configure the MCP server
 */
function createMCPServer(config: any) {
  const server = new Server(
    {
      name: config.mcp.name,
      version: config.mcp.version,
    },
    {
      capabilities: {
        tools: {},
        logging: {},
      },
    }
  );

  logger.info('MCP server created', { 
    name: config.mcp.name, 
    version: config.mcp.version 
  });

  return server;
}

/**
 * Register MCP request handlers
 */
function registerHandlers(server: Server) {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Received list tools request');
    
    const tools = await readExistingTools();
    
    return {
      tools: tools.map((tool: MCPTool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    logger.info('Tool call received', { toolName: name, args });

    try {
      const tools = await readExistingTools();
      const tool = tools.find((t: MCPTool) => t.name === name);
      
      if (!tool) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }

      // Validate arguments against the tool's schema using AJV
      let validationResult: { success: boolean; data?: any; error?: any };
      if (tool.inputSchema) {
        const validate = ajv.compile(tool.inputSchema);
        const valid = validate(args);
        if (!valid) {
          const errorMessage = validate.errors?.map(e => `${e.instancePath || e.schemaPath}: ${e.message}`).join(', ') || 'Validation failed';
          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid parameters: ${errorMessage}`
          );
        }
        validationResult = { success: true, data: args };
      } else {
        validationResult = { success: true, data: args };
      }

      // Execute the tool
      const result = await tool.handler(validationResult.data);
      
      logger.info('Tool executed successfully', { toolName: name });
      
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('Tool execution failed', { 
        toolName: name, 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (error instanceof McpError) {
        throw error;
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });

  logger.info('MCP request handlers registered');
}

/**
 * Setup Express server with SSE endpoints
 */
function setupExpressServer(config: any, server: Server) {
  const app = express();
  
  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CORS headers for cross-origin requests
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      activeConnections: activeTransports.size,
      server: config.mcp.name,
      version: config.mcp.version,
    });
  });

  // SSE connection endpoint
  app.get(config.server.endpoint, async (req, res) => {
    logger.info('New SSE connection request', { 
      userAgent: req.get('User-Agent'),
      ip: req.ip 
    });

    try {
      const transport = new SSEServerTransport(config.server.messagesEndpoint, res);
      activeTransports.add(transport);

      // Handle transport cleanup
      transport.onclose = () => {
        activeTransports.delete(transport);
        logger.info('SSE connection closed', { 
          activeConnections: activeTransports.size 
        });
      };

      // Connect the server to the transport
      await server.connect(transport);
      
      logger.info('SSE connection established', { 
        activeConnections: activeTransports.size 
      });
      
    } catch (error) {
      logger.error('Failed to establish SSE connection', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to establish SSE connection' 
        });
      }
    }
  });

  // Messages endpoint for receiving client messages
  const messagesHandler = async (req: any, res: any) => {
    const { sessionId } = req.query;
    
    logger.debug('Received message via POST', { 
      sessionId,
      hasBody: !!req.body 
    });

    try {
      // Find the transport for this session
      const transport = Array.from(activeTransports).find(
        t => (t as any)._sessionId === sessionId
      );

      if (!transport) {
        logger.warn('No active transport found for session', { sessionId });
        return res.status(404).json({ 
          error: 'Session not found or expired' 
        });
      }

      // Handle the message through the transport
      if (transport.handleMessage) {
        await transport.handleMessage(req.body);
      }

      res.status(200).json({ status: 'received' });
      
    } catch (error) {
      logger.error('Failed to handle message', { 
        sessionId,
        error: error instanceof Error ? error.message : String(error) 
      });
      
      res.status(500).json({ 
        error: 'Failed to process message' 
      });
    }
  };
  
  app.post(config.server.messagesEndpoint, messagesHandler);

  return app;
}

/**
 * Setup graceful shutdown
 */
function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    logger.info('Shutdown signal received', { signal });

    try {
      // Close all active SSE connections
      for (const transport of activeTransports) {
        try {
          if (transport.close) {
            await transport.close();
          }
        } catch (error) {
          logger.error('Error closing transport', { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
      activeTransports.clear();

      // Close HTTP server
      if (httpServer) {
        await new Promise<void>((resolve) => {
          httpServer.close(() => {
            logger.info('HTTP server closed');
            resolve();
          });
        });
      }

      logger.info('Graceful shutdown completed');
      process.exit(0);
      
    } catch (error) {
      logger.error('Error during shutdown', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { 
      error: error.message,
      stack: error.stack 
    });
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { 
      reason: reason instanceof Error ? reason.message : String(reason) 
    });
    shutdown('unhandledRejection');
  });
}

/**
 * Main server function
 */
async function main() {
  try {
    // Load configuration
    const config = loadConfig('./sse-server.config.yaml');
    
    // Update logger level
    logger.setLevel(config.logging.level);
    
    logger.info('Starting MCP SSE Server', {
      port: config.server.port,
      host: config.server.host,
      endpoint: config.server.endpoint,
      messagesEndpoint: config.server.messagesEndpoint,
    });

    // Create MCP server
    mcpServer = createMCPServer(config);
    
    // Register handlers
    registerHandlers(mcpServer);
    
    // Setup Express server
    const app = setupExpressServer(config, mcpServer);
    
    // Start HTTP server
    httpServer = app.listen(config.server.port, config.server.host, () => {
      logger.info('MCP SSE Server started successfully', {
        port: config.server.port,
        host: config.server.host,
        sseEndpoint: `http://${config.server.host}:${config.server.port}${config.server.endpoint}`,
        messagesEndpoint: `http://${config.server.host}:${config.server.port}${config.server.messagesEndpoint}`,
        healthCheck: `http://${config.server.host}:${config.server.port}/health`,
      });
    });

    // Setup graceful shutdown
    setupGracefulShutdown();

  } catch (error) {
    logger.error('Failed to start server', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
