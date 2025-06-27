# GitHub Issue Creation Tool

The `create_github_issue` MCP tool provides automated GitHub issue creation with advanced features including automatic label creation, milestone assignment, and repository validation.

## Features

- ✅ **Repository Validation**: Uses existing GitHub validation functions to ensure repository access
- 🏷️ **Automatic Label Creation**: Creates missing labels with generated colors
- 🎯 **Milestone Assignment**: Assigns issues to existing milestones
- 👥 **User Assignment**: Assigns issues to specified GitHub users
- 📋 **Project Integration**: Placeholder for future project assignment (requires GraphQL API)
- 🛡️ **Error Handling**: Comprehensive error handling with meaningful feedback
- ⚠️ **Graceful Degradation**: Continues execution even if some operations fail

## Tool Schema

```typescript
{
  owner: string;           // GitHub repository owner (required)
  repo: string;            // GitHub repository name (required)
  title: string;           // Issue title (required, min 1 character)
  body: string;            // Issue description (required)
  labels?: string[];       // Array of label names (optional)
  milestone?: string;      // Milestone title (optional)
  assignees?: string[];    // Array of GitHub usernames (optional)
  projectId?: number;      // Project ID for future implementation (optional)
}
```

## Usage Example

```typescript
import { CreateGitHubIssueTool } from './src/tools/github-tools';

const tool = new CreateGitHubIssueTool();

const result = await tool.execute({
  owner: 'myorg',
  repo: 'myproject',
  title: '🐛 Fix login validation bug',
  body: `## Description
The login form doesn't validate email addresses properly.

## Steps to Reproduce
1. Go to login page
2. Enter invalid email
3. Form submits anyway

## Expected Behavior
Form should show validation error for invalid emails.`,
  labels: ['bug', 'frontend', 'high-priority'],
  milestone: 'Sprint 3 - Bug Fixes',
  assignees: ['developer1', 'developer2']
});

if (result.success) {
  console.log(`Issue created: ${result.issue?.url}`);
} else {
  console.error(`Failed: ${result.error}`);
}
```

## Return Value

The tool returns a detailed result object:

```typescript
interface CreateGitHubIssueResult {
  success: boolean;
  issue?: {
    id: number;
    number: number;
    title: string;
    url: string;
    state: string;
    labels: Array<{ name: string; color: string; description?: string }>;
    milestone?: { title: string; due_on?: string };
    assignees: Array<{ login: string }>;
  };
  createdLabels?: Array<{ name: string; color: string }>;
  validationResults?: {
    repository: ValidationResult;
  };
  error?: string;
  warnings?: string[];
}
```

## Configuration

The tool uses the existing GitHub client configuration:

1. **Environment Variables**: Set `GITHUB_TOKEN` or `GITHUB_PAT`
2. **Config File**: Create `github-client.config.yaml` (optional)
3. **Token Scopes**: Ensure your token has `repo` scope for full functionality

## Error Handling

The tool provides comprehensive error handling:

- **Authentication Errors**: Invalid or expired tokens
- **Permission Errors**: Insufficient repository access
- **Not Found Errors**: Repository or milestone doesn't exist
- **API Errors**: GitHub service issues
- **Validation Errors**: Invalid input parameters

## Automatic Label Creation

When specified labels don't exist, the tool:

1. Checks if each label exists in the repository
2. Creates missing labels with auto-generated colors
3. Reports which labels were created
4. Continues issue creation even if some labels fail

## Milestone Handling

For milestone assignment:

1. Searches for milestone by exact title match
2. Assigns issue to milestone if found
3. Creates issue without milestone if not found (with warning)
4. Reports milestone assignment status

## Integration with Validation

The tool integrates with existing GitHub validation functions:

- Uses `validateRepository()` to verify access
- Leverages `GitHubClient.fromConfig()` for configuration
- Employs existing error translation functions
- Provides detailed validation results in response

## Examples

See the complete example in `examples/create-github-issue-example.ts` which demonstrates:

- Tool instantiation and configuration
- Parameter validation
- Error handling
- Result processing
- Best practices

## Future Enhancements

- **Project Assignment**: Full implementation when GraphQL API is integrated
- **Custom Label Colors**: Allow specifying colors for new labels
- **Bulk Operations**: Create multiple issues at once
- **Templates**: Support for issue templates
- **Advanced Validation**: Repository-specific validation rules

## Dependencies

- GitHub client with extended label and milestone management
- Zod for schema validation
- Existing GitHub validation framework
- Repository access validation functions
