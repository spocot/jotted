import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as d3 from "d3";
import type { GraphData, GraphNode } from "../types";

const NODE_RADIUS = 8;
const CHARGE_STRENGTH = -300;
const LINK_DISTANCE = 100;

interface GraphViewProps {
  data: GraphData;
  selectedNodeId?: string | null;
  filterTags?: string[];
  onFilterTags?: (tags: string[]) => void;
}

const TAG_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

function getTagColor(tag: string, allTags: string[]): string {
  const idx = allTags.indexOf(tag);
  return TAG_COLORS[idx % TAG_COLORS.length];
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  fx: number | null;
  fy: number | null;
  vx: number;
  vy: number;
}

type SimLink = d3.SimulationLinkDatum<SimNode>;

export default function GraphView({
  data,
  selectedNodeId,
  filterTags,
  onFilterTags,
}: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

  const allTags = [...new Set(data.nodes.flatMap((n) => n.tags))].sort();

  const filteredNodes = filterTags?.length
    ? data.nodes.filter((n) =>
        n.tags.some((t) => filterTags.includes(t)),
      )
    : data.nodes;

  const filteredIds = new Set(filteredNodes.map((n) => n.id));

  const filteredLinks = data.links.filter(
    (l) => filteredIds.has(l.sourceId) && filteredIds.has(l.targetId),
  );

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      navigate(`/note/${nodeId}`);
    },
    [navigate],
  );

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Center view
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(width / 2, height / 2),
    );

    if (filteredNodes.length === 0) return;

    // Build simulation nodes
    const simNodes: SimNode[] = filteredNodes.map((n) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * width * 0.5,
      y: height / 2 + (Math.random() - 0.5) * height * 0.5,
      fx: null,
      fy: null,
      vx: 0,
      vy: 0,
    }));

    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = filteredLinks
      .map((l) => {
        const source = nodeMap.get(l.sourceId);
        const target = nodeMap.get(l.targetId);
        if (!source || !target) return null;
        return { source, target } as SimLink;
      })
      .filter((l): l is SimLink => l !== null);

    // Force simulation
    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, d3.SimulationLinkDatum<SimNode>>(simLinks)
          .id((d) => d.id)
          .distance(LINK_DISTANCE),
      )
      .force("charge", d3.forceManyBody().strength(CHARGE_STRENGTH))
      .force("center", d3.forceCenter(0, 0))
      .force("collision", d3.forceCollide(NODE_RADIUS * 2));

    simulationRef.current = simulation;

    // Links
    const link = g
      .append("g")
      .selectAll<SVGLineElement, SimLink>("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.5);

    // Nodes group
    const node = g
      .append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    // Node circle
    node
      .append("circle")
      .attr("r", NODE_RADIUS)
      .attr("fill", (d) => {
        if (d.id === selectedNodeId) return "#3b82f6";
        if (d.tags.length > 0) {
          return getTagColor(d.tags[0], allTags);
        }
        return "#64748b";
      })
      .attr("stroke", (d) =>
        d.id === selectedNodeId ? "#1d4ed8" : "none",
      )
      .attr("stroke-width", 2);

    // Node label
    node
      .append("text")
      .text((d) => d.title || "Untitled")
      .attr("dy", NODE_RADIUS + 14)
      .attr("text-anchor", "middle")
      .attr("fill", "#94a3b8")
      .attr("font-size", 10)
      .style("pointer-events", "none");

    // Click to navigate
    node.on("click", (_event, d) => {
      handleNodeClick(d.id);
    });

    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x)
        .attr("y1", (d) => (d.source as SimNode).y)
        .attr("x2", (d) => (d.target as SimNode).x)
        .attr("y2", (d) => (d.target as SimNode).y);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [filteredNodes, filteredLinks, selectedNodeId, allTags, handleNodeClick]);

  return (
    <div className="flex flex-col h-full">
      {/* Tag filter bar */}
      {allTags.length > 0 && onFilterTags && (
        <div className="flex flex-wrap gap-1.5 mb-3 px-1">
          {allTags.map((tag) => {
            const active = filterTags?.includes(tag) ?? false;
            const color = getTagColor(tag, allTags);
            return (
              <button
                key={tag}
                onClick={() => {
                  if (active) {
                    onFilterTags(filterTags?.filter((t) => t !== tag) ?? []);
                  } else {
                    onFilterTags([...(filterTags ?? []), tag]);
                  }
                }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border transition-colors ${
                  active
                    ? "text-white border-transparent"
                    : "text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-700 hover:border-gray-400"
                }`}
                style={
                  active
                    ? { backgroundColor: color, borderColor: color }
                    : {}
                }
              >
                {tag}
              </button>
            );
          })}
          {filterTags && filterTags.length > 0 && (
            <button
              onClick={() => onFilterTags([])}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* SVG container */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900 overflow-hidden"
      >
        <svg ref={svgRef} className="w-full h-full" />
        {filteredNodes.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
            No nodes match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
