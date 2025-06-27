#!/usr/bin/env node

/**
 * Example script demonstrating the create_github_issue MCP tool
 * Usage: node examples/create-github-issue-example.js
 */

import { CreateGitHubIssueTool } from '../src/tools/github-tools';

async function main() {
  try {
    // Create the tool instance
    const createIssueTool = new CreateGitHubIssueTool();
    
    console.log('🚀 GitHub Issue Creation Tool Example');
    console.log('=====================================');
    console.log('');
    
    // Example parameters - replace with your repository details
    const issueParams = {
      owner: 'your-username',        // Replace with your GitHub username
      repo: 'your-repository',       // Replace with your repository name
      title: '🎯 New Feature Request: Enhanced User Dashboard',
      body: `## Description
This issue requests the implementation of an enhanced user dashboard with the following features:

### Requirements
- [ ] Real-time data visualization
- [ ] Customizable widgets
- [ ] Export functionality
- [ ] Mobile-responsive design

### Acceptance Criteria
1. Dashboard loads within 2 seconds
2. All widgets are draggable and resizable
3. Data updates in real-time
4. Export supports PDF and Excel formats

### Additional Context
This feature was requested by multiple users in our recent survey. Priority: High

**Created automatically using TPM Agent MCP Tool**`,
      labels: [
        'enhancement',
        'frontend',
        'high-priority',
        'user-experience'
      ],
      milestone: 'Sprint 2 - Development',  // Will be assigned if milestone exists
      assignees: [
        // 'developer-username'  // Add GitHub usernames to assign
      ],
      projectId: 123  // Optional: Add to project if you have one configured
    };

    console.log('📝 Creating GitHub issue with the following parameters:');
    console.log(`   Repository: ${issueParams.owner}/${issueParams.repo}`);
    console.log(`   Title: ${issueParams.title}`);
    console.log(`   Labels: ${issueParams.labels.join(', ')}`);
    console.log(`   Milestone: ${issueParams.milestone}`);
    console.log('');

    // Execute the tool
    console.log('⚡ Executing create_github_issue tool...');
    const result = await createIssueTool.execute(issueParams);
    
    // Display results
    console.log('📊 Results:');
    console.log('===========');
    
    if (result.success && result.issue) {
      console.log('✅ Issue created successfully!');
      console.log('');
      console.log('📄 Issue Details:');
      console.log(`   • Number: #${result.issue.number}`);
      console.log(`   • Title: ${result.issue.title}`);
      console.log(`   • URL: ${result.issue.url}`);
      console.log(`   • State: ${result.issue.state}`);
      
      if (result.issue.labels && result.issue.labels.length > 0) {
        console.log(`   • Labels: ${result.issue.labels.map(l => l.name).join(', ')}`);
      }
      
      if (result.issue.milestone) {
        console.log(`   • Milestone: ${result.issue.milestone.title}`);
      }
      
      if (result.issue.assignees && result.issue.assignees.length > 0) {
        console.log(`   • Assignees: ${result.issue.assignees.map(a => a.login).join(', ')}`);
      }

      // Show created labels
      if (result.createdLabels && result.createdLabels.length > 0) {
        console.log('');
        console.log('🏷️  Created New Labels:');
        result.createdLabels.forEach(label => {
          console.log(`   • ${label.name} (#${label.color})`);
        });
      }

      // Show validation results
      if (result.validationResults?.repository) {
        console.log('');
        console.log('🔍 Repository Validation:');
        console.log(`   • Status: ${result.validationResults.repository.isValid ? '✅ Valid' : '❌ Invalid'}`);
        if (result.validationResults.repository.details?.repository) {
          const repo = result.validationResults.repository.details.repository;
          console.log(`   • Repository: ${repo.fullName}`);
          console.log(`   • Private: ${repo.private ? 'Yes' : 'No'}`);
          if (repo.description) {
            console.log(`   • Description: ${repo.description}`);
          }
        }
      }

      // Show warnings
      if (result.warnings && result.warnings.length > 0) {
        console.log('');
        console.log('⚠️  Warnings:');
        result.warnings.forEach(warning => {
          console.log(`   • ${warning}`);
        });
      }
      
    } else {
      console.log('❌ Failed to create issue');
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.validationResults?.repository && !result.validationResults.repository.isValid) {
        console.log('');
        console.log('🔍 Repository Validation Failed:');
        console.log(`   Error: ${result.validationResults.repository.error}`);
      }
    }

    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. Update the repository owner and name in this example');
    console.log('   2. Ensure your GitHub Personal Access Token is configured');
    console.log('   3. Make sure your token has "repo" scope');
    console.log('   4. Verify the milestone exists if you specified one');
    console.log('   5. Check that assignee usernames are valid GitHub users');
    
  } catch (error) {
    console.error('❌ Example execution failed:', error instanceof Error ? error.message : String(error));
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   • Verify your GitHub token is set in environment variables');
    console.log('   • Check that github-client.config.yaml exists and is properly configured');
    console.log('   • Ensure the repository exists and you have write access');
    console.log('   • Verify network connectivity to GitHub API');
    process.exit(1);
  }
}

// Run example if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as createGitHubIssueExample };
