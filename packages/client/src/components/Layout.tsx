import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useUIStore } from "../store/useUIStore";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { sidebarOpen, toggleSidebar, toggleDarkMode } = useUIStore();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link to="/" className="text-lg font-bold hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Jotted
          </Link>
        </div>

        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Notes
          </Link>
          <Link to="/search" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Search
          </Link>
          <Link to="/graph" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Graph
          </Link>
          <Link to="/tags" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Tags
          </Link>
          <button
            onClick={toggleDarkMode}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Toggle dark mode"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>
        </nav>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
