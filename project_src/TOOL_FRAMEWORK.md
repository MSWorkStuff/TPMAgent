# MCP Tools

This MCP server provides 4 tools for Technical Project Management and GitHub integration.

## Available Tools

### 1. analyze_project

**Description**: Analyzes a project description and generates a comprehensive project plan

**Parameters**:
- `projectDescription` (required): Description of the project to analyze
- `requirements` (required): Array of project requirements  
- `techStack` (optional): Array of preferred technology stack items

**Returns**: ProjectPlan with milestones, risks, dependencies, and tech stack

**Usage**:
```typescript
const result = await toolRegistry.execute('analyze_project', {
  projectDescription: 'E-commerce web application',
  requirements: ['User authentication', 'Payment processing', 'Product catalog'],
  techStack: ['React', 'Node.js', 'PostgreSQL']
});
```

### 2. generate_implementation_strategy

**Description**: Generates an implementation strategy based on a project plan

**Parameters**:
- `projectPlan` (required): Object with name, description, and optional techStack
- `timeline` (optional): Target timeline for the project
- `teamSize` (optional): Available team size number

**Returns**: ImplementationStrategy with phases, tasks, and resource requirements

**Usage**:
```typescript
const result = await toolRegistry.execute('generate_implementation_strategy', {
  projectPlan: {
    name: 'E-commerce App',
    description: 'Online store with payment integration',
    techStack: { frontend: ['React'], backend: ['Node.js'] }
  },
  timeline: '12 weeks',
  teamSize: 3
});
```

### 3. get_project_status

**Description**: Gets the current status and progress of a project  

**Parameters**:
- `projectId` (required): The ID of the project to get status for
- `includeDetails` (optional): Boolean to include detailed task information

**Returns**: Project status and progress information

**Usage**:
```typescript
const result = await toolRegistry.execute('get_project_status', {
  projectId: 'ecommerce-app-2024',
  includeDetails: true
});
```

### 4. create_github_issue

**Description**: Creates a GitHub issue with specified parameters. Automatically creates missing labels, assigns to milestone if provided, and adds to project if configured. Uses GitHub repository validation functions.

**Parameters**:
- `owner` (required): GitHub repository owner (username or organization)
- `repo` (required): GitHub repository name
- `title` (required): Issue title (minimum 1 character)
- `body` (required): Issue body/description
- `labels` (optional): Array of label names to assign to the issue
- `milestone` (optional): Milestone title to assign the issue to
- `assignees` (optional): Array of GitHub usernames to assign to the issue
- `projectId` (optional): Project ID to add the issue to (if configured)

**Returns**: Detailed result with created issue information, validation results, created labels, and any warnings

**Usage**:
```typescript
const result = await toolRegistry.execute('create_github_issue', {
  owner: 'myorg',
  repo: 'myproject',
  title: '🐛 Fix login validation bug',
  body: 'The login form doesn\'t validate email addresses properly.',
  labels: ['bug', 'frontend', 'high-priority'],
  milestone: 'Sprint 3 - Bug Fixes',
  assignees: ['developer1', 'developer2']
});
```

## Framework

All tools use:
- **ZodTool base class** for automatic parameter validation
- **TypeScript types** for input/output safety
- **Comprehensive error handling** with specific error types
- **MCP protocol integration** for seamless client communication

## Configuration

Tools are automatically registered in `src/tools/index.ts` and use the existing GitHub client configuration for API access.
