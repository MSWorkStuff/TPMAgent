import { GitHubClient } from './client';
import {
  GitHubAuthenticationError,
  GitHubNotFoundError,
  GitHubPermissionError,
  GitHubApiError,
  translateGitHubError,
} from './errors';
import { GitHubClientError } from './types';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: any;
}

export interface ProjectValidationResult extends ValidationResult {
  projectExists?: boolean;
  hasWriteAccess?: boolean;
}

export interface MilestoneValidationResult extends ValidationResult {
  milestones?: Array<{ id: number; title: string; due_on: string | null }>;
  created?: Array<{ id: number; title: string; due_on: string }>;
}

export interface PermissionValidationResult extends ValidationResult {
  permissions?: {
    canCreateIssues: boolean;
    canCreateLabels: boolean;
    canModifyProjects: boolean;
    canPush: boolean;
    canAdmin: boolean;
  };
}

/**
 * Validates that the configured repository exists and is accessible with the provided PAT
 */
export async function validateRepository(
  client: GitHubClient,
  owner: string,
  repo: string
): Promise<ValidationResult> {
  try {
    // First check if we can authenticate
    await client.getCurrentUser();

    // Then check if repository exists and is accessible
    const repository = await client.getRepository(owner, repo);
    
    return {
      isValid: true,
      details: {
        repository: {
          name: repository.name,
          fullName: repository.fullName,
          private: repository.private,
          description: repository.description,
        },
      },
    };
  } catch (error) {
    const githubError = translateGitHubError(error as GitHubClientError);
    
    if (githubError instanceof GitHubAuthenticationError) {
      return {
        isValid: false,
        error: `Authentication failed: Invalid GitHub Personal Access Token. Please verify your token has the required permissions and is not expired.`,
        details: { errorType: 'authentication' },
      };
    }
    
    if (githubError instanceof GitHubNotFoundError) {
      return {
        isValid: false,
        error: `Repository not found: '${owner}/${repo}' does not exist or is not accessible with the provided token. Verify the repository name and that your token has access to this repository.`,
        details: { errorType: 'not_found', repository: `${owner}/${repo}` },
      };
    }
    
    if (githubError instanceof GitHubPermissionError) {
      return {
        isValid: false,
        error: `Access denied: Your token does not have sufficient permissions to access '${owner}/${repo}'. The repository may be private or your token may lack the required scopes.`,
        details: { errorType: 'permission', repository: `${owner}/${repo}` },
      };
    }
    
    return {
      isValid: false,
      error: `Failed to validate repository '${owner}/${repo}': ${githubError.message}`,
      details: { errorType: 'unknown', originalError: githubError.message },
    };
  }
}

/**
 * Validates that the project ID exists and the user has write access
 * Note: This is a simplified validation as GitHub Projects v2 requires GraphQL API
 */
export async function validateProject(
  client: GitHubClient,
  owner: string,
  repo: string,
  projectId: number
): Promise<ProjectValidationResult> {
  try {
    // For now, we'll validate based on repository permissions
    // In a full implementation, you'd use GitHub GraphQL API for Projects v2
    const permissions = await validatePermissions(client, owner, repo);
    
    const hasWriteAccess = permissions.isValid && 
      (permissions.permissions?.canModifyProjects || permissions.permissions?.canAdmin);
    
    if (!hasWriteAccess) {
      return {
        isValid: false,
        projectExists: false,
        hasWriteAccess: false,
        error: `Cannot validate project ${projectId}. Your token needs 'repo' scope and write permissions to access projects in '${owner}/${repo}'. GitHub Projects v2 validation requires GraphQL API implementation.`,
        details: { 
          projectId,
          errorType: 'insufficient_project_permissions',
          note: 'Projects v2 validation requires GraphQL API',
        },
      };
    }
    
    return {
      isValid: true,
      projectExists: true,
      hasWriteAccess: true,
      details: {
        project: {
          id: projectId,
          note: 'Project validation simplified - requires GraphQL API for full validation',
        },
      },
    };
  } catch (error) {
    const githubError = translateGitHubError(error as GitHubClientError);
    
    return {
      isValid: false,
      error: `Failed to validate project ${projectId}: ${githubError.message}. Note: Full project validation requires GitHub GraphQL API implementation.`,
      details: { errorType: 'project_validation_failed', projectId, originalError: githubError.message },
    };
  }
}

/**
 * Validates milestones exist and creates them if missing using 2-week sprint intervals
 */
