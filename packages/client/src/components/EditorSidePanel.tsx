import { useState } from "react";
import { Link } from "react-router-dom";
import BacklinksPanel from "./BacklinksPanel";
import SubgraphView from "./SubgraphView";
import VersionHistoryPanel from "./VersionHistoryPanel";

type Tab = "connections" | "graph" | "history";

interface EditorSidePanelProps {
  noteId: string;
  noteTitle: string;
}

export default function EditorSidePanel({ noteId, noteTitle }: EditorSidePanelProps) {
  const [tab, setTab] = useState<Tab>("connections");

  return (
    <div className="w-72 shrink-0 border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 shrink-0">
        <button
          onClick={() => setTab("connections")}
          className={`flex-1 px-3 py-2 text-xs font-medium text-center transition-colors ${
            tab === "connections"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Connections
        </button>
        <button
          onClick={() => setTab("graph")}
          className={`flex-1 px-3 py-2 text-xs font-medium text-center transition-colors ${
            tab === "graph"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Graph
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 px-3 py-2 text-xs font-medium text-center transition-colors ${
            tab === "history"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-500"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          History
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "connections" && (
          <BacklinksPanel noteId={noteId} noteTitle={noteTitle} />
        )}
        {tab === "graph" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Local Graph
              </h3>
              <Link
                to={`/graph?note=${noteId}`}
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Open full graph
              </Link>
            </div>
            <SubgraphView noteId={noteId} />
          </div>
        )}
        {tab === "history" && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Version History
            </h3>
            <VersionHistoryPanel noteId={noteId} />
          </div>
        )}
      </div>
    </div>
  );
}
