import { Octokit } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
import {
  GitHubConfig,
  RateLimitInfo,
  RetryOptions,
  GitHubRepository,
  GitHubIssue,
  GitHubUser,
  GitHubPullRequest,
  CreateIssueRequest,
  CreatePullRequestRequest,
  GitHubClientError,
} from './types';
import { loadGitHubConfig, GitHubClientConfig } from './config';
import {
  translateGitHubError,
  isRetryableError,
  GitHubAuthenticationError,
  GitHubRateLimitError,
} from './errors';

export class GitHubClient {
  private octokit: Octokit;
  private config: Required<GitHubConfig>;
  private rateLimitInfo?: RateLimitInfo;

  constructor(config: GitHubConfig) {
    this.config = {
      token: config.token,
      userAgent: config.userAgent || 'TPMAgent/1.0.0',
      baseUrl: config.baseUrl || 'https://api.github.com',
      rateLimitRetries: config.rateLimitRetries || 3,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
    };

    this.octokit = new Octokit({
      auth: this.config.token,
      userAgent: this.config.userAgent,
      baseUrl: this.config.baseUrl,
    });
  }

  /**
   * Creates a GitHub client from configuration files and environment variables
   */
  static fromConfig(configPath?: string): GitHubClient {
    const config = loadGitHubConfig({ yamlPath: configPath });
    
    return new GitHubClient({
      token: config.token,
      userAgent: config.userAgent,
      baseUrl: config.apiUrl,
      rateLimitRetries: config.rateLimitRetries,
      maxRetries: config.maxRetries,
      retryDelay: config.retryDelay,
    });
  }

  /**
   * Creates a GitHub client from environment variables
   * @deprecated Use fromConfig() instead for better configuration management
   */
  static fromEnvironment(): GitHubClient {
    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
    
    if (!token) {
      throw new GitHubAuthenticationError(
        'GitHub token not found. Please set GITHUB_TOKEN or GITHUB_PAT environment variable.'
      );
    }

    return new GitHubClient({
      token,
      userAgent: process.env.GITHUB_USER_AGENT,
      baseUrl: process.env.GITHUB_API_URL,
    });
  }

  /**
   * Tests the connection and validates credentials
   */
  async testConnection(): Promise<GitHubUser> {
    try {
      const response = await this.executeWithRetry(() => this.octokit.rest.users.getAuthenticated());
      
      return {
        id: response.data.id,
        login: response.data.login,
        avatarUrl: response.data.avatar_url,
        htmlUrl: response.data.html_url,
        type: response.data.type as 'User' | 'Bot' | 'Organization',
      };
    } catch (error) {
      throw translateGitHubError(error as GitHubClientError);
    }
  }

  /**
   * Gets current rate limit information
   */
  async getRateLimitInfo(): Promise<RateLimitInfo> {
    try {
      const response = await this.octokit.rest.rateLimit.get();
      const rateData = (response.data.rate as any).core || response.data.rate;
      
      this.rateLimitInfo = {
        remaining: rateData.remaining,
        limit: rateData.limit,
        resetTime: new Date(rateData.reset * 1000),
        used: rateData.used,
      };
      
      return this.rateLimitInfo;
    } catch (error) {
      throw translateGitHubError(error as GitHubClientError);
    }
  }

  /**
   * Gets a repository
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    try {
      const response = await this.executeWithRetry(() =>
        this.octokit.rest.repos.get({ owner, repo })
      );
      
      return this.mapRepository(response.data);
    } catch (error) {
      throw translateGitHubError(error as GitHubClientError);
    }
  }

  /**
   * Lists repositories for the authenticated user
   */
  async listRepositories(type?: 'all' | 'owner' | 'public' | 'private' | 'member'): Promise<GitHubRepository[]> {
    try {
      const response = await this.executeWithRetry(() =>
        this.octokit.rest.repos.listForAuthenticatedUser({
          type: type || 'owner',
          sort: 'updated',
          per_page: 100,
        })
      );
      
      return response.data.map(repo => this.mapRepository(repo));
    } catch (error) {
      throw translateGitHubError(error as GitHubClientError);
    }
  }

