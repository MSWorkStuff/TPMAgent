import { GitHubClient } from './client';
import { loadConfig } from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger('github-integration');

/**
 * Example integration showing how to use the GitHub client
 */
export async function initializeGitHubClient(): Promise<GitHubClient | null> {
  try {
    const config = loadConfig();
    
    // Try to create client from configuration first
    if (config.github?.token) {
      const client = new GitHubClient({
        token: config.github.token,
        userAgent: config.github.userAgent,
        baseUrl: config.github.apiUrl,
        maxRetries: config.github.maxRetries,
        retryDelay: config.github.retryDelay,
      });
      
      // Test the connection
      await client.testConnection();
      logger.info('GitHub client initialized successfully from configuration');
      return client;
    }
    
    // Fall back to environment variables
    const client = GitHubClient.fromEnvironment();
    await client.testConnection();
    logger.info('GitHub client initialized successfully from environment');
    return client;
    
  } catch (error) {
    logger.warn('Failed to initialize GitHub client', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Example function showing common GitHub operations
 */
export async function demonstrateGitHubOperations(client: GitHubClient): Promise<void> {
  try {
    // Get authenticated user info
    const user = await client.testConnection();
    logger.info(`Authenticated as: ${user.login}`);
    
    // Get rate limit info
    const rateLimit = await client.getRateLimitInfo();
    logger.info(`Rate limit: ${rateLimit.remaining}/${rateLimit.limit} remaining`);
    
    // List repositories
    const repos = await client.listRepositories('owner');
    logger.info(`Found ${repos.length} repositories`);
    
    if (repos.length > 0) {
      const firstRepo = repos[0];
      logger.info(`First repository: ${firstRepo.fullName}`);
      
      // Get issues for the first repository
      const [owner, repo] = firstRepo.fullName.split('/');
      const issues = await client.getIssues(owner, repo, { state: 'open' });
      logger.info(`Found ${issues.length} open issues in ${firstRepo.fullName}`);
      
      // Get pull requests
      const prs = await client.getPullRequests(owner, repo, { state: 'open' });
      logger.info(`Found ${prs.length} open pull requests in ${firstRepo.fullName}`);
    }
    
  } catch (error) {
    logger.error('Error during GitHub operations', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
