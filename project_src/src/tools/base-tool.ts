import { Tool, ToolSchema } from '../types/index';
import { z } from 'zod';

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
   * Convert Zod schema to MCP ToolSchema
   */
  private static zodSchemaToToolSchema(zodSchema: z.ZodSchema): ToolSchema {
    // This is a simplified conversion - you might want to use a library like zod-to-json-schema
    const def = (zodSchema as any)._def;
    
    if (def?.typeName === 'ZodObject' && def.shape) {
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(def.shape())) {
        const zodType = value as z.ZodSchema;
        properties[key] = ZodTool.zodTypeToJsonSchema(zodType);
        
        if (!(zodType as any).isOptional?.()) {
          required.push(key);
        }
      }

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    return {
      type: 'object',
      properties: {},
    };
  }

  /**
   * Convert individual Zod type to JSON Schema property
   */
  private static zodTypeToJsonSchema(zodType: z.ZodSchema): any {
    const def = (zodType as any)._def;
    const typeName = def?.typeName;
    
    switch (typeName) {
      case 'ZodString':
        return { type: 'string', description: (zodType as any).description };
      case 'ZodNumber':
        return { type: 'number', description: (zodType as any).description };
      case 'ZodBoolean':
        return { type: 'boolean', description: (zodType as any).description };
      case 'ZodArray':
        return {
          type: 'array',
          items: ZodTool.zodTypeToJsonSchema(def.type),
          description: (zodType as any).description,
        };
      case 'ZodObject':
        const shape = def.shape?.();
        return {
          type: 'object',
          properties: shape ? Object.fromEntries(
            Object.entries(shape).map(([key, value]) => [
              key,
              ZodTool.zodTypeToJsonSchema(value as z.ZodSchema),
            ])
          ) : {},
          description: (zodType as any).description,
        };
      case 'ZodOptional':
        return ZodTool.zodTypeToJsonSchema(def.innerType);
      default:
        return { type: 'string', description: (zodType as any).description || 'No description provided' };
    }
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
