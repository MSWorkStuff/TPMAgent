// Create a proper mock for RequestError before any imports
class MockRequestError extends Error {
  public status: number;
  public response?: any;
  public request?: any;

  constructor(message: string, status: number, options: { response?: any; request?: any }) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
    this.response = options.response;
    this.request = options.request;
  }
}

jest.mock('@octokit/request-error', () => ({
  RequestError: MockRequestError,
}));

import {
  translateGitHubError,
  isRetryableError,
  GitHubApiError,
  GitHubAuthenticationError,
  GitHubRateLimitError,
  GitHubNotFoundError,
  GitHubPermissionError,
  GitHubNetworkError,
} from '../errors';
import { RequestError } from '@octokit/request-error';

describe('GitHub Error Handling', () => {
  describe('translateGitHubError', () => {
    it('should translate 401 errors to authentication errors', () => {
      const requestError = new RequestError('Unauthorized', 401, {
        response: {
          status: 401,
          url: 'https://api.github.com/user',
          headers: {},
          data: {},
        } as any,
        request: {
          method: 'GET',
          url: 'https://api.github.com/user',
          headers: {},
        } as any,
      });

      const result = translateGitHubError(requestError);

      expect(result).toBeInstanceOf(GitHubAuthenticationError);
      expect(result.message).toContain('Invalid GitHub token');
    });

    it('should translate 403 rate limit errors to rate limit errors', () => {
      const requestError = new RequestError('Rate limit exceeded', 403, {
        response: {
          status: 403,
          url: 'https://api.github.com/user',
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '1640995200',
          },
          data: {},
        } as any,
        request: {
          method: 'GET',
          url: 'https://api.github.com/user',
          headers: {},
        } as any,
      });

      const result = translateGitHubError(requestError);

      expect(result).toBeInstanceOf(GitHubRateLimitError);
      expect(result.message).toContain('Rate limit exceeded');
      expect((result as GitHubRateLimitError).resetTime).toBeInstanceOf(Date);
    });

    it('should translate 403 permission errors to permission errors', () => {
      const requestError = new RequestError('Forbidden', 403, {
        response: {
          status: 403,
          url: 'https://api.github.com/repos/private/repo',
          headers: {},
          data: {},
        } as any,
        request: {
          method: 'GET',
          url: 'https://api.github.com/repos/private/repo',
          headers: {},
        } as any,
      });

      const result = translateGitHubError(requestError);

      expect(result).toBeInstanceOf(GitHubPermissionError);
      expect(result.message).toContain('Insufficient permissions');
    });

    it('should translate 404 errors to not found errors', () => {
      const requestError = new RequestError('Not Found', 404, {
        response: {
          status: 404,
          url: 'https://api.github.com/repos/nonexistent/repo',
          headers: {},
          data: {},
        } as any,
        request: {
          method: 'GET',
          url: 'https://api.github.com/repos/nonexistent/repo',
          headers: {},
        } as any,
      });

      const result = translateGitHubError(requestError);

      expect(result).toBeInstanceOf(GitHubNotFoundError);
      expect(result.message).toContain('repos/nonexistent/repo');
    });

    it('should translate 422 validation errors', () => {
      const requestError = new RequestError('Validation Failed', 422, {
        response: {
          status: 422,
          url: 'https://api.github.com/repos/owner/repo/issues',
          headers: {},
          data: {
            message: 'Validation Failed',
            errors: [{ field: 'title', code: 'missing_field' }],
          },
        } as any,
        request: {
          method: 'POST',
          url: 'https://api.github.com/repos/owner/repo/issues',
          headers: {},
        } as any,
      });

      const result = translateGitHubError(requestError);

      expect(result).toBeInstanceOf(GitHubApiError);
      expect(result.message).toContain('Validation failed');
      expect(result.status).toBe(422);
    });

    it('should translate network errors', () => {
      const networkError = new Error('ENOTFOUND api.github.com');

      const result = translateGitHubError(networkError);

      expect(result).toBeInstanceOf(GitHubNetworkError);
      expect(result.message).toContain('Unable to connect to GitHub API');
    });

    it('should translate timeout errors', () => {
      const timeoutError = new Error('Request timeout');

      const result = translateGitHubError(timeoutError);

      expect(result).toBeInstanceOf(GitHubNetworkError);
      expect(result.message).toContain('Request to GitHub API timed out');
    });

    it('should translate unknown errors to generic API errors', () => {
      const unknownError = new Error('Something went wrong');

      const result = translateGitHubError(unknownError);

      expect(result).toBeInstanceOf(GitHubApiError);
      expect(result.message).toContain('Unexpected GitHub error');
    });
  });

  describe('isRetryableError', () => {
    it('should identify server errors as retryable', () => {
      const serverError = new RequestError('Internal Server Error', 500, {
        response: {
          status: 500,
          url: 'https://api.github.com/user',
          headers: {},
          data: {},
        } as any,
        request: {
          method: 'GET',
          url: 'https://api.github.com/user',
          headers: {},
        } as any,
      });

      expect(isRetryableError(serverError)).toBe(true);
    });

    it('should identify rate limit errors as retryable', () => {
      const rateLimitError = new RequestError('Rate limit exceeded', 403, {
        response: {
          status: 403,
          url: 'https://api.github.com/user',
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '1640995200',
          },
          data: {},
        } as any,
        request: {
          method: 'GET',
          url: 'https://api.github.com/user',
          headers: {},
        } as any,
      });

      expect(isRetryableError(rateLimitError)).toBe(true);
    });

    it('should identify permission errors as non-retryable', () => {
      const permissionError = new RequestError('Forbidden', 403, {
        response: {
          status: 403,
          url: 'https://api.github.com/repos/private/repo',
          headers: {}, // No rate limit headers
          data: {},
        } as any,
        request: {
          method: 'GET',
          url: 'https://api.github.com/repos/private/repo',
          headers: {},
        } as any,
      });

      expect(isRetryableError(permissionError)).toBe(false);
    });

    it('should identify authentication errors as non-retryable', () => {
      const authError = new RequestError('Unauthorized', 401, {
        response: {
          status: 401,
          url: 'https://api.github.com/user',
          headers: {},
          data: {},
        } as any,
        request: {
          method: 'GET',
          url: 'https://api.github.com/user',
          headers: {},
        } as any,
      });

      expect(isRetryableError(authError)).toBe(false);
    });

    it('should identify network errors as retryable', () => {
      const networkError = new Error('ENOTFOUND api.github.com');
      expect(isRetryableError(networkError)).toBe(true);

      const connectionError = new Error('ECONNREFUSED');
      expect(isRetryableError(connectionError)).toBe(true);

      const timeoutError = new Error('Request timeout');
      expect(isRetryableError(timeoutError)).toBe(true);

      const resetError = new Error('ECONNRESET');
      expect(isRetryableError(resetError)).toBe(true);
    });

    it('should identify other errors as non-retryable', () => {
      const randomError = new Error('Something random');
      expect(isRetryableError(randomError)).toBe(false);
    });
  });

  describe('Custom Error Classes', () => {
    it('should create GitHubApiError with correct properties', () => {
      const error = new GitHubApiError('Test error', 400, { data: 'response' }, { url: 'test' });

      expect(error.name).toBe('GitHubApiError');
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.response).toEqual({ data: 'response' });
      expect(error.request).toEqual({ url: 'test' });
    });

    it('should create GitHubAuthenticationError with correct properties', () => {
      const error = new GitHubAuthenticationError();

      expect(error.name).toBe('GitHubAuthenticationError');
      expect(error.status).toBe(401);
      expect(error.message).toContain('Invalid GitHub authentication');
    });

    it('should create GitHubRateLimitError with correct properties', () => {
      const resetTime = new Date();
      const error = new GitHubRateLimitError(resetTime);

      expect(error.name).toBe('GitHubRateLimitError');
      expect(error.status).toBe(403);
      expect(error.resetTime).toBe(resetTime);
      expect(error.message).toContain('rate limit exceeded');
    });

    it('should create GitHubNotFoundError with correct properties', () => {
      const error = new GitHubNotFoundError('repos/owner/repo');

      expect(error.name).toBe('GitHubNotFoundError');
      expect(error.status).toBe(404);
      expect(error.message).toContain('repos/owner/repo');
    });

    it('should create GitHubPermissionError with correct properties', () => {
      const error = new GitHubPermissionError('read repository');

      expect(error.name).toBe('GitHubPermissionError');
      expect(error.status).toBe(403);
      expect(error.message).toContain('read repository');
    });

    it('should create GitHubNetworkError with correct properties', () => {
      const error = new GitHubNetworkError('Connection failed');

      expect(error.name).toBe('GitHubNetworkError');
      expect(error.message).toContain('Connection failed');
    });
  });
});
