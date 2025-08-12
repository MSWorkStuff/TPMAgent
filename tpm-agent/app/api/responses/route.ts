export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { AzureOpenAI } from "openai";
import { getToken } from "next-auth/jwt";
import { logger } from "@/lib/logger";
import { readFile } from "fs/promises";
import { join } from "path";

// 2025-03-01-preview is the min version with responses API support
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2025-03-01-preview";
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;

// Validate required environment variables
if (!endpoint) {
  logger.error('AZURE_OPENAI_ENDPOINT environment variable is required but not set');
}

if (!apiKey) {
  logger.error('AZURE_OPENAI_API_KEY environment variable is required but not set');
}

const aoaiClient = endpoint && apiKey ? new AzureOpenAI({ 
  endpoint,  
  apiKey,
  deployment, 
  apiVersion,
}) : null;


function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    
    if (!token?.accessToken) {
      return NextResponse.json(
        { error: 'GitHub authentication required' },
        { status: 401 }
      );
    }

    if (!aoaiClient) {
      return NextResponse.json(
        { error: 'Azure OpenAI client not configured. Check environment variables.' },
        { status: 500 }
      );
    }

    const { message, previousResponseId }: { message: string, previousResponseId?: string } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Read instructions from markdown file
    const instructionsPath = join(process.cwd(), 'app', 'config', 'instructions.md');
    let instructions = '';
    try {
      instructions = await readFile(instructionsPath, 'utf-8');
    } catch {
      logger.warn('Instructions file not found, proceeding without instructions');
    }

    // Build streaming request using the SDK's streaming helper to preserve types
    const stream = await aoaiClient.responses.stream({
      model: deployment,
      input: [{ role: 'user', content: message }],
      instructions,
      ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
      ...(token?.accessToken
        ? {
            tools: [
              {
                type: "mcp",
                server_label: "github_remote_mcp",
                server_url: "https://api.githubcopilot.com/mcp/",
                require_approval: "never",
                headers: {
                  Authorization: `Bearer ${token.accessToken}`,
                },
              },
            ],
          }
        : {}),
    });

    // Create a ReadableStream for streaming the response
    const encoder = new TextEncoder();
    let responseId: string | null = null;
    
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (!isRecord(chunk) || typeof chunk.type !== 'string') {
              continue;
            }

            // Send response ID when we first get it
            if (isRecord(chunk.response) && typeof chunk.response.id === 'string' && !responseId) {
              responseId = chunk.response.id;
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'response_id', id: responseId })}\n\n`
              ));
              continue;
            }
            
            // Handle text deltas
            if (chunk.type === 'response.output_text.delta' && typeof chunk.delta === 'string') {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'content', content: chunk.delta })}\n\n`
              ));
              continue;
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          // Surface a structured SSE error before closing
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Unknown stream error' })}\n\n`
            )
          );
          logger.error('Stream error:', error);
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    logger.error('Azure OpenAI API Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Authentication failed. Please check your Azure API key.' },
          { status: 401 }
        );
      } else if (error.message.includes('404')) {
        return NextResponse.json(
          { error: 'Azure OpenAI endpoint or deployment not found. Please check your configuration.' },
          { status: 404 }
        );
      } else if (error.message.includes('429')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }
    
    return NextResponse.json(
      { error: `Failed to get response from Azure OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    logger.debug('PUT request received for repository context update');
    const token = await getToken({ req: request });
    
    if (!token?.accessToken) {
      return NextResponse.json(
        { error: 'GitHub authentication required' },
        { status: 401 }
      );
    }

    if (!aoaiClient) {
      return NextResponse.json(
        { error: 'Azure OpenAI client not configured. Check environment variables.' },
        { status: 500 }
      );
    }

    const { repositoryContext, previousResponseId }: { 
      repositoryContext: {
        id: number;
        name: string;
        full_name: string;
        description: string | null;
        private: boolean;
        html_url: string;
        language: string | null;
      },
      previousResponseId?: string
    } = await request.json();

    if (!repositoryContext) {
      logger.warn('Repository context missing in PUT request');
      return NextResponse.json(
        { error: 'Repository context is required' },
        { status: 400 }
      );
    }

    logger.info(`Updating repository context for: ${repositoryContext.full_name}`);

    const assistantMessage = {
      role: 'assistant',
      content: `Active repository has been set to: ${repositoryContext.full_name}

Repository Details:
- Name: ${repositoryContext.name}
- Full Name: ${repositoryContext.full_name}
- Description: ${repositoryContext.description || 'No description available'}
- Private: ${repositoryContext.private ? 'Yes' : 'No'}
- Primary Language: ${repositoryContext.language || 'Not specified'}
- URL: ${repositoryContext.html_url}

This repository is now the active context for all subsequent project management tasks, issue creation, and development planning.`
    };

    const responseCreateParams: Record<string, unknown> = {
      model: deployment,
      input: [assistantMessage],
      stream: false,
    };

    // Add previous response ID for conversation continuity
    if (previousResponseId) {
      responseCreateParams.previous_response_id = previousResponseId;
    }

    const response = await aoaiClient.responses.create(responseCreateParams);

    logger.info(`Repository context updated successfully. Response ID: ${response.id}`);
    
    return NextResponse.json({ 
      success: true, 
      responseId: response.id,
      message: 'Repository context updated successfully' 
    });

  } catch (error) {
    logger.error('Repository context update error:', error);
    
    return NextResponse.json(
      { error: `Failed to update repository context: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
