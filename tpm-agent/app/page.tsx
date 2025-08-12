'use client'

import { useEffect, useState } from "react";
import Chat from "./chat";
import Repo from "./repo";
import RepoIssues from "./repo-issues";
import { useRepository } from "./context/repository";

export default function Home() {
  const [currentView, setCurrentView] = useState<'repo' | 'chat' | 'repo-issues'>('repo');
  const { selectedRepository } = useRepository();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentView('repo')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'repo'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Repo
            </button>
            <button
              onClick={() => setCurrentView('repo-issues')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'repo-issues'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Repo Issues
            </button>
            <button
              onClick={() => setCurrentView('chat')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'chat'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Chat
            </button>
          </div>
          {mounted && selectedRepository && (
            <a
              href={selectedRepository.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors cursor-pointer"
            >
              Active repository: {selectedRepository.full_name}
            </a>
          )}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'repo' && <Repo />}
        {currentView === 'repo-issues' && <RepoIssues />}
        {currentView === 'chat' && <Chat />}
      </div>
    </div>
  );
}
