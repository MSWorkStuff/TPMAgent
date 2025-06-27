// Mock Octokit with proper ES module mocking
const mockOctokit = {
  rest: {
    users: {
      getAuthenticated: jest.fn(),
    },
    rateLimit: {
      get: jest.fn(),
    },
    repos: {
      get: jest.fn(),
      listForAuthenticatedUser: jest.fn(),
    },
    issues: {
      listForRepo: jest.fn(),
      create: jest.fn(),
    },
    pulls: {
      list: jest.fn(),
      create: jest.fn(),
    },
  },
};

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn(() => mockOctokit),
}));

jest.mock('@octokit/request-error', () => ({
  RequestError: class MockRequestError extends Error {
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
  },
}));

import { GitHubClient } from '../client';
import { GitHubAuthenticationError, GitHubRateLimitError, GitHubNotFoundError } from '../errors';
import { RequestError } from '@octokit/request-error';

describe('GitHubClient', () => {
  let client: GitHubClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    client = new GitHubClient({
      token: 'test-token',
      userAgent: 'test-agent',
      maxRetries: 1,
      retryDelay: 100,
    });
  });

  describe('fromEnvironment', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create client from GITHUB_TOKEN environment variable', () => {
      process.env.GITHUB_TOKEN = 'env-token';
      
      const client = GitHubClient.fromEnvironment();
      expect(client).toBeInstanceOf(GitHubClient);
    });

    it('should create client from GITHUB_PAT environment variable', () => {
      process.env.GITHUB_PAT = 'env-pat-token';
      
      const client = GitHubClient.fromEnvironment();
      expect(client).toBeInstanceOf(GitHubClient);
    });

    it('should throw authentication error when no token is found', () => {
      delete process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_PAT;
      
      expect(() => GitHubClient.fromEnvironment()).toThrow(GitHubAuthenticationError);
    });
  });

  describe('testConnection', () => {
    it('should return authenticated user information', async () => {
      const userData = {
        id: 123,
        login: 'testuser',
        avatar_url: 'https://avatar.url',
        html_url: 'https://github.com/testuser',
        type: 'User',
      };

      mockOctokit.rest.users.getAuthenticated.mockResolvedValue({
        data: userData,
      });

      const result = await client.testConnection();

      expect(result).toEqual({
        id: 123,
        login: 'testuser',
        avatarUrl: 'https://avatar.url',
        htmlUrl: 'https://github.com/testuser',
        type: 'User',
      });
    });

    it('should handle authentication errors', async () => {
      const error = new RequestError('Bad credentials', 401, {
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

      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(error);

      await expect(client.testConnection()).rejects.toThrow(GitHubAuthenticationError);
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return rate limit information', async () => {
      const rateLimitData = {
        rate: {
          remaining: 4999,
          limit: 5000,
          reset: Math.floor(Date.now() / 1000) + 3600,
          used: 1,
        },
      };

      mockOctokit.rest.rateLimit.get.mockResolvedValue({
        data: rateLimitData,
      });

      const result = await client.getRateLimitInfo();

      expect(result.remaining).toBe(4999);
      expect(result.limit).toBe(5000);
      expect(result.used).toBe(1);
      expect(result.resetTime).toBeInstanceOf(Date);
    });
  });

  describe('getRepository', () => {
    it('should return repository information', async () => {
      const repoData = {
        id: 456,
        name: 'test-repo',
        full_name: 'testuser/test-repo',
        private: false,
        description: 'Test repository',
        html_url: 'https://github.com/testuser/test-repo',
        clone_url: 'https://github.com/testuser/test-repo.git',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        language: 'TypeScript',
        stargazers_count: 42,
        forks_count: 7,
        open_issues_count: 3,
      };

      mockOctokit.rest.repos.get.mockResolvedValue({
        data: repoData,
      });

      const result = await client.getRepository('testuser', 'test-repo');

      expect(result).toEqual({
        id: 456,
        name: 'test-repo',
        fullName: 'testuser/test-repo',
        private: false,
        description: 'Test repository',
        htmlUrl: 'https://github.com/testuser/test-repo',
        cloneUrl: 'https://github.com/testuser/test-repo.git',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
        language: 'TypeScript',
        stargazersCount: 42,
        forksCount: 7,
        openIssuesCount: 3,
      });
    });

    it('should handle repository not found errors', async () => {
      const error = new RequestError('Not Found', 404, {
        response: {
          status: 404,
          url: 'https://api.github.com/repos/testuser/nonexistent',
          headers: {},
          data: {},
        } as any,
        request: {
          method: 'GET',
          url: 'https://api.github.com/repos/testuser/nonexistent',
          headers: {},
        } as any,
      });

      mockOctokit.rest.repos.get.mockRejectedValue(error);

      await expect(client.getRepository('testuser', 'nonexistent')).rejects.toThrow(GitHubNotFoundError);
    });
  });

  describe('listRepositories', () => {
    it('should return list of repositories', async () => {
      const reposData = [
        {
          id: 1,
          name: 'repo1',
          full_name: 'testuser/repo1',
          private: false,
          description: 'First repo',
          html_url: 'https://github.com/testuser/repo1',
          clone_url: 'https://github.com/testuser/repo1.git',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          language: 'JavaScript',
          stargazers_count: 10,
          forks_count: 2,
          open_issues_count: 1,
        },
      ];

      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({
        data: reposData,
      });

      const result = await client.listRepositories();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('repo1');
    });
  });

  describe('getIssues', () => {
    it('should return list of issues (excluding pull requests)', async () => {
      const issuesData = [
        {
          id: 1,
          number: 1,
          title: 'Test issue',
          body: 'Issue body',
          state: 'open',
          user: {
            id: 123,
            login: 'testuser',
            avatar_url: 'https://avatar.url',
            html_url: 'https://github.com/testuser',
            type: 'User',
          },
          assignees: [],
          labels: [],
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          html_url: 'https://github.com/testuser/repo/issues/1',
          pull_request: undefined, // Not a PR
        },
        {
          id: 2,
          number: 2,
          title: 'Test PR',
          body: 'PR body',
          state: 'open',
          user: {
            id: 123,
            login: 'testuser',
            avatar_url: 'https://avatar.url',
            html_url: 'https://github.com/testuser',
            type: 'User',
          },
          assignees: [],
          labels: [],
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          html_url: 'https://github.com/testuser/repo/pull/2',
          pull_request: { url: 'https://api.github.com/repos/testuser/repo/pulls/2' }, // This is a PR
        },
      ];

      mockOctokit.rest.issues.listForRepo.mockResolvedValue({
        data: issuesData,
      });

      const result = await client.getIssues('testuser', 'repo');

      // Should only return the issue, not the PR
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test issue');
    });
  });

  describe('createIssue', () => {
    it('should create a new issue', async () => {
      const issueData = {
        id: 1,
        number: 1,
        title: 'New issue',
        body: 'Issue description',
        state: 'open',
        user: {
          id: 123,
          login: 'testuser',
          avatar_url: 'https://avatar.url',
          html_url: 'https://github.com/testuser',
          type: 'User',
        },
        assignees: [],
        labels: [],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        html_url: 'https://github.com/testuser/repo/issues/1',
      };

      mockOctokit.rest.issues.create.mockResolvedValue({
        data: issueData,
      });

      const result = await client.createIssue('testuser', 'repo', {
        title: 'New issue',
        body: 'Issue description',
      });

      expect(result.title).toBe('New issue');
      expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith({
        owner: 'testuser',
        repo: 'repo',
        title: 'New issue',
        body: 'Issue description',
      });
    });
  });

  describe('retry logic', () => {
    it('should retry on rate limit errors', async () => {
      const rateLimitError = new RequestError('rate limit exceeded', 403, {
        response: {
          status: 403,
          url: 'https://api.github.com/user',
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 1),
          },
          data: {},
        } as any,
        request: {
          method: 'GET',
          url: 'https://api.github.com/user',
          headers: {},
        } as any,
      });

      const userData = {
        id: 123,
        login: 'testuser',
        avatar_url: 'https://avatar.url',
        html_url: 'https://github.com/testuser',
        type: 'User',
      };

      mockOctokit.rest.users.getAuthenticated
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue({ data: userData });

      const result = await client.testConnection();

      expect(result.login).toBe('testuser');
      expect(mockOctokit.rest.users.getAuthenticated).toHaveBeenCalledTimes(2);
    });

    it('should not retry on authentication errors', async () => {
      const authError = new RequestError('Bad credentials', 401, {
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

      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(authError);

      await expect(client.testConnection()).rejects.toThrow(GitHubAuthenticationError);
      expect(mockOctokit.rest.users.getAuthenticated).toHaveBeenCalledTimes(1);
    });

    it('should respect max retries', async () => {
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

      mockOctokit.rest.users.getAuthenticated.mockRejectedValue(serverError);

      await expect(client.testConnection()).rejects.toThrow();
      // Should be called maxRetries + 1 times (1 initial + 1 retry)
      expect(mockOctokit.rest.users.getAuthenticated).toHaveBeenCalledTimes(2);
    });
  });
});
