import { toolRegistry } from './registry';
import { 
  ProjectAnalysisTool, 
  ImplementationStrategyTool, 
  ProjectStatusTool 
} from './project-tools-new';
import { CreateGitHubIssueTool } from './github-tools';

/**
 * Initialize and register all tools
 */
export function initializeTools(): void {
  // Register all available tools
  toolRegistry.register(new ProjectAnalysisTool());
  toolRegistry.register(new ImplementationStrategyTool());
  toolRegistry.register(new ProjectStatusTool());
  toolRegistry.register(new CreateGitHubIssueTool());
}

/**
 * Get the global tool registry
 */
export function getToolRegistry() {
  return toolRegistry;
}

// Export the tools for direct use if needed
export { ProjectAnalysisTool, ImplementationStrategyTool, ProjectStatusTool } from './project-tools-new';
export { CreateGitHubIssueTool } from './github-tools';

// Export the registry and related classes
export { toolRegistry, ToolRegistry, ToolExecutionError, ToolNotFoundError } from './registry';

// Export the handlers
export { handleListTools, handleCallTool, getToolRegistryStats } from './handlers';

// Export the base tool classes
export { BaseTool, ZodTool } from './base-tool';
