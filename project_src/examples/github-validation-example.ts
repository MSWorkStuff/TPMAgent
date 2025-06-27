#!/usr/bin/env node

/**
 * Example script demonstrating GitHub validation functions
 * Usage: node examples/github-validation-example.js
 */

import { GitHubClient, validateGitHubSetup } from '../src/github';

async function main() {
  try {
    // Create GitHub client from config
    const client = GitHubClient.fromConfig();
    
    // Repository to validate
    const owner = 'your-username';
    const repo = 'your-repository';
    
    console.log(`🔍 Validating GitHub setup for ${owner}/${repo}...`);
    console.log('');
    
    // Run comprehensive validation
    const result = await validateGitHubSetup(client, owner, repo, {
      // Optional: Validate a specific project ID
      // projectId: 123,
      
      // Required milestones (will be created if missing)
      requiredMilestones: [
        'Sprint 1 - Planning',
        'Sprint 2 - Development',
        'Sprint 3 - Testing',
        'Sprint 4 - Deployment',
      ],
      
      // Options
      createMissingMilestones: true,
      sprintDurationWeeks: 2,
    });
    
    // Display results
    console.log('📋 Validation Results:');
    console.log('=====================');
    
    result.summary.forEach(line => {
      console.log(line);
    });
    
    console.log('');
    
    if (result.isValid) {
      console.log('✅ All validations passed! Your GitHub setup is ready.');
      
      // Show details
      if (result.milestones?.created && result.milestones.created.length > 0) {
        console.log('');
        console.log('📅 Created Milestones:');
        result.milestones.created.forEach(milestone => {
          console.log(`   • ${milestone.title} (due: ${milestone.due_on})`);
        });
      }
      
      if (result.permissions.permissions) {
        console.log('');
        console.log('🔐 Available Permissions:');
        const perms = result.permissions.permissions;
        console.log(`   • Create Issues: ${perms.canCreateIssues ? '✓' : '✗'}`);
        console.log(`   • Create Labels: ${perms.canCreateLabels ? '✓' : '✗'}`);
        console.log(`   • Modify Projects: ${perms.canModifyProjects ? '✓' : '✗'}`);
        console.log(`   • Push Code: ${perms.canPush ? '✓' : '✗'}`);
        console.log(`   • Admin Access: ${perms.canAdmin ? '✓' : '✗'}`);
      }
    } else {
      console.log('❌ Validation failed. Please address the issues above.');
      console.log('');
      console.log('💡 Common solutions:');
      console.log('   • Verify your GitHub Personal Access Token in .env');
      console.log('   • Ensure your token has "repo" scope');
      console.log('   • Check that the repository name is correct');
      console.log('   • Verify you have write access to the repository');
    }
    
  } catch (error) {
    console.error('❌ Validation failed with error:', error.message);
    process.exit(1);
  }
}

// Run example if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as validateGitHubExample };
