import { RequestError } from '@octokit/request-error';
import { GitHubClientError } from './types';

export class GitHubApiError extends Error {
  public status?: number;
  public response?: any;
  public request?: any;

  constructor(message: string, status?: number, response?: any, request?: any) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
    this.response = response;
    this.request = request;
  }
}

export class GitHubAuthenticationError extends GitHubApiError {
  constructor(message = 'Invalid GitHub authentication credentials') {
    super(message, 401);
    this.name = 'GitHubAuthenticationError';
  }
}

export class GitHubRateLimitError extends GitHubApiError {
  public resetTime: Date;

  constructor(resetTime: Date, message = 'GitHub API rate limit exceeded') {
    super(message, 403);
    this.name = 'GitHubRateLimitError';
    this.resetTime = resetTime;
  }
}

export class GitHubNotFoundError extends GitHubApiError {
  constructor(resource: string) {
    super(`GitHub resource not found: ${resource}`, 404);
    this.name = 'GitHubNotFoundError';
  }
}

export class GitHubPermissionError extends GitHubApiError {
  constructor(action: string) {
    super(`Insufficient permissions for GitHub action: ${action}`, 403);
    this.name = 'GitHubPermissionError';
  }
}

export class GitHubNetworkError extends GitHubApiError {
  constructor(message: string) {
    super(`GitHub network error: ${message}`);
    this.name = 'GitHubNetworkError';
  }
}

/**
 * Translates GitHub API errors into user-friendly error messages
 */
export function translateGitHubError(error: GitHubClientError): GitHubApiError {
  if (error instanceof RequestError) {
    const { status, response, request } = error;
    
    switch (status) {
      case 401:
        return new GitHubAuthenticationError(
          'Invalid GitHub token. Please check your GITHUB_TOKEN environment variable.'
        );
      
      case 403:
        if (response?.headers?.['x-ratelimit-remaining'] === '0') {
          const resetTime = new Date(
            parseInt(response.headers['x-ratelimit-reset'] || '0') * 1000
          );
          return new GitHubRateLimitError(
            resetTime,
            `Rate limit exceeded. Resets at ${resetTime.toISOString()}`
          );
        }
        return new GitHubPermissionError(
          'Insufficient permissions to access this GitHub resource'
        );
      
      case 404:
        return new GitHubNotFoundError(
          request?.url?.replace(/https:\/\/api\.github\.com\//, '') || 'resource'
        );
      
      case 422:
        return new GitHubApiError(
          `Validation failed: ${(response?.data as any)?.message || 'Invalid request parameters'}`,
          422,
          response,
          request
        );
      
      default:
        return new GitHubApiError(
          `GitHub API error (${status}): ${error.message}`,
          status,
          response,
          request
        );
    }
  }

  if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
    return new GitHubNetworkError(
      'Unable to connect to GitHub API. Please check your internet connection.'
    );
  }

  if (error.message.includes('timeout')) {
    return new GitHubNetworkError(
      'Request to GitHub API timed out. Please try again.'
    );
  }

  return new GitHubApiError(
    `Unexpected GitHub error: ${error.message}`
  );
}

/**
 * Checks if an error is retryable
 */
export function isRetryableError(error: GitHubClientError): boolean {
  if (error instanceof RequestError) {
    // Retry on server errors (5xx)
    if (error.status >= 500) {
      return true;
    }
    
    // Only retry on 403 if it's a rate limit (not a permission error)
    if (error.status === 403) {
      return error.response?.headers?.['x-ratelimit-remaining'] === '0';
    }
    
    return false;
  }

  // Retry on network errors
  return (
    error.message.includes('ENOTFOUND') ||
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('timeout') ||
    error.message.includes('ECONNRESET')
  );
}
