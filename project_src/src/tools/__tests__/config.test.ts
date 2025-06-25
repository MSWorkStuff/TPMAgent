import fs from 'fs';
import path from 'path';
import { loadConfig, AppConfig, EnvConfig } from '../config';
import yaml from 'js-yaml';

describe('Config Loader', () => {
  const tempDir = path.join(__dirname, 'tmp');
  const yamlPath = path.join(tempDir, 'config.yaml');
  const envPath = path.join(tempDir, '.env');

  beforeAll(() => {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('loads and validates correct config and env', () => {
    const configObj: AppConfig = {
      repository: 'octocat/hello-world',
      projectId: 123,
      milestoneDuration: 14,
      defaultLabels: ['bug', 'feature'],
      issueTemplates: [
        { name: 'Bug', body: 'Describe bug' },
      ],
    };
    const envContent = 'GITHUB_TOKEN=abc123';
    fs.writeFileSync(yamlPath, yaml.dump(configObj));
    fs.writeFileSync(envPath, envContent);
    const { config, env } = loadConfig({ yamlPath, envPath });
    expect(config).toMatchObject(configObj);
    expect(env.GITHUB_TOKEN).toBe('abc123');
  });

  it('throws on missing env', () => {
    fs.writeFileSync(yamlPath, yaml.dump({ repository: 'octocat/hello-world', projectId: 1 }));
    fs.writeFileSync(envPath, '');
    // Remove GITHUB_TOKEN from process.env to ensure test isolation
    const originalToken = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    try {
      expect(() => loadConfig({ yamlPath, envPath })).toThrow(/GITHUB_TOKEN/);
    } finally {
      if (originalToken !== undefined) process.env.GITHUB_TOKEN = originalToken;
    }
  });

  it('throws on invalid yaml', () => {
    fs.writeFileSync(yamlPath, 'not: valid: yaml:');
    fs.writeFileSync(envPath, 'GITHUB_TOKEN=abc');
    expect(() => loadConfig({ yamlPath, envPath })).toThrow(/Failed to parse YAML/);
  });

  it('throws on invalid config', () => {
    fs.writeFileSync(yamlPath, yaml.dump({ repository: 'badformat', projectId: 1 }));
    fs.writeFileSync(envPath, 'GITHUB_TOKEN=abc');
    expect(() => loadConfig({ yamlPath, envPath })).toThrow(/repository/);
  });
});
