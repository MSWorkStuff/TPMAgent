// Common types for TPM Agent MCP Server

export interface ProjectPlan {
  name: string;
  description: string;
  milestones: Milestone[];
  risks: Risk[];
  dependencies: Dependency[];
  techStack: TechStack;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'blocked';
  dependencies: string[];
}

export interface Risk {
  id: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  probability: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface Dependency {
  id: string;
  name: string;
  type: 'internal' | 'external' | 'resource' | 'technical';
  description: string;
  status: 'available' | 'pending' | 'blocked';
}

export interface TechStack {
  frontend?: string[];
  backend?: string[];
  database?: string[];
  infrastructure?: string[];
  tools?: string[];
}

export interface ImplementationStrategy {
  projectId: string;
  phases: Phase[];
  estimatedDuration: string;
  resourceRequirements: ResourceRequirement[];
}

export interface Phase {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  estimatedDuration: string;
  dependencies: string[];
}

export interface Task {
  id: string;
  name: string;
  description: string;
  assignee?: string;
  estimatedHours: number;
  status: 'todo' | 'in-progress' | 'review' | 'done';
}

export interface ResourceRequirement {
  type: 'developer' | 'designer' | 'qa' | 'devops' | 'other';
  role: string;
  skillsRequired: string[];
  hoursRequired: number;
}

// MCP Tool Framework Types
export interface ToolSchema {
  type: 'object';
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema?: ToolSchema;
}

export interface ToolResult<T = any> {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface Tool<TInput = any, TOutput = any> {
  /**
   * Get the name of the tool
   */
  getName(): string;

  /**
   * Get the description of the tool
   */
  getDescription(): string;

  /**
   * Get the input schema for the tool
   */
  getInputSchema?(): ToolSchema;

  /**
   * Execute the tool with the given parameters
   */
  execute(params: TInput): Promise<TOutput>;
}

export interface ToolExecutionContext {
  toolName: string;
  requestId?: string;
  timestamp: Date;
}
