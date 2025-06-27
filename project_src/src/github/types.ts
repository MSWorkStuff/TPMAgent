import { RequestError } from '@octokit/request-error';

export interface GitHubConfig {
  token: string;
  userAgent?: string;
  baseUrl?: string; // Keep baseUrl for compatibility with Octokit
  rateLimitRetries?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetTime: Date;
  used: number;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
  htmlUrl: string;
  cloneUrl: string;
  createdAt: string;
  updatedAt: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: GitHubUser;
  assignees: GitHubUser[];
  labels: GitHubLabel[];
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  type: 'User' | 'Bot' | 'Organization';
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed' | 'merged';
  user: GitHubUser;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  mergeable: boolean | null;
  merged: boolean;
}

export interface CreateIssueRequest {
  title: string;
  body?: string;
  assignees?: string[];
  milestone?: number;
  labels?: string[];
}

export interface CreatePullRequestRequest {
  title: string;
  head: string;
  base: string;
  body?: string;
  draft?: boolean;
  maintainerCanModify?: boolean;
}

export interface GitHubError extends Error {
  status?: number;
  response?: any;
  request?: any;
}

export type GitHubClientError = RequestError | GitHubError | Error;
