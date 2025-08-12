// Client-side Azure OpenAI integration via API routes
import { logger } from './logger';

interface RepositoryContext {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  language: string | null;
}

export async function* streamResponses(
  message: string, 
  previousResponseId?: string
): AsyncGenerator<{ type: 'response_id' | 'content', id?: string, content?: string }> {
  try {
    logger.info('Starting Responses API route...');
    
    const response = await fetch('/api/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, previousResponseId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              logger.info('Stream completed successfully');
              return;
            }
            
            try {
              const parsed = JSON.parse(data) as { type?: string; id?: string; content?: string };
              if (parsed.type === 'response_id' && parsed.id) {
                logger.debug('Received response ID:', parsed.id);
                yield { type: 'response_id', id: parsed.id };
              } else if (parsed.type === 'content' && parsed.content) {
                logger.debug('Received content chunk:', parsed.content);
                yield { type: 'content', content: parsed.content };
              }
            } catch {
              // Ignore parsing errors for partial chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error: unknown) {
    logger.error('Responses error:', error);
    throw error;
  }
}

export async function updateRepositoryContext(
  repositoryContext: RepositoryContext,
  previousResponseId?: string
): Promise<{ success: boolean; responseId?: string; error?: string }> {
  try {
    logger.info('Updating repository context...');
    
    const response = await fetch('/api/responses', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repositoryContext, previousResponseId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return { success: true, responseId: result.responseId };
  } catch (error) {
    logger.error('Repository context update error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

