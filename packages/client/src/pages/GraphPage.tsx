import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { GraphData } from "../types";

export default function GraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getGraph()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-400 dark:text-gray-500">Loading graph...</div>;
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 dark:text-gray-500">
        No notes to display in the graph.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">
        Graph View
        <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">
          {data.nodes.length} nodes · {data.links.length} links
        </span>
      </h2>

      <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6 bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-wrap gap-2">
          {data.nodes.map((node) => {
            const linkCount = data.links.filter(
              (l) => l.sourceId === node.id || l.targetId === node.id,
            ).length;
            return (
              <button
                key={node.id}
                onClick={() => navigate(`/note/${node.id}`)}
                className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
                title={`${linkCount} connection${linkCount !== 1 ? "s" : ""}`}
              >
                {node.title || "Untitled"}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-gray-400 dark:text-gray-500 mt-4 text-center">
        D3.js graph visualization will replace this view in a later phase.
      </p>
    </div>
  );
}
