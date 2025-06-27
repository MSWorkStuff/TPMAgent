# GitHub Client

This module provides a comprehensive GitHub client with validation capabilities for repository access, permissions, milestones, and projects.

## Configuration

### Required Environment Variables

The GitHub client requires a Personal Access Token (PAT) to be configured in your environment:

```bash
# Set one of these environment variables
GITHUB_TOKEN=your_github_personal_access_token
# OR
GITHUB_PAT=your_github_personal_access_token
```

### Configuration File

Create a `github-client.config.yaml` file based on `example.github-client.config.yaml`:

```yaml
userAgent: 'TPMAgent/1.0.0'
apiUrl: 'https://api.github.com'
maxRetries: 3
retryDelay: 1000
rateLimitRetries: 3
```

### Required Token Permissions

Your GitHub Personal Access Token must have the following scopes:

- `repo` - Full repository access (required for all validation functions)
- `read:user` - Read user profile data
- `read:org` - Read organization data (if working with organization repositories)

## Validation Functions

### Repository Validation

Validates that a repository exists and is accessible with the provided token:

```typescript
import { GitHubClient, validateRepository } from './src/github';

const client = GitHubClient.fromConfig();
const result = await validateRepository(client, 'owner', 'repo-name');
```

**Validates:**
- Repository exists and is accessible
- Token authentication is valid
- Token has sufficient permissions to access the repository

### Permission Validation

Checks user permissions for creating issues, labels, and modifying projects:

```typescript
const result = await validatePermissions(client, 'owner', 'repo-name');
```

**Validates:**
- Can create issues
- Can create labels
- Can modify projects
- Has push access
- Has admin access

### Milestone Validation

Validates milestones exist and creates missing ones using 2-week sprint intervals:

```typescript
const result = await validateMilestones(
  client, 
  'owner', 
  'repo-name', 
  ['Sprint 1', 'Sprint 2', 'Sprint 3'],
  {
    createMissing: true,
    sprintDurationWeeks: 2,
    startDate: new Date()
  }
);
```

**Validates:**
- Required milestones exist
- Creates missing milestones with 2-week intervals
- Sets appropriate due dates for sprint planning

### Project Validation

Validates project access and write permissions:

```typescript
const result = await validateProject(client, 'owner', 'repo-name', projectId);
```

**Note:** Project validation is simplified as GitHub Projects v2 requires GraphQL API implementation. This function validates repository-level permissions for project access.

### Complete Setup Validation

Runs all validations for a complete GitHub repository setup:

```typescript
const result = await validateGitHubSetup(
  client,
  'owner',
  'repo-name',
  {
    projectId: 123,
    requiredMilestones: ['Sprint 1', 'Sprint 2'],
    createMissingMilestones: true,
    sprintDurationWeeks: 2
  }
);
```

## Supported Functions

### GitHubClient Methods

- `getCurrentUser()` - Get authenticated user information
- `getRepository(owner, repo)` - Get repository details
- `getRepositoryPermissions(owner, repo, username)` - Get user permissions
- `getMilestones(owner, repo)` - List repository milestones
- `createMilestone(owner, repo, data)` - Create a new milestone
- `getIssues(owner, repo, options)` - List repository issues
- `createIssue(owner, repo, data)` - Create a new issue
- `getPullRequests(owner, repo, options)` - List pull requests
- `createPullRequest(owner, repo, data)` - Create a new pull request
- `getRateLimitInfo()` - Get current rate limit status

### Error Handling

The client provides comprehensive error handling with specific error types:

- `GitHubAuthenticationError` - Invalid or expired token
- `GitHubPermissionError` - Insufficient permissions
- `GitHubNotFoundError` - Repository or resource not found
- `GitHubRateLimitError` - API rate limit exceeded
- `GitHubNetworkError` - Network connectivity issues
- `GitHubApiError` - General API errors

### Retry Logic

The client automatically handles:

- Rate limiting with exponential backoff
- Network timeouts and connection errors
- Server errors (5xx responses)
- Configurable retry attempts and delays

## Usage Example

```typescript
import { GitHubClient, validateGitHubSetup } from './src/github';

// Initialize client from configuration
const client = GitHubClient.fromConfig();

// Validate complete setup
const validation = await validateGitHubSetup(
  client,
  'your-org',
  'your-repo',
  {
    requiredMilestones: ['Sprint 1', 'Sprint 2', 'Sprint 3'],
    createMissingMilestones: true,
    sprintDurationWeeks: 2
  }
);

if (validation.isValid) {
  console.log('✅ GitHub setup is valid');
  validation.summary.forEach(msg => console.log(msg));
} else {
  console.error('❌ GitHub setup validation failed');
  validation.summary.forEach(msg => console.log(msg));
}
```

## Error Messages

Validation functions provide detailed error messages for common issues:

- **Authentication**: "Invalid GitHub Personal Access Token. Please verify your token has the required permissions and is not expired."
- **Repository Access**: "Repository 'owner/repo' does not exist or is not accessible with the provided token."
- **Permissions**: "Your token does not have sufficient permissions. Missing permissions: create issues, create labels, modify projects."
- **Milestones**: "Failed to create milestone 'Sprint 1': Verify your token has write permissions to the repository."

Each validation result includes both human-readable error messages and structured error details for programmatic handling.
