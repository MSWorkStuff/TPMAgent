import fs from 'fs';
import path from 'path';
import { loadConfig } from '../index';
import { LogLevel } from '../../utils/logger';

describe('SSE Config Loader', () => {
  const tempDir = path.join(__dirname, 'tmp');
  const configPath = path.join(tempDir, 'sse-server.config.yaml');

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.MCP_PORT;
    delete process.env.MCP_HOST;
    delete process.env.LOG_LEVEL;
    delete process.env.SERVICE_NAME;
  });

  it('should load default configuration when no file exists', () => {
    const config = loadConfig('non-existent-file.yaml');
    
    expect(config.server.port).toBe(3001);
    expect(config.server.host).toBe('localhost');
    expect(config.server.endpoint).toBe('/mcp');
    expect(config.server.messagesEndpoint).toBe('/messages');
    expect(config.logging.level).toBe(LogLevel.INFO);
    expect(config.logging.service).toBe('mcp-sse-server');
    expect(config.mcp.name).toBe('tpm-agent-mcp-server');
    expect(config.mcp.version).toBe('0.1.0');
  });

  it('should load and merge YAML configuration', () => {
    const yamlConfig = `
server:
  port: 4001
  host: "0.0.0.0"
logging:
  level: 0
  service: "custom-service"
mcp:
  name: "custom-mcp-server"
`;
    fs.writeFileSync(configPath, yamlConfig);
    
    const config = loadConfig(configPath);
    
    expect(config.server.port).toBe(4001);
    expect(config.server.host).toBe('0.0.0.0');
    expect(config.logging.level).toBe(LogLevel.DEBUG);
    expect(config.logging.service).toBe('custom-service');
    expect(config.mcp.name).toBe('custom-mcp-server');
  });

  it('should override config with environment variables', () => {
    const yamlConfig = `
server:
  port: 4001
  host: "localhost"
`;
    fs.writeFileSync(configPath, yamlConfig);
    
    process.env.MCP_PORT = '5001';
    process.env.MCP_HOST = '127.0.0.1';
    process.env.LOG_LEVEL = 'DEBUG';
    process.env.SERVICE_NAME = 'env-service';
    
    const config = loadConfig(configPath);
    
    expect(config.server.port).toBe(5001);
    expect(config.server.host).toBe('127.0.0.1');
    expect(config.logging.level).toBe(LogLevel.DEBUG);
    expect(config.logging.service).toBe('env-service');
  });

  it('should validate configuration schema', () => {
    const invalidYaml = `
server:
  port: "invalid-port"
`;
    fs.writeFileSync(configPath, invalidYaml);
    
    expect(() => loadConfig(configPath)).toThrow();
  });

  it('should handle malformed YAML gracefully', () => {
    const malformedYaml = 'invalid: yaml: content: [}';
    fs.writeFileSync(configPath, malformedYaml);
    
    // Should not throw but fall back to defaults
    const config = loadConfig(configPath);
    expect(config.server.port).toBe(3001);
  });
});
