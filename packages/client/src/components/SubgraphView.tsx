import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as d3 from "d3";
import { api } from "../api/client";
import type { GraphData } from "../types";

const NODE_RADIUS = 5;
const CHARGE_STRENGTH = -100;
const LINK_DISTANCE = 60;

interface SubgraphViewProps {
  noteId: string;
}

export default function SubgraphView({ noteId }: SubgraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getGraphSub(noteId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [noteId]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    const width = containerRef.current.clientWidth;
    const height = 200;

    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    const g = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(width / 2, height / 2),
    );

    if (data.nodes.length === 0) return;

    const simNodes = data.nodes.map((n) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * width * 0.3,
      y: height / 2 + (Math.random() - 0.5) * height * 0.3,
      fx: null as number | null,
      fy: null as number | null,
      vx: 0,
      vy: 0,
    }));

    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks = data.links
      .map((l) => {
        const source = nodeMap.get(l.sourceId);
        const target = nodeMap.get(l.targetId);
        if (!source || !target) return null;
        return { source, target };
      })
      .filter((l): l is { source: typeof simNodes[0]; target: typeof simNodes[0] } => l !== null);

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        "link",
        d3
          .forceLink(simLinks)
          .id((d: any) => d.id)
          .distance(LINK_DISTANCE),
      )
      .force("charge", d3.forceManyBody().strength(CHARGE_STRENGTH))
      .force("center", d3.forceCenter(0, 0));

    const link = g
      .append("g")
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.4);

    const node = g
      .append("g")
      .selectAll("g")
      .data(simNodes)
      .join("g")
      .style("cursor", "pointer");

    node
      .append("circle")
      .attr("r", NODE_RADIUS)
      .attr("fill", (d: any) => (d.id === noteId ? "#3b82f6" : "#64748b"))
      .attr("stroke", (d: any) => (d.id === noteId ? "#1d4ed8" : "none"))
      .attr("stroke-width", 1.5);

    node
      .append("text")
      .text((d: any) => d.title || "Untitled")
      .attr("dy", NODE_RADIUS + 10)
      .attr("text-anchor", "middle")
      .attr("fill", "#94a3b8")
      .attr("font-size", 8)
      .style("pointer-events", "none");

    node.on("click", (_event: any, d: any) => {
      navigate(`/note/${d.id}`);
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data, noteId, navigate]);

  if (loading) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">
        Loading graph...
      </div>
    );
  }

  if (!data || data.nodes.length <= 1) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">
        No connections yet.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-900 overflow-hidden"
    >
      <svg ref={svgRef} className="w-full" style={{ height: 200 }} />
    </div>
  );
}
