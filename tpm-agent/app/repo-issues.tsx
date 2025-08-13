'use client'

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRepository } from "./context/repository"
import Image from "next/image"
import { fetchIssues as fetchIssuesFromApi, type Issue } from "@/lib/issues-client"


export default function RepoIssues() {
  const { data: session } = useSession()
  const { selectedRepository } = useRepository()
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(false)

const fetchIssues = useCallback(async () => {
    if (!selectedRepository || !session) return
    
    setLoading(true)
    try {
      const [owner, repo] = selectedRepository.full_name.split("/");
      const issuesData = await fetchIssuesFromApi(owner, repo)
      setIssues(issuesData)
    } catch (error) {
      console.error('Failed to fetch issues:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedRepository, session])

  useEffect(() => {
    if (selectedRepository && session) {
      fetchIssues()
    }
  }, [selectedRepository, session, fetchIssues])

  if (!selectedRepository) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg text-gray-600 dark:text-gray-400 text-center">
          Please select a repository to see a list of the issues.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Issues for {selectedRepository.full_name}
        </h1>
        <button
          onClick={fetchIssues}
          disabled={loading}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-600 dark:text-gray-400">Loading issues...</div>
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No issues found for this repository
        </div>
      ) : (
        <div className="space-y-4 flex-1 overflow-y-auto">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <a
                      href={issue.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                    >
                      #{issue.number} {issue.title}
                    </a>
                    <span className={`px-2 py-1 text-xs rounded ${
                      issue.state === 'open' 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                        : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                    }`}>
                      {issue.state}
                    </span>
                  </div>
                  
                  {issue.body && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-3">
                      {issue.body}
                    </p>
                  )}
                  
                  {issue.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {issue.labels.map((label) => (
                        <span
                          key={label.name}
                          className="px-2 py-1 text-xs rounded"
                          style={{ backgroundColor: `#${label.color}20`, color: `#${label.color}` }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                    <div className="flex items-center gap-1">
                    <Image 
                        src={issue.user.avatar_url} 
                        alt={issue.user.login}
                        width={16}
                        height={16}
                        className="w-4 h-4 rounded-full"
                      />
                      <span>{issue.user.login}</span>
                    </div>
                    <span>Created {new Date(issue.created_at).toLocaleDateString()}</span>
                    <span>Updated {new Date(issue.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
