'use client'

import { useSession, signIn, signOut } from "next-auth/react"
import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useRepository } from "./context/repository"
import { useToast } from './utils/toast'
import { logger } from '@/lib/logger'

interface Repository {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  html_url: string
  updated_at: string
  language: string | null
  stargazers_count: number
  forks_count: number
}

export default function Repo() {
  const { data: session, status } = useSession()
  const { selectedRepository, setSelectedRepository } = useRepository()
  const { showToast } = useToast()
  // removed MCP test loading state
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [reposLoading, setReposLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Simple hash function to generate consistent colors for languages
  const getLanguageColor = (language: string) => {
    let hash = 0
    for (let i = 0; i < language.length; i++) {
      hash = language.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 
      'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
      'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-rose-500'
    ]
    
    return colors[Math.abs(hash) % colors.length]
  }


  const fetchRepositories = useCallback(async () => {
    if (!session) return
    
    setReposLoading(true)
    try {
      const response = await fetch('/api/repos')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.status}`)
      }
      
      const repos = await response.json()
      setRepositories(repos)
    } catch (error) {
      logger.error('Failed to fetch repositories:', error)
    } finally {
      setReposLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (session) {
      fetchRepositories()
    }
  }, [session, fetchRepositories])

  const handleRepositorySelect = (repo: Repository) => {
    // Only show toast if we're actually changing the repository
    if (!selectedRepository || selectedRepository.id !== repo.id) {
      setSelectedRepository(repo)
      showToast(`Active repository set to: ${repo.full_name}`, 'success')
    }
  }

  const filteredRepositories = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            TPM Agent
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Connect with GitHub to get started
          </p>
        </div>
        
        <button
          onClick={() => signIn("github")}
          className="flex items-center gap-3 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
        >
          <Image
            src="/github.svg"
            alt="GitHub logo"
            width={20}
            height={20}
            className="w-5 h-5"
          />
          Sign in with GitHub
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            TPM Agent
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connected as {session.user?.name || session.user?.email}
          </p>
        </div>
        
        <button
          onClick={() => signOut()}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-6 min-h-0">

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Repositories (Write Access)
            </h2>
            <button
              onClick={fetchRepositories}
              disabled={reposLoading}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors"
            >
              {reposLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          
          <div className="mb-4 shrink-0">
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex-1 min-h-0">
            {reposLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-600 dark:text-gray-400">Loading repositories...</div>
              </div>
            ) : repositories.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                No repositories with write access found
              </div>
            ) : filteredRepositories.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                No repositories match your search
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <div className="space-y-3">
                  {filteredRepositories.map((repo) => (
                    <div 
                      key={repo.id} 
                      className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                        selectedRepository?.id === repo.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600' : ''
                      }`}
                      onClick={() => handleRepositorySelect(repo)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <a
                              href={repo.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                            >
                              {repo.full_name}
                            </a>
                            {repo.private && (
                              <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                                Private
                              </span>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                              {repo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                            {repo.language && (
                              <span className="flex items-center gap-1">
                                <div className={`w-3 h-3 rounded-full ${getLanguageColor(repo.language)}`}></div>
                                {repo.language}
                              </span>
                            )}
                            <span>⭐ {repo.stargazers_count}</span>
                            <span>🍴 {repo.forks_count}</span>
                            <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