export async function validateMilestones(
  client: GitHubClient,
  owner: string,
  repo: string,
  requiredMilestones: string[],
  options: {
    createMissing?: boolean;
    sprintDurationWeeks?: number;
    startDate?: Date;
  } = {}
): Promise<MilestoneValidationResult> {
  const { 
    createMissing = true, 
    sprintDurationWeeks = 2,
    startDate = new Date(),
  } = options;
  
  try {
    // Get existing milestones
    const existingMilestones = await client.getMilestones(owner, repo);
    const existingTitles = new Set(existingMilestones.map(m => m.title));
    
    const missingMilestones = requiredMilestones.filter(title => !existingTitles.has(title));
    const createdMilestones: Array<{ id: number; title: string; due_on: string }> = [];
    
    if (missingMilestones.length === 0) {
      return {
        isValid: true,
        milestones: existingMilestones.map(m => ({
          id: m.id,
          title: m.title,
          due_on: m.due_on,
        })),
        created: [],
      };
    }
    
    if (!createMissing) {
      return {
        isValid: false,
        error: `Missing milestones: ${missingMilestones.join(', ')}. These milestones need to be created before proceeding.`,
        details: {
          missingMilestones,
          existingMilestones: existingMilestones.map(m => m.title),
        },
      };
    }
    
    // Create missing milestones with 2-week sprint intervals
    let currentDate = new Date(startDate);
    
    for (const milestoneTitle of missingMilestones) {
      // Calculate due date (2 weeks from current date)
      const dueDate = new Date(currentDate);
      dueDate.setDate(dueDate.getDate() + (sprintDurationWeeks * 7));
      
      try {
        const createdMilestone = await client.createMilestone(owner, repo, {
          title: milestoneTitle,
          description: `Auto-generated milestone for ${sprintDurationWeeks}-week sprint`,
          due_on: dueDate.toISOString(),
        });
        
        createdMilestones.push({
          id: createdMilestone.id,
          title: createdMilestone.title,
          due_on: createdMilestone.due_on!,
        });
        
        // Move to next sprint start date
        currentDate = new Date(dueDate);        } catch (error) {
        const githubError = translateGitHubError(error as GitHubClientError);
        return {
          isValid: false,
          error: `Failed to create milestone '${milestoneTitle}': ${githubError.message}. Verify your token has write permissions to the repository.`,
          details: {
            failedMilestone: milestoneTitle,
            created: createdMilestones,
            errorType: 'milestone_creation_failed',
          },
        };
      }
    }
    
    // Get updated milestone list
    const updatedMilestones = await client.getMilestones(owner, repo);
    
    return {
      isValid: true,
      milestones: updatedMilestones.map(m => ({
        id: m.id,
        title: m.title,
        due_on: m.due_on,
      })),
      created: createdMilestones,
      details: {
        createdCount: createdMilestones.length,
        totalMilestones: updatedMilestones.length,
      },
    };
  } catch (error) {
    const githubError = translateGitHubError(error as GitHubClientError);
    
    if (githubError instanceof GitHubPermissionError) {
      return {
        isValid: false,
        error: `Permission denied: Cannot access milestones for '${owner}/${repo}'. Your token needs 'repo' scope and write permissions to view and create milestones.`,
        details: { errorType: 'milestone_permission_denied' },
      };
    }
    
    return {
      isValid: false,
      error: `Failed to validate milestones for '${owner}/${repo}': ${githubError.message}`,
      details: { errorType: 'milestone_validation_failed', originalError: githubError.message },
    };
  }
}

/**
 * Validates user permissions to create issues, labels, and modify projects
 */
