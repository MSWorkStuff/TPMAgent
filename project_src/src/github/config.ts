import { z } from 'zod';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import * as dotenv from 'dotenv';

// Schema for GitHub client configuration (YAML file)
const GitHubConfigSchema = z.object({
  userAgent: z.string().default('TPMAgent/1.0.0'),
  apiUrl: z.string().default('https://api.github.com'),
  maxRetries: z.number().int().min(0).default(3),
  retryDelay: z.number().int().min(0).default(1000),
  rateLimitRetries: z.number().int().min(0).default(3),
});

// Schema for environment variables (token only)
const GitHubEnvSchema = z.object({
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_PAT: z.string().optional(),
}).refine(
  (data) => data.GITHUB_TOKEN || data.GITHUB_PAT,
  {
    message: "Either GITHUB_TOKEN or GITHUB_PAT must be provided in environment variables",
    path: ["GITHUB_TOKEN"],
  }
);

export type GitHubYamlConfig = z.infer<typeof GitHubConfigSchema>;
export type GitHubEnvConfig = z.infer<typeof GitHubEnvSchema>;

export interface GitHubClientConfig extends GitHubYamlConfig {
  token: string;
}

/**
 * Load GitHub client configuration from YAML file and environment variables
 */
export function loadGitHubConfig({
  yamlPath = 'github-client.config.yaml',
  envPath = '.env',
}: {
  yamlPath?: string;
  envPath?: string;
} = {}): GitHubClientConfig {
  // Load environment variables
  dotenv.config({ path: envPath });
  
  // Validate environment variables (token)
  const envResult = GitHubEnvSchema.safeParse(process.env);
  if (!envResult.success) {
    const errors = envResult.error.errors
      .map((e) => `ENV: ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`GitHub environment validation failed:\n${errors}`);
  }

  const token = envResult.data.GITHUB_TOKEN || envResult.data.GITHUB_PAT!;

  // Load YAML configuration
  let yamlConfig = {};
  try {
    const fileContent = readFileSync(yamlPath, 'utf8');
    yamlConfig = load(fileContent) as any;
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.warn(`Warning: GitHub config file not found at ${yamlPath}`);
      console.warn('Please copy example.github-client.config.yaml to github-client.config.yaml');
      console.warn('Using default values for GitHub client configuration');
    } else {
      console.warn(`Warning: Could not load GitHub config file ${yamlPath}:`, error);
      console.warn('Using default values for GitHub client configuration');
    }
  }

  // Validate YAML configuration
  const configResult = GitHubConfigSchema.safeParse(yamlConfig);
  if (!configResult.success) {
    const errors = configResult.error.errors
      .map((e) => `CONFIG: ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`GitHub config validation failed:\n${errors}`);
  }

  // Combine token from env with config from YAML
  return {
    ...configResult.data,
    token,
  };
}
