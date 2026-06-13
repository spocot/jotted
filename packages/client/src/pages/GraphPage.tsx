import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { GraphData } from "../types";
import GraphView from "../components/GraphView";

export default function GraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const noteId = searchParams.get("note") || null;
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = noteId
        ? await api.getGraphSub(noteId)
        : await api.getGraph();
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewGlobal = () => {
    setSearchParams({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        Loading graph...
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Graph View</h2>
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800 rounded-lg">
          {noteId
            ? "This note has no connections yet."
            : "No notes to display in the graph."}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-2xl font-bold">
          Graph View
          <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">
            {data.nodes.length} nodes · {data.links.length} links
            {noteId ? " (subgraph)" : " (global)"}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {noteId && (
            <>
              <button
                onClick={() => navigate(`/note/${noteId}`)}
                className="px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
              >
                Open Note
              </button>
              <button
                onClick={handleViewGlobal}
                className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Global View
              </button>
            </>
          )}
        </div>
      </div>

      <GraphView
        data={data}
        filterTags={filterTags}
        onFilterTags={setFilterTags}
      />
    </div>
  );
}