  /**
   * Gets issues for a repository
   */
  async getIssues(
    owner: string,
    repo: string,
    options?: {
      state?: 'open' | 'closed' | 'all';
      labels?: string[];
      assignee?: string;
      sort?: 'created' | 'updated' | 'comments';
      direction?: 'asc' | 'desc';
    }
  ): Promise<GitHubIssue[]> {
    try {
      const response = await this.executeWithRetry(() =>
        this.octokit.rest.issues.listForRepo({
          owner,
          repo,
          state: options?.state || 'open',
          labels: options?.labels?.join(','),
          assignee: options?.assignee,
          sort: options?.sort || 'created',
          direction: options?.direction || 'desc',
          per_page: 100,
        })
      );
      
      return response.data
        .filter(issue => !issue.pull_request) // Filter out PRs
        .map(issue => this.mapIssue(issue));
    } catch (error) {
      throw translateGitHubError(error as GitHubClientError);
    }
  }

  /**
   * Creates a new issue
   */
  async createIssue(owner: string, repo: string, issueData: CreateIssueRequest): Promise<GitHubIssue> {
    try {
      const response = await this.executeWithRetry(() =>
        this.octokit.rest.issues.create({
          owner,
          repo,
          ...issueData,
        })
      );
      
      return this.mapIssue(response.data);
    } catch (error) {
      throw translateGitHubError(error as GitHubClientError);
    }
  }

  /**
   * Gets pull requests for a repository
   */
  async getPullRequests(
    owner: string,
    repo: string,
    options?: {
      state?: 'open' | 'closed' | 'all';
      head?: string;
      base?: string;
      sort?: 'created' | 'updated' | 'popularity';
      direction?: 'asc' | 'desc';
    }
  ): Promise<GitHubPullRequest[]> {
    try {
      const response = await this.executeWithRetry(() =>
        this.octokit.rest.pulls.list({
          owner,
          repo,
          state: options?.state || 'open',
          head: options?.head,
          base: options?.base,
          sort: options?.sort || 'created',
          direction: options?.direction || 'desc',
          per_page: 100,
        })
      );
      
      return response.data.map(pr => this.mapPullRequest(pr));
    } catch (error) {
      throw translateGitHubError(error as GitHubClientError);
    }
  }

  /**
   * Creates a new pull request
   */
  async createPullRequest(owner: string, repo: string, prData: CreatePullRequestRequest): Promise<GitHubPullRequest> {
    try {
      const response = await this.executeWithRetry(() =>
        this.octokit.rest.pulls.create({
          owner,
          repo,
          ...prData,
          maintainer_can_modify: prData.maintainerCanModify,
        })
      );
      
      return this.mapPullRequest(response.data);
    } catch (error) {
      throw translateGitHubError(error as GitHubClientError);
    }
  }

  /**
   * Gets the authenticated user
   */
  async getCurrentUser(): Promise<GitHubUser> {
    try {
      const response = await this.executeWithRetry(() =>
        this.octokit.rest.users.getAuthenticated()
      );
      
      return this.mapUser(response.data);
    } catch (error) {
      throw translateGitHubError(error as GitHubClientError);
    }
  }

  /**
   * Gets user permissions for a repository
   */
  async getRepositoryPermissions(owner: string, repo: string, username: string): Promise<any> {
    try {
      const response = await this.executeWithRetry(() =>
        this.octokit.rest.repos.getCollaboratorPermissionLevel({
          owner,
          repo,
          username,
        })
      );
      
      return response.data.permission;
    } catch (error) {
      throw translateGitHubError(error as GitHubClientError);
    }
  }

  /**
   * Gets milestones for a repository
   */
  async getMilestones(owner: string, repo: string): Promise<any[]> {
    try {
      const response = await this.executeWithRetry(() =>
        this.octokit.rest.issues.listMilestones({
          owner,
          repo,
          state: 'all',
          per_page: 100,
        })
      );
      
      return response.data;
    } catch (error) {
      throw translateGitHubError(error as GitHubClientError);
    }
  }

  /**
   * Creates a milestone
   */
  async createMilestone(owner: string, repo: string, milestoneData: {
    title: string;
    description?: string;
    due_on?: string;
  }): Promise<any> {
    try {
      const response = await this.executeWithRetry(() =>
        this.octokit.rest.issues.createMilestone({
          owner,
          repo,
          ...milestoneData,
        })
      );
      
      return response.data;
    } catch (error) {
      throw translateGitHubError(error as GitHubClientError);
    }
  }

