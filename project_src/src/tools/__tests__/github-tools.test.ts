import { CreateGitHubIssueTool, CreateGitHubIssueResult } from '../github-tools';

describe('CreateGitHubIssueTool', () => {
  let tool: CreateGitHubIssueTool;

  beforeEach(() => {
    tool = new CreateGitHubIssueTool();
  });

  describe('schema validation', () => {
    it('should validate required fields', () => {
      expect(() => {
        tool.validate({});
      }).toThrow('Required');
    });

    it('should require owner, repo, title, and body', () => {
      expect(() => {
        tool.validate({
          owner: 'test-owner',
          repo: 'test-repo',
          title: 'Test Issue',
          // missing body
        });
      }).toThrow();
    });

    it('should accept valid input with required fields only', () => {
      const validInput = {
        owner: 'test-owner',
        repo: 'test-repo',
        title: 'Test Issue',
        body: 'This is a test issue description',
      };

      expect(() => {
        tool.validate(validInput);
      }).not.toThrow();
    });

    it('should accept valid input with all optional fields', () => {
      const validInput = {
        owner: 'test-owner',
        repo: 'test-repo',
        title: 'Test Issue',
        body: 'This is a test issue description',
        labels: ['bug', 'enhancement'],
        milestone: 'Sprint 1',
        assignees: ['developer1', 'developer2'],
        projectId: 123,
      };

      expect(() => {
        tool.validate(validInput);
      }).not.toThrow();
    });

    it('should reject empty title', () => {
      expect(() => {
        tool.validate({
          owner: 'test-owner',
          repo: 'test-repo',
          title: '',
          body: 'This is a test issue description',
        });
      }).toThrow();
    });

    it('should validate array types', () => {
      expect(() => {
        tool.validate({
          owner: 'test-owner',
          repo: 'test-repo',
          title: 'Test Issue',
          body: 'This is a test issue description',
          labels: 'not-an-array',
        });
      }).toThrow();
    });
  });

  describe('tool metadata', () => {
    it('should have correct name', () => {
      expect(tool.getName()).toBe('create_github_issue');
    });

    it('should have description', () => {
      expect(tool.getDescription()).toContain('Creates a GitHub issue');
    });

    it('should have input schema', () => {
      const schema = tool.getInputSchema?.();
      expect(schema).toBeDefined();
      expect(schema?.type).toBe('object');
      expect(schema?.properties).toBeDefined();
    });
  });

  // Note: Integration tests would require a real GitHub token and repository
  // These would be better placed in a separate integration test file
});
