import { analyzeProject, generateImplementationStrategy, readExistingTools, ProjectAnalysisSchema, ImplementationStrategySchema } from '../project-tools';

describe('Project Tools', () => {
  describe('analyzeProject', () => {
    it('should generate a project plan with required fields', async () => {
      const input = {
        projectDescription: 'Build a todo app',
        requirements: ['User auth', 'CRUD operations'],
        techStack: ['React', 'Node.js']
      };

      const result = await analyzeProject(input);

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description', input.projectDescription);
      expect(result).toHaveProperty('milestones');
      expect(result).toHaveProperty('risks');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('techStack');
      expect(Array.isArray(result.milestones)).toBe(true);
      expect(Array.isArray(result.risks)).toBe(true);
    });

    it('should categorize tech stack correctly', async () => {
      const input = {
        projectDescription: 'Web application',
        requirements: ['Feature 1'],
        techStack: ['React', 'Angular', 'Node.js', 'Python', 'Java']
      };

      const result = await analyzeProject(input);

      expect(result.techStack.frontend).toContain('React');
      expect(result.techStack.frontend).toContain('Angular');
      expect(result.techStack.backend).toContain('Node.js');
      expect(result.techStack.backend).toContain('Python');
      expect(result.techStack.backend).toContain('Java');
    });

    it('should handle missing optional techStack', async () => {
      const input = {
        projectDescription: 'Simple project',
        requirements: ['Basic feature']
      };

      const result = await analyzeProject(input);

      expect(result.techStack.frontend).toEqual([]);
      expect(result.techStack.backend).toEqual([]);
    });
  });

  describe('generateImplementationStrategy', () => {
    it('should generate implementation strategy with phases', async () => {
      const input = {
        projectPlan: {
          name: 'Test Project',
          description: 'A test project'
        },
        timeline: '8 weeks',
        teamSize: 3
      };

      const result = await generateImplementationStrategy(input);

      expect(result).toHaveProperty('projectId');
      expect(result).toHaveProperty('phases');
      expect(result).toHaveProperty('estimatedDuration', input.timeline);
      expect(result).toHaveProperty('resourceRequirements');
      expect(Array.isArray(result.phases)).toBe(true);
      expect(result.phases.length).toBeGreaterThan(0);
    });

    it('should generate project ID from name', async () => {
      const input = {
        projectPlan: {
          name: 'My Test Project',
          description: 'A test project'
        }
      };

      const result = await generateImplementationStrategy(input);

      expect(result.projectId).toBe('my-test-project');
    });

    it('should use default timeline when not provided', async () => {
      const input = {
        projectPlan: {
          name: 'Test Project',
          description: 'A test project'
        }
      };

      const result = await generateImplementationStrategy(input);

      expect(result.estimatedDuration).toBe('4-6 weeks');
    });
  });

  describe('readExistingTools', () => {
    it('should return array of MCP tools', async () => {
      const tools = await readExistingTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool).toHaveProperty('handler');
        expect(typeof tool.handler).toBe('function');
      });
    });

    it('should include analyze_project tool', async () => {
      const tools = await readExistingTools();
      const analyzeTool = tools.find(t => t.name === 'analyze_project');

      expect(analyzeTool).toBeDefined();
      expect(analyzeTool?.description).toContain('project plan');
      expect(analyzeTool?.inputSchema?.properties).toHaveProperty('projectDescription');
    });

    it('should include generate_implementation_strategy tool', async () => {
      const tools = await readExistingTools();
      const strategyTool = tools.find(t => t.name === 'generate_implementation_strategy');

      expect(strategyTool).toBeDefined();
      expect(strategyTool?.description).toContain('implementation strategy');
      expect(strategyTool?.inputSchema?.properties).toHaveProperty('projectPlan');
    });
  });

  describe('schema validation', () => {
    it('should validate ProjectAnalysisSchema', () => {
      const validInput = {
        projectDescription: 'Test project',
        requirements: ['req1', 'req2'],
        techStack: ['React']
      };

      const result = ProjectAnalysisSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid ProjectAnalysisSchema', () => {
      const invalidInput = {
        projectDescription: 'Test project'
        // missing required 'requirements' field
      };

      const result = ProjectAnalysisSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate ImplementationStrategySchema', () => {
      const validInput = {
        projectPlan: {
          name: 'Test',
          description: 'Test project'
        },
        timeline: '4 weeks'
      };

      const result = ImplementationStrategySchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });
});