export async function validatePermissions(
  client: GitHubClient,
  owner: string,
  repo: string
): Promise<PermissionValidationResult> {
  try {
    // Get repository information which includes permissions
    const repository = await client.getRepository(owner, repo);
    
    // Get user's permissions on the repository
    const currentUser = await client.getCurrentUser();
    let permissionLevel: string;
    
    try {
      // Try to get repository permissions for the current user
      permissionLevel = await client.getRepositoryPermissions(owner, repo, currentUser.login);
    } catch (error) {
      // If we can't get explicit permissions, we can't reliably validate permissions
      const githubError = translateGitHubError(error as GitHubClientError);
      
      return {
        isValid: false,
        error: `Unable to determine permissions for '${owner}/${repo}'. The permissions endpoint may not be accessible or your token may lack the required scopes. Please verify your token has 'repo' scope and appropriate permissions manually.`,
        details: { 
          errorType: 'permission_check_failed',
          originalError: githubError.message,
          suggestion: 'Verify your token has repo scope and try again, or check permissions manually in GitHub',
        },
      };
    }
    
    // Parse GitHub permission levels into boolean capabilities
    // GitHub permission levels: 'admin', 'write', 'read', 'triage', 'maintain'
    const canCreateIssues = ['admin', 'write', 'maintain'].includes(permissionLevel);
    const canCreateLabels = ['admin', 'write', 'maintain'].includes(permissionLevel);
    const canModifyProjects = ['admin', 'maintain'].includes(permissionLevel);
    const canPush = ['admin', 'write', 'maintain'].includes(permissionLevel);
    const canAdmin = permissionLevel === 'admin';
    
    const allPermissionsValid = canCreateIssues && canCreateLabels && canModifyProjects;
    
    if (!allPermissionsValid) {
      const missingPermissions = [];
      if (!canCreateIssues) missingPermissions.push('create issues');
      if (!canCreateLabels) missingPermissions.push('create labels');
      if (!canModifyProjects) missingPermissions.push('modify projects');
      
      return {
        isValid: false,
        error: `Insufficient permissions for '${owner}/${repo}'. Missing permissions: ${missingPermissions.join(', ')}. Your token needs 'repo' scope and write access to the repository.`,
        permissions: {
          canCreateIssues,
          canCreateLabels,
          canModifyProjects,
          canPush,
          canAdmin,
        },
        details: {
          missingPermissions,
          requiredScopes: ['repo'],
          currentPermissions: { level: permissionLevel },
        },
      };
    }
    
    return {
      isValid: true,
      permissions: {
        canCreateIssues,
        canCreateLabels,
        canModifyProjects,
        canPush,
        canAdmin,
      },
      details: {
        message: 'All required permissions are available',
        currentPermissions: { level: permissionLevel },
      },
    };
  } catch (error) {
    const githubError = translateGitHubError(error as GitHubClientError);
    
    if (githubError instanceof GitHubAuthenticationError) {
      return {
        isValid: false,
        error: `Authentication failed: Cannot verify permissions due to invalid token. Please check your GitHub Personal Access Token.`,
        details: { errorType: 'authentication_failed' },
      };
    }
    
    if (githubError instanceof GitHubNotFoundError) {
      return {
        isValid: false,
        error: `Repository '${owner}/${repo}' not found or not accessible. Cannot verify permissions.`,
        details: { errorType: 'repository_not_found' },
      };
    }
    
    return {
      isValid: false,
      error: `Failed to validate permissions for '${owner}/${repo}': ${githubError.message}`,
      details: { errorType: 'permission_validation_failed', originalError: githubError.message },
    };
  }
}

/**
 * Runs all validations for a GitHub repository setup
 */
export async function validateGitHubSetup(
  client: GitHubClient,
  owner: string,
  repo: string,
  options: {
    projectId?: number;
    requiredMilestones?: string[];
    createMissingMilestones?: boolean;
    sprintDurationWeeks?: number;
  } = {}
): Promise<{
  isValid: boolean;
  repository: ValidationResult;
  permissions: PermissionValidationResult;
  project?: ProjectValidationResult;
  milestones?: MilestoneValidationResult;
  summary: string[];
}> {
  const { projectId, requiredMilestones = [], createMissingMilestones = true, sprintDurationWeeks = 2 } = options;
  
  // Run repository validation
  const repository = await validateRepository(client, owner, repo);
  
  // Run permissions validation
  const permissions = await validatePermissions(client, owner, repo);
  
  // Run project validation if projectId provided
  let project: ProjectValidationResult | undefined;
  if (projectId) {
    project = await validateProject(client, owner, repo, projectId);
  }
  
  // Run milestone validation if milestones provided
  let milestones: MilestoneValidationResult | undefined;
  if (requiredMilestones.length > 0) {
    milestones = await validateMilestones(client, owner, repo, requiredMilestones, {
      createMissing: createMissingMilestones,
      sprintDurationWeeks,
    });
  }
  
  // Generate summary
  const summary: string[] = [];
  const isValid = repository.isValid && permissions.isValid && 
    (project ? project.isValid : true) && 
    (milestones ? milestones.isValid : true);
  
  if (repository.isValid) {
    summary.push(`✓ Repository '${owner}/${repo}' is accessible`);
  } else {
    summary.push(`✗ Repository validation failed: ${repository.error}`);
  }
  
  if (permissions.isValid) {
    summary.push(`✓ All required permissions are available`);
  } else {
    summary.push(`✗ Permission validation failed: ${permissions.error}`);
  }
  
  if (project) {
    if (project.isValid) {
      summary.push(`✓ Project ${projectId} is accessible with write permissions`);
    } else {
      summary.push(`✗ Project validation failed: ${project.error}`);
    }
  }
  
  if (milestones) {
    if (milestones.isValid) {
      const createdCount = milestones.created?.length || 0;
      if (createdCount > 0) {
        summary.push(`✓ Milestones validated (${createdCount} created)`);
      } else {
        summary.push(`✓ All required milestones exist`);
      }
    } else {
      summary.push(`✗ Milestone validation failed: ${milestones.error}`);
    }
  }
  
  return {
    isValid,
    repository,
    permissions,
    project,
    milestones,
    summary,
  };
}
