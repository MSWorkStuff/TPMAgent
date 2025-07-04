'use client'

import { useState } from "react";
import Chat from "./chat";
import Repo from "./repo";

export default function Home() {
  const [currentView, setCurrentView] = useState<'repo' | 'chat'>('repo');

  return (
    <div className="h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
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
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'repo' && <Repo />}
        {currentView === 'chat' && <Chat />}
      </div>
    </div>
  );
}
