import { 
  ProjectAnalysisTool, 
  ImplementationStrategyTool, 
  ProjectStatusTool 
} from '../project-tools-new';

describe('Project Tools', () => {
  describe('ProjectAnalysisTool', () => {
    let tool: ProjectAnalysisTool;

    beforeEach(() => {
      tool = new ProjectAnalysisTool();
    });

    it('should have correct metadata', () => {
      expect(tool.getName()).toBe('analyze_project');
      expect(tool.getDescription()).toBe('Analyzes a project description and generates a comprehensive project plan');
      
      const schema = tool.getInputSchema?.();
      expect(schema?.type).toBe('object');
      expect(schema?.properties).toHaveProperty('projectDescription');
      expect(schema?.properties).toHaveProperty('requirements');
      expect(schema?.properties).toHaveProperty('techStack');
      expect(schema?.required).toContain('projectDescription');
      expect(schema?.required).toContain('requirements');
    });

    it('should execute successfully with valid input', async () => {
      const params = {
        projectDescription: 'A web application for task management',
        requirements: ['User authentication', 'Task CRUD operations', 'Real-time updates'],
        techStack: ['React', 'Node.js', 'PostgreSQL'],
      };

      const result = await tool.execute(params);

      expect(result).toBeDefined();
      expect(result.name).toBe('Generated Project Plan');
      expect(result.description).toBe(params.projectDescription);
      expect(result.milestones).toHaveLength(3);
      expect(result.risks).toHaveLength(2);
      expect(result.dependencies).toHaveLength(1);
      expect(result.techStack).toBeDefined();
      expect(result.techStack.frontend).toContain('React');
      expect(result.techStack.backend).toContain('Node.js');
    });

    it('should handle optional techStack parameter', async () => {
      const params = {
        projectDescription: 'A simple web app',
        requirements: ['Basic functionality'],
      };

      const result = await tool.execute(params);

      expect(result).toBeDefined();
      expect(result.techStack.frontend).toEqual([]);
      expect(result.techStack.backend).toEqual([]);
    });

    it('should validate required parameters', async () => {
      await expect(
        tool.execute({
          requirements: ['Some requirement'],
          // Missing projectDescription
        } as any)
      ).rejects.toThrow();
    });
  });

  describe('ImplementationStrategyTool', () => {
    let tool: ImplementationStrategyTool;

    beforeEach(() => {
      tool = new ImplementationStrategyTool();
    });

    it('should have correct metadata', () => {
      expect(tool.getName()).toBe('generate_implementation_strategy');
      expect(tool.getDescription()).toBe('Generates an implementation strategy based on a project plan');
      
      const schema = tool.getInputSchema?.();
      expect(schema?.type).toBe('object');
      expect(schema?.properties).toHaveProperty('projectPlan');
      expect(schema?.properties).toHaveProperty('timeline');
      expect(schema?.properties).toHaveProperty('teamSize');
      expect(schema?.required).toContain('projectPlan');
    });

    it('should execute successfully with valid input', async () => {
      const params = {
        projectPlan: {
          name: 'Test Project',
          description: 'A test project for validation',
          techStack: {
            frontend: ['React'],
            backend: ['Node.js'],
          },
        },
        timeline: '8 weeks',
        teamSize: 3,
      };

      const result = await tool.execute(params);

      expect(result).toBeDefined();
      expect(result.projectId).toBe('test-project');
      expect(result.phases).toHaveLength(3);
      expect(result.estimatedDuration).toBe('8 weeks');
      expect(result.resourceRequirements).toHaveLength(3);
      
      // Check phases
      expect(result.phases[0].name).toBe('Planning & Setup');
      expect(result.phases[1].name).toBe('Core Development');
      expect(result.phases[2].name).toBe('Testing & Refinement');
      
      // Check tasks
      result.phases.forEach((phase: any) => {
        expect(phase.tasks.length).toBeGreaterThan(0);
        phase.tasks.forEach((task: any) => {
          expect(task.id).toBeDefined();
          expect(task.name).toBeDefined();
          expect(task.estimatedHours).toBeGreaterThan(0);
          expect(task.status).toBe('todo');
        });
      });
    });

    it('should handle optional parameters', async () => {
      const params = {
        projectPlan: {
          name: 'Minimal Project',
          description: 'A minimal project',
        },
      };

      const result = await tool.execute(params);

      expect(result).toBeDefined();
      expect(result.estimatedDuration).toBe('6-8 weeks'); // Default value
      expect(result.phases).toHaveLength(3);
      expect(result.resourceRequirements).toHaveLength(3);
    });

    it('should adjust resource requirements based on team size', async () => {
      const baseParams = {
        projectPlan: {
          name: 'Team Size Test',
          description: 'Testing team size adjustment',
        },
      };

      const result1 = await tool.execute({ ...baseParams, teamSize: 1 });
      const result2 = await tool.execute({ ...baseParams, teamSize: 4 });

      // With a larger team, individual resource requirements should be lower
      const totalHours1 = result1.resourceRequirements.reduce((sum: number, req: any) => sum + req.hoursRequired, 0);
      const totalHours2 = result2.resourceRequirements.reduce((sum: number, req: any) => sum + req.hoursRequired, 0);
      
      expect(totalHours2).toBeLessThan(totalHours1);
    });
  });

  describe('ProjectStatusTool', () => {
    let tool: ProjectStatusTool;

    beforeEach(() => {
      tool = new ProjectStatusTool();
    });

    it('should have correct metadata', () => {
      expect(tool.getName()).toBe('get_project_status');
      expect(tool.getDescription()).toBe('Gets the current status and progress of a project');
      
      const schema = tool.getInputSchema?.();
      expect(schema?.type).toBe('object');
      expect(schema?.properties).toHaveProperty('projectId');
      expect(schema?.properties).toHaveProperty('includeDetails');
      expect(schema?.required).toContain('projectId');
    });

    it('should execute successfully with basic parameters', async () => {
      const params = {
        projectId: 'test-project-123',
      };

      const result = await tool.execute(params);

      expect(result).toBeDefined();
      expect(result.projectId).toBe('test-project-123');
      expect(result.status).toBe('in-progress');
      expect(result.completionPercentage).toBe(45);
      expect(result.activeTasks).toBe(3);
      expect(result.completedTasks).toBe(5);
      expect(result.totalTasks).toBe(11);
      expect(result.details).toBeUndefined();
    });

    it('should include details when requested', async () => {
      const params = {
        projectId: 'test-project-456',
        includeDetails: true,
      };

      const result = await tool.execute(params);

      expect(result).toBeDefined();
      expect(result.details).toBeDefined();
      expect(result.details).toHaveProperty('currentPhase');
      expect(result.details).toHaveProperty('nextMilestone');
      expect(result.details).toHaveProperty('blockers');
      expect(result.details).toHaveProperty('recentCompletions');
      expect(result.details.currentPhase).toBe('Core Development');
      expect(Array.isArray(result.details.blockers)).toBe(true);
      expect(Array.isArray(result.details.recentCompletions)).toBe(true);
    });

    it('should validate required projectId parameter', async () => {
      await expect(
        tool.execute({
          includeDetails: true,
          // Missing projectId
        } as any)
      ).rejects.toThrow();
    });
  });
});