  /**
   * Executes a function with retry logic and rate limiting
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    const retryOptions = {
      maxRetries: options?.maxRetries || this.config.maxRetries,
      baseDelay: options?.baseDelay || this.config.retryDelay,
      maxDelay: options?.maxDelay || 30000,
      backoffFactor: options?.backoffFactor || 2,
    };

    let lastError: GitHubClientError | undefined;
    
    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        // Check rate limit before making request
        if (this.rateLimitInfo && this.rateLimitInfo.remaining === 0) {
          const waitTime = this.rateLimitInfo.resetTime.getTime() - Date.now();
          if (waitTime > 0) {
            throw new GitHubRateLimitError(this.rateLimitInfo.resetTime);
          }
        }

        const result = await operation();
        
        // Update rate limit info from headers if available
        this.updateRateLimitFromHeaders(result);
        
        return result;
      } catch (error) {
        lastError = error as GitHubClientError;
        
        // Don't retry on the last attempt
        if (attempt === retryOptions.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!isRetryableError(lastError)) {
          break;
        }

        // Handle rate limiting with exponential backoff
        if (lastError instanceof RequestError && lastError.status === 403) {
          const resetHeader = lastError.response?.headers?.['x-ratelimit-reset'];
          if (resetHeader) {
            const resetTime = new Date(parseInt(resetHeader) * 1000);
            const waitTime = resetTime.getTime() - Date.now();
            
            if (waitTime > 0 && waitTime < 300000) { // Max 5 minutes
              await this.delay(waitTime);
              continue;
            }
          }
        }

        // Exponential backoff for other retryable errors
        const delay = Math.min(
          retryOptions.baseDelay * Math.pow(retryOptions.backoffFactor, attempt),
          retryOptions.maxDelay
        );
        
        await this.delay(delay);
      }
    }

    if (!lastError) {
      throw new Error('Unexpected error: no error was captured during retry attempts');
    }

    throw lastError;
  }

  /**
   * Updates rate limit info from response headers
   */
  private updateRateLimitFromHeaders(response: any): void {
    if (response?.headers) {
      const remaining = response.headers['x-ratelimit-remaining'];
      const limit = response.headers['x-ratelimit-limit'];
      const reset = response.headers['x-ratelimit-reset'];
      const used = response.headers['x-ratelimit-used'];

      if (remaining !== undefined && limit !== undefined && reset !== undefined) {
        this.rateLimitInfo = {
          remaining: parseInt(remaining),
          limit: parseInt(limit),
          resetTime: new Date(parseInt(reset) * 1000),
          used: parseInt(used) || 0,
        };
      }
    }
  }

  /**
   * Delays execution for the specified number of milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Maps Octokit repository data to our GitHubRepository type
   */
  private mapRepository(repo: any): GitHubRepository {
    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      description: repo.description,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      language: repo.language,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      openIssuesCount: repo.open_issues_count,
    };
  }

  /**
   * Maps Octokit issue data to our GitHubIssue type
   */
  private mapIssue(issue: any): GitHubIssue {
    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      user: this.mapUser(issue.user),
      assignees: issue.assignees?.map((assignee: any) => this.mapUser(assignee)) || [],
      labels: issue.labels?.map((label: any) => ({
        id: label.id,
        name: label.name,
        color: label.color,
        description: label.description,
      })) || [],
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      htmlUrl: issue.html_url,
    };
  }

  /**
   * Maps Octokit pull request data to our GitHubPullRequest type
   */
  private mapPullRequest(pr: any): GitHubPullRequest {
    return {
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      user: this.mapUser(pr.user),
      head: {
        ref: pr.head.ref,
        sha: pr.head.sha,
      },
      base: {
        ref: pr.base.ref,
        sha: pr.base.sha,
      },
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      htmlUrl: pr.html_url,
      mergeable: pr.mergeable,
      merged: pr.merged,
    };
  }

  /**
   * Maps Octokit user data to our GitHubUser type
   */
  private mapUser(user: any): GitHubUser {
    return {
      id: user.id,
      login: user.login,
      avatarUrl: user.avatar_url,
      htmlUrl: user.html_url,
      type: user.type,
    };
  }
}
