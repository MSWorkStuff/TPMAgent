import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { loadGitHubConfig } from '../config';

describe('GitHub Configuration', () => {
  const configPath = path.join(__dirname, 'test-github-config.yaml');
  const envPath = path.join(__dirname, 'test-github.env');

  beforeEach(() => {
    // Clean up environment variables
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_PAT;
  });

  afterEach(() => {
    // Clean up test files
    [configPath, envPath].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
    
    // Clean up environment variables
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_PAT;
  });

  it('should load configuration with GITHUB_TOKEN', () => {
    process.env.GITHUB_TOKEN = 'test-token';
    
    const config = loadGitHubConfig({ yamlPath: 'non-existent.yaml' });
    
    expect(config.token).toBe('test-token');
    expect(config.userAgent).toBe('TPMAgent/1.0.0');
    expect(config.apiUrl).toBe('https://api.github.com');
    expect(config.maxRetries).toBe(3);
    expect(config.retryDelay).toBe(1000);
    expect(config.rateLimitRetries).toBe(3);
  });

  it('should load configuration with GITHUB_PAT when GITHUB_TOKEN is not available', () => {
    process.env.GITHUB_PAT = 'pat-token';
    
    const config = loadGitHubConfig({ yamlPath: 'non-existent.yaml' });
    
    expect(config.token).toBe('pat-token');
  });

  it('should prefer GITHUB_TOKEN over GITHUB_PAT', () => {
    process.env.GITHUB_TOKEN = 'primary-token';
    process.env.GITHUB_PAT = 'secondary-token';
    
    const config = loadGitHubConfig({ yamlPath: 'non-existent.yaml' });
    
    expect(config.token).toBe('primary-token');
  });

  it('should throw error when no token is provided', () => {
    expect(() => {
      loadGitHubConfig({ yamlPath: 'non-existent.yaml' });
    }).toThrow('Either GITHUB_TOKEN or GITHUB_PAT must be provided');
  });

  it('should load and merge YAML configuration', () => {
    process.env.GITHUB_TOKEN = 'test-token';
    
    const yamlConfig = `
userAgent: "MyCustomApp/2.0.0"
apiUrl: "https://api.github.enterprise.com"
maxRetries: 5
retryDelay: 2000
rateLimitRetries: 5
`;
    fs.writeFileSync(configPath, yamlConfig);
    
    const config = loadGitHubConfig({ yamlPath: configPath });
    
    expect(config.token).toBe('test-token');
    expect(config.userAgent).toBe('MyCustomApp/2.0.0');
    expect(config.apiUrl).toBe('https://api.github.enterprise.com');
    expect(config.maxRetries).toBe(5);
    expect(config.retryDelay).toBe(2000);
    expect(config.rateLimitRetries).toBe(5);
  });

  it('should validate YAML configuration schema', () => {
    process.env.GITHUB_TOKEN = 'test-token';
    
    const invalidYaml = `
userAgent: "MyApp/1.0.0"
maxRetries: "invalid-number"
`;
    fs.writeFileSync(configPath, invalidYaml);
    
    expect(() => {
      loadGitHubConfig({ yamlPath: configPath });
    }).toThrow('GitHub config validation failed');
  });

  it('should handle missing YAML file gracefully', () => {
    process.env.GITHUB_TOKEN = 'test-token';
    
    const config = loadGitHubConfig({ yamlPath: 'non-existent-file.yaml' });
    
    // Should use defaults when file doesn't exist
    expect(config.token).toBe('test-token');
    expect(config.userAgent).toBe('TPMAgent/1.0.0');
    expect(config.apiUrl).toBe('https://api.github.com');
  });

  it('should handle malformed YAML gracefully', () => {
    process.env.GITHUB_TOKEN = 'test-token';
    
    const malformedYaml = 'invalid: yaml: content: [}';
    fs.writeFileSync(configPath, malformedYaml);
    
    // Should fall back to defaults
    const config = loadGitHubConfig({ yamlPath: configPath });
    expect(config.token).toBe('test-token');
    expect(config.userAgent).toBe('TPMAgent/1.0.0');
  });

  it('should validate numeric constraints', () => {
    process.env.GITHUB_TOKEN = 'test-token';
    
    const invalidYaml = `
maxRetries: -1
retryDelay: -500
rateLimitRetries: -2
`;
    fs.writeFileSync(configPath, invalidYaml);
    
    expect(() => {
      loadGitHubConfig({ yamlPath: configPath });
    }).toThrow('GitHub config validation failed');
  });
});
