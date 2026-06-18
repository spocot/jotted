import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGetGraphQuery, useGetGraphSubQuery, useLazyGetGraphQuery } from "../store/redux/api";
import type { GraphData, GraphNode, Link } from "../types";
import GraphView from "../components/GraphView";
import { SkeletonBlock } from "../components/Skeleton";

const PAGE_SIZE = 200;

export default function GraphPage() {
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const noteId = searchParams.get("note") || null;
  const navigate = useNavigate();

  // Global graph with pagination
  const [accumulatedNodes, setAccumulatedNodes] = useState<GraphNode[]>([]);
  const [accumulatedLinks, setAccumulatedLinks] = useState<Link[]>([]);
  const [graphOffset, setGraphOffset] = useState(0);
  const [graphHasMore, setGraphHasMore] = useState(false);
  const [graphTotal, setGraphTotal] = useState(0);
  const [initialGraphLoaded, setInitialGraphLoaded] = useState(false);
  const [trigger] = useLazyGetGraphQuery();

  const { data: globalData, isLoading: globalLoading } = useGetGraphQuery(
    { limit: PAGE_SIZE, offset: 0 },
    { skip: !!noteId || initialGraphLoaded },
  );

  // Initialize from first query
  if (globalData && !initialGraphLoaded && !noteId) {
    setAccumulatedNodes(globalData.nodes);
    setAccumulatedLinks(globalData.links);
    setGraphHasMore(globalData.hasMore ?? false);
    setGraphTotal(globalData.total ?? globalData.nodes.length);
    setGraphOffset(PAGE_SIZE);
    setInitialGraphLoaded(true);
  }

  const { data: subData, isLoading: subLoading } = useGetGraphSubQuery(
    noteId ?? "",
    { skip: !noteId },
  );

  const data: GraphData | undefined = noteId
    ? subData
    : accumulatedNodes.length > 0
      ? { nodes: accumulatedNodes, links: accumulatedLinks }
      : undefined;

  const loading = noteId ? subLoading : globalLoading;

  const loadMoreGraph = useCallback(async () => {
    if (!graphHasMore || noteId) return;
    const result = await trigger({ limit: PAGE_SIZE, offset: graphOffset });
    if (result.data) {
      setAccumulatedNodes((prev) => [...prev, ...result.data!.nodes]);
      setAccumulatedLinks((prev) => [...prev, ...result.data!.links]);
      setGraphHasMore(result.data.hasMore ?? false);
      setGraphOffset((prev) => prev + PAGE_SIZE);
    }
  }, [graphHasMore, graphOffset, noteId, trigger]);

  const handleViewGlobal = () => {
    setSearchParams({});
    setAccumulatedNodes([]);
    setAccumulatedLinks([]);
    setGraphOffset(0);
    setGraphHasMore(false);
    setInitialGraphLoaded(false);
  };

  if (loading && !data) {
    return (
      <div className="max-w-6xl mx-auto">
        <SkeletonBlock className="h-8 w-48 mb-4" />
        <SkeletonBlock className="h-[60vh] w-full" />
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

  const loadedCount = accumulatedNodes.length || data.nodes.length;

  return (
    <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-2xl font-bold">
          Graph View
          <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">
            {data.nodes.length} nodes · {data.links.length} links
            {graphTotal > loadedCount && ` (${loadedCount}/${graphTotal} loaded)`}
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
          {graphHasMore && !noteId && (
            <button
              onClick={loadMoreGraph}
              className="px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
            >
              Load More
            </button>
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
