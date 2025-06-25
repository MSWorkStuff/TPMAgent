import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';
import * as dotenv from 'dotenv';

// Zod schema for environment variables
defineEnvSchema();
function defineEnvSchema() {
  return z.object({
    GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required in .env'),
  });
}

// Zod schema for YAML config
defineYamlSchema();
function defineYamlSchema() {
  return z.object({
    repository: z
      .string()
      .regex(
        /^[^/\s]+\/[A-Za-z0-9_.-]+$/,
        'repository must be in the format owner/name'
      ),
    projectId: z.union([z.string(), z.number()]),
    milestoneDuration: z
      .number()
      .int()
      .positive()
      .default(14)
      .describe('Milestone duration in days (default: 14)'),
    defaultLabels: z.array(z.string()).default([]),
    issueTemplates: z
      .array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          body: z.string(),
        })
      )
      .default([]),
  });
}

export type AppConfig = z.infer<ReturnType<typeof defineYamlSchema>>;
export type EnvConfig = z.infer<ReturnType<typeof defineEnvSchema>>;

export function loadConfig({
  yamlPath = path.resolve(process.cwd(), 'tpm-agent.config.yaml'),
  envPath = path.resolve(process.cwd(), '.env'),
} = {}): { config: AppConfig; env: EnvConfig } {
  // Load and validate environment variables
  dotenv.config({ path: envPath });
  const envSchema = defineEnvSchema();
  const envResult = envSchema.safeParse(process.env);
  if (!envResult.success) {
    const errors = envResult.error.errors
      .map((e) => `ENV: ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  // Load and validate YAML config
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`Config file not found: ${yamlPath}`);
  }
  let rawConfig: unknown;
  try {
    rawConfig = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
  } catch (e) {
    throw new Error(`Failed to parse YAML config: ${(e as Error).message}`);
  }
  const yamlSchema = defineYamlSchema();
  const configResult = yamlSchema.safeParse(rawConfig);
  if (!configResult.success) {
    const errors = configResult.error.errors
      .map((e) => `CONFIG: ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Config validation failed:\n${errors}`);
  }

  return { config: configResult.data, env: envResult.data };
}
