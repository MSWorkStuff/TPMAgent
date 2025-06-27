import { z } from 'zod';
import { ZodTool } from './base-tool';
import { GitHubClient } from '../github';
import { 
  validateRepository, 
  ValidationResult 
} from '../github/validation';
import { 
  GitHubAuthenticationError,
  GitHubNotFoundError,
  GitHubPermissionError,
  GitHubApiError,
  translateGitHubError
} from '../github/errors';
import { GitHubClientError } from '../github/types';

// Schema for create GitHub issue tool
const CreateGitHubIssueSchema = z.object({
  owner: z.string().describe('GitHub repository owner (username or organization)'),
  repo: z.string().describe('GitHub repository name'),
  title: z.string().min(1).describe('Issue title (required)'),
  body: z.string().describe('Issue body/description (required)'),
  labels: z.array(z.string()).optional().describe('Array of label names to assign to the issue'),
  milestone: z.string().optional().describe('Milestone title to assign the issue to'),
  assignees: z.array(z.string()).optional().describe('Array of GitHub usernames to assign to the issue'),
  projectId: z.number().optional().describe('Project ID to add the issue to (if configured)'),
});

export interface CreateGitHubIssueResult {
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

/**
 * Tool for creating GitHub issues with automatic label creation and project assignment
 */
export class CreateGitHubIssueTool extends ZodTool<typeof CreateGitHubIssueSchema> {
  constructor() {
    super(
      'create_github_issue',
      'Creates a GitHub issue with specified parameters. Automatically creates missing labels, assigns to milestone if provided, and adds to project if configured. Uses GitHub repository validation functions.',
      CreateGitHubIssueSchema
    );
  }

  protected async executeWithValidatedParams(
    params: z.infer<typeof CreateGitHubIssueSchema>
  ): Promise<CreateGitHubIssueResult> {
    const { owner, repo, title, body, labels = [], milestone, assignees = [], projectId } = params;
    const result: CreateGitHubIssueResult = { success: false, warnings: [] };

    try {
      // Create GitHub client from config
      const client = GitHubClient.fromConfig();

      // Step 1: Validate repository access
      console.log(`🔍 Validating repository access for ${owner}/${repo}...`);
      const repoValidation = await validateRepository(client, owner, repo);
      result.validationResults = { repository: repoValidation };

      if (!repoValidation.isValid) {
        result.error = repoValidation.error || 'Repository validation failed';
        return result;
      }

      // Step 2: Handle labels - create missing ones
      const createdLabels: Array<{ name: string; color: string }> = [];
      if (labels && labels.length > 0) {
        console.log(`🏷️  Processing ${labels.length} labels...`);
        
        for (const labelName of labels) {
          try {
            // Check if label exists
            const existingLabel = await client.findLabelByName(owner, repo, labelName);
            
            if (!existingLabel) {
              console.log(`📌 Creating missing label: ${labelName}`);
              // Generate a random color for new labels
              const color = this.generateLabelColor();
              const newLabel = await client.createLabel(owner, repo, {
                name: labelName,
                color,
                description: `Auto-created label: ${labelName}`,
              });
              createdLabels.push({ name: newLabel.name, color: newLabel.color });
            } else {
              console.log(`✓ Label already exists: ${labelName}`);
            }
          } catch (error) {
            const githubError = translateGitHubError(error as GitHubClientError);
            console.warn(`⚠️  Failed to create label '${labelName}': ${githubError.message}`);
            result.warnings?.push(`Failed to create label '${labelName}': ${githubError.message}`);
          }
        }
        
        if (createdLabels.length > 0) {
          result.createdLabels = createdLabels;
        }
      }

      // Step 3: Handle milestone
      let milestoneNumber: number | undefined;
      if (milestone) {
        console.log(`🎯 Processing milestone: ${milestone}`);
        try {
          const existingMilestone = await client.findMilestoneByTitle(owner, repo, milestone);
          if (existingMilestone) {
            milestoneNumber = existingMilestone.number;
            console.log(`✓ Found milestone: ${milestone}`);
          } else {
            console.warn(`⚠️  Milestone '${milestone}' not found. Issue will be created without milestone.`);
            result.warnings?.push(`Milestone '${milestone}' not found. Issue created without milestone.`);
          }
        } catch (error) {
          const githubError = translateGitHubError(error as GitHubClientError);
          console.warn(`⚠️  Failed to find milestone '${milestone}': ${githubError.message}`);
          result.warnings?.push(`Failed to find milestone '${milestone}': ${githubError.message}`);
        }
      }

      // Step 4: Create the issue
      console.log(`🎫 Creating issue: ${title}`);
      const issueData = {
        title,
        body,
        labels: labels,
        assignees: assignees,
        milestone: milestoneNumber,
      };

      const createdIssue = await client.createIssue(owner, repo, issueData);

      // Step 5: Add to project if specified
      if (projectId && createdIssue.number) {
        console.log(`📋 Adding issue to project ${projectId}...`);
        try {
          await client.addIssueToProject(owner, repo, createdIssue.number, projectId);
          console.log(`✓ Issue added to project ${projectId}`);
        } catch (error) {
          const githubError = translateGitHubError(error as GitHubClientError);
          console.warn(`⚠️  Failed to add issue to project: ${githubError.message}`);
          result.warnings?.push(`Failed to add issue to project: ${githubError.message}`);
        }
      }

      // Step 6: Prepare successful result
      result.success = true;
      result.issue = {
        id: createdIssue.id,
        number: createdIssue.number,
        title: createdIssue.title,
        url: createdIssue.htmlUrl,
        state: createdIssue.state,
        labels: createdIssue.labels.map(label => ({
          name: label.name,
          color: label.color,
          description: label.description || undefined,
        })),
        milestone: milestoneNumber ? { title: milestone! } : undefined,
        assignees: createdIssue.assignees.map(assignee => ({ login: assignee.login })),
      };

      console.log(`✅ Successfully created issue #${createdIssue.number}: ${createdIssue.htmlUrl}`);
      return result;

    } catch (error) {
      const githubError = translateGitHubError(error as GitHubClientError);
      
      if (githubError instanceof GitHubAuthenticationError) {
        result.error = `Authentication failed: ${githubError.message}. Please verify your GitHub Personal Access Token.`;
      } else if (githubError instanceof GitHubNotFoundError) {
        result.error = `Repository not found: ${githubError.message}. Please verify the repository name and your access permissions.`;
      } else if (githubError instanceof GitHubPermissionError) {
        result.error = `Permission denied: ${githubError.message}. Please ensure your token has 'repo' scope and write access.`;
      } else if (githubError instanceof GitHubApiError) {
        result.error = `GitHub API error: ${githubError.message}`;
      } else {
        result.error = `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
      }

      console.error(`❌ Failed to create GitHub issue: ${result.error}`);
      return result;
    }
  }

  /**
   * Generates a random color for new labels
   */
  private generateLabelColor(): string {
    const colors = [
      'D93F0B', // Red
      'FBCA04', // Yellow
      '0E8A16', // Green
      '006B75', // Teal
      '1D76DB', // Blue
      '0052CC', // Dark Blue
      '5319E7', // Purple
      'E99695', // Pink
      'F9D0C4', // Light Pink
      'C2E0C6', // Light Green
      'BFDADC', // Light Teal
      'C5DEF5', // Light Blue
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
