import { z } from 'zod';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { LogLevel } from '../utils/logger';

// Configuration schema
const ConfigSchema = z.object({
  server: z.object({
    port: z.number().default(3001),
    host: z.string().default('localhost'),
    endpoint: z.string().default('/mcp'),
    messagesEndpoint: z.string().default('/messages'),
  }),
  logging: z.object({
    level: z.nativeEnum(LogLevel).default(LogLevel.INFO),
    service: z.string().default('mcp-sse-server'),
  }),
  mcp: z.object({
    name: z.string().default('tpm-agent-mcp-server'),
    version: z.string().default('0.1.0'),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load configuration from file or environment variables
 */
export function loadConfig(configPath?: string): Config {
  let fileConfig = {};

  // Try to load from config file
  if (configPath) {
    try {
      const fileContent = readFileSync(configPath, 'utf8');
      fileConfig = load(fileContent) as any;
    } catch (error) {
      if (configPath.includes('sse-server.config.yaml')) {
        console.warn(`Warning: SSE server config file not found at ${configPath}`);
        console.warn('Please copy example.sse-server.config.yaml to sse-server.config.yaml');
      } else {
        console.warn(`Warning: Could not load config file ${configPath}:`, error);
      }
    }
  }

  // Override with environment variables
  const envConfig = {
    server: {
      port: process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : undefined,
      host: process.env.MCP_HOST,
      endpoint: process.env.MCP_ENDPOINT,
      messagesEndpoint: process.env.MCP_MESSAGES_ENDPOINT,
    },
    logging: {
      level: process.env.LOG_LEVEL ? LogLevel[process.env.LOG_LEVEL as keyof typeof LogLevel] : undefined,
      service: process.env.SERVICE_NAME,
    },
    mcp: {
      name: process.env.MCP_SERVER_NAME,
      version: process.env.MCP_SERVER_VERSION,
    },
  };

  // Remove undefined values
  const cleanEnvConfig = JSON.parse(JSON.stringify(envConfig));

  // Merge configs: defaults < file < environment
  const mergedConfig = {
    ...fileConfig,
    server: { ...(fileConfig as any).server, ...cleanEnvConfig.server },
    logging: { ...(fileConfig as any).logging, ...cleanEnvConfig.logging },
    mcp: { ...(fileConfig as any).mcp, ...cleanEnvConfig.mcp },
  };

  // Validate and return
  return ConfigSchema.parse(mergedConfig);
}
