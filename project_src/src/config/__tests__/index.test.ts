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
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_PAT;
    delete process.env.GITHUB_USER_AGENT;
    delete process.env.GITHUB_API_URL;
    delete process.env.GITHUB_MAX_RETRIES;
    delete process.env.GITHUB_RETRY_DELAY;
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
    expect(config.github?.maxRetries).toBe(3);
    expect(config.github?.retryDelay).toBe(1000);
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
github:
  token: "yaml-token"
  userAgent: "yaml-agent"
  maxRetries: 5
`;
    fs.writeFileSync(configPath, yamlConfig);
    
    const config = loadConfig(configPath);
    
    expect(config.server.port).toBe(4001);
    expect(config.server.host).toBe('0.0.0.0');
    expect(config.logging.level).toBe(LogLevel.DEBUG);
    expect(config.logging.service).toBe('custom-service');
    expect(config.mcp.name).toBe('custom-mcp-server');
    expect(config.github?.token).toBe('yaml-token');
    expect(config.github?.userAgent).toBe('yaml-agent');
    expect(config.github?.maxRetries).toBe(5);
  });

  it('should override config with environment variables', () => {
    const yamlConfig = `
server:
  port: 4001
  host: "localhost"
github:
  token: "yaml-token"
  maxRetries: 2
`;
    fs.writeFileSync(configPath, yamlConfig);
    
    process.env.MCP_PORT = '5001';
    process.env.MCP_HOST = '127.0.0.1';
    process.env.LOG_LEVEL = 'DEBUG';
    process.env.SERVICE_NAME = 'env-service';
    process.env.GITHUB_TOKEN = 'env-token';
    process.env.GITHUB_USER_AGENT = 'env-agent';
    process.env.GITHUB_MAX_RETRIES = '10';
    
    const config = loadConfig(configPath);
    
    expect(config.server.port).toBe(5001);
    expect(config.server.host).toBe('127.0.0.1');
    expect(config.logging.level).toBe(LogLevel.DEBUG);
    expect(config.logging.service).toBe('env-service');
    expect(config.github?.token).toBe('env-token');
    expect(config.github?.userAgent).toBe('env-agent');
    expect(config.github?.maxRetries).toBe(10);
  });

  it('should prefer GITHUB_TOKEN over GITHUB_PAT', () => {
    process.env.GITHUB_TOKEN = 'primary-token';
    process.env.GITHUB_PAT = 'secondary-token';
    
    const config = loadConfig();
    
    expect(config.github?.token).toBe('primary-token');
  });

  it('should use GITHUB_PAT when GITHUB_TOKEN is not available', () => {
    process.env.GITHUB_PAT = 'pat-token';
    
    const config = loadConfig();
    
    expect(config.github?.token).toBe('pat-token');
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
