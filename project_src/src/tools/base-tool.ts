import { Tool, ToolSchema } from '../types/index';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Abstract base class for MCP tools with type safety
 */
export abstract class BaseTool<TInput, TOutput> implements Tool<TInput, TOutput> {
  protected constructor(
    protected readonly name: string,
    protected readonly description: string,
    protected readonly inputSchema?: ToolSchema
  ) {}

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getInputSchema?(): ToolSchema {
    return this.inputSchema || {
      type: 'object',
      properties: {},
    };
  }

  abstract execute(params: TInput): Promise<TOutput>;

  /**
   * Validate input parameters against the tool's schema
   * Override this method to provide custom validation logic
   */
  protected validateInput(params: any): TInput {
    if (!this.inputSchema) {
      return params as TInput;
    }

    // Basic JSON Schema validation for required fields
    if (this.inputSchema.required && Array.isArray(this.inputSchema.required)) {
      for (const field of this.inputSchema.required) {
        if (params[field] === undefined || params[field] === null) {
          throw new Error(`Missing required parameter: ${field}`);
        }
      }
    }

    // Basic type validation for properties
    if (this.inputSchema.properties) {
      for (const [key, schema] of Object.entries(this.inputSchema.properties)) {
        if (params[key] !== undefined && schema.type) {
          const actualType = Array.isArray(params[key]) ? 'array' : typeof params[key];
          if (actualType !== schema.type && !(schema.type === 'array' && Array.isArray(params[key]))) {
            throw new Error(`Parameter '${key}' expected type '${schema.type}', got '${actualType}'`);
          }
        }
      }
    }

    return params as TInput;
  }

  /**
   * Public method to validate input parameters (used by registry)
   */
  public validate(params: any): TInput {
    return this.validateInput(params);
  }
}

/**
 * Tool implementation using Zod schemas for validation
 */
export abstract class ZodTool<
  TInputSchema extends z.ZodSchema,
  TInput = z.infer<TInputSchema>,
  TOutput = any
> extends BaseTool<TInput, TOutput> {
  protected constructor(
    name: string,
    description: string,
    protected readonly zodSchema: TInputSchema
  ) {
    super(name, description, ZodTool.zodSchemaToToolSchema(zodSchema));
  }

  /**
   * Convert Zod schema to MCP ToolSchema using zod-to-json-schema library
   */
  private static zodSchemaToToolSchema(zodSchema: z.ZodSchema): ToolSchema {
    const jsonSchema = zodToJsonSchema(zodSchema, {
      name: undefined, // Don't add a root $schema name
      target: 'jsonSchema7', // Use JSON Schema draft 7
    });

    // Type guard to ensure we're working with an object schema
    if (typeof jsonSchema === 'object' && jsonSchema !== null && !Array.isArray(jsonSchema)) {
      const objectSchema = jsonSchema as any; // We know this is the JSON Schema format we expect
      
      return {
        type: 'object',
        properties: objectSchema.properties || {},
        required: objectSchema.required || undefined,
      } as ToolSchema;
    }

    // Fallback for non-object schemas
    return {
      type: 'object',
      properties: {},
    } as ToolSchema;
  }

  /**
   * Validate and parse input using Zod schema
   */
  protected validateInput(params: unknown): TInput {
    return this.zodSchema.parse(params);
  }

  /**
   * Execute with automatic input validation
   */
  async execute(params: unknown): Promise<TOutput> {
    const validatedParams = this.validateInput(params);
    return this.executeWithValidatedParams(validatedParams);
  }

  /**
   * Execute with already validated parameters
   */
  protected abstract executeWithValidatedParams(params: TInput): Promise<TOutput>;
}
