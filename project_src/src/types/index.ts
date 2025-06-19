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
