'use client'

import { useSession, signIn, signOut } from "next-auth/react"
import { useState } from "react"
import Image from "next/image"

export default function Repo() {
  const { data: session, status } = useSession()
  const [mcpResponse, setMcpResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testMCP = async () => {
    if (!session) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list"
        })
      })
      
      const data = await response.json()
      setMcpResponse(data)
    } catch (error) {
      console.error('MCP request failed:', error)
    } finally {
      setLoading(false)
    }
  }

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
    <div className="p-6 max-w-4xl mx-auto">
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
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            GitHub MCP Server Test
          </h2>
          
          <button
            onClick={testMCP}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Testing...' : 'Test MCP Connection'}
          </button>
          
          {mcpResponse && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                MCP Response:
              </h3>
              <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded text-xs overflow-auto max-h-96 text-gray-800 dark:text-gray-200">
                {JSON.stringify(mcpResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
