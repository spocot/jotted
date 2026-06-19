import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetCanvasesQuery,
  useGetCanvasQuery,
  useCreateCanvasMutation,
  useUpdateCanvasMutation,
  useDeleteCanvasMutation,
  useBatchUpdateCanvasMutation,
  useLazyGetNotesQuery,
} from "../store/redux/api";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import type {
  CanvasItem,
  CanvasEdge,
} from "../types";

const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

const ITEM_MIN_WIDTH = 120;
const ITEM_MIN_HEIGHT = 60;

export default function CanvasPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Canvas list
  const { data: canvases = [] } = useGetCanvasesQuery();
  const [createCanvas] = useCreateCanvasMutation();
  const [updateCanvas] = useUpdateCanvasMutation();
  const [deleteCanvas] = useDeleteCanvasMutation();
  const [batchUpdate] = useBatchUpdateCanvasMutation();
  const [lazyGetNotes] = useLazyGetNotesQuery();

  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);
  const { data: canvasData } = useGetCanvasQuery(selectedCanvasId ?? "", {
    skip: !selectedCanvasId,
  });

  // Local state for canvas items and edges
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [canvasTitle, setCanvasTitle] = useState("");

  // Viewport state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Tool state
  type Tool = "select" | "pan" | "connect" | "text_box" | "note_pin";
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [itemColor, setItemColor] = useState(COLORS[0]);

  // Note search for pinning
  const [showNoteSearch, setShowNoteSearch] = useState(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState("");
  const [noteSearchResults, setNoteSearchResults] = useState<Array<{ id: string; title: string }>>([]);

  // New canvas modal
  const [showNewCanvas, setShowNewCanvas] = useState(false);
  const [newCanvasTitle, setNewCanvasTitle] = useState("");

  // Canvas container ref
  const canvasRef = useRef<HTMLDivElement>(null);
  const loadedCanvasRef = useRef<string | null>(null);

  // Sync local state from server on initial load for each canvas
  // (not on refetches triggered by auto-save invalidation)
  useEffect(() => {
    if (!canvasData) {
      if (selectedCanvasId && loadedCanvasRef.current !== selectedCanvasId) {
        setItems([]);
        setEdges([]);
        setCanvasTitle("");
      }
      return;
    }
    if (loadedCanvasRef.current !== canvasData.id) {
      setItems(canvasData.items);
      setEdges(canvasData.edges);
      setCanvasTitle(canvasData.title);
      loadedCanvasRef.current = canvasData.id;
    }
  }, [canvasData, selectedCanvasId]);

  // Auto-save ref
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDeletesRef = useRef<{ itemIds: string[]; edgeIds: string[] }>({
    itemIds: [],
    edgeIds: [],
  });

  const scheduleAutoSave = useCallback(
    (
      updatedItems: CanvasItem[],
      updatedEdges: CanvasEdge[],
      extra?: { deletedItemIds?: string[]; deletedEdgeIds?: string[] },
    ) => {
      if (!selectedCanvasId) return;
      if (extra?.deletedItemIds) {
        pendingDeletesRef.current.itemIds.push(...extra.deletedItemIds);
      }
      if (extra?.deletedEdgeIds) {
        pendingDeletesRef.current.edgeIds.push(...extra.deletedEdgeIds);
      }
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      const deletes = { ...pendingDeletesRef.current };
      pendingDeletesRef.current = { itemIds: [], edgeIds: [] };
      autoSaveTimerRef.current = setTimeout(() => {
        batchUpdate({
          canvasId: selectedCanvasId,
          data: {
            items: updatedItems.map((i) => ({
              id: i.id,
              x: i.x,
              y: i.y,
              width: i.width,
              height: i.height,
              text: i.text,
              color: i.color,
              zIndex: i.zIndex,
              noteId: i.noteId,
              type: i.type,
            })),
            edges: updatedEdges.map((e) => ({
              id: e.id,
              sourceItemId: e.sourceItemId,
              targetItemId: e.targetItemId,
              type: e.type,
            })),
            deletedItemIds: deletes.itemIds.length > 0
              ? deletes.itemIds
              : undefined,
            deletedEdgeIds: deletes.edgeIds.length > 0
              ? deletes.edgeIds
              : undefined,
          },
        });
      }, 1000);
    },
    [selectedCanvasId, batchUpdate],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // ---- Canvas List ----

  const handleCreateCanvas = async () => {
    try {
      const canvas = await createCanvas(newCanvasTitle || undefined).unwrap();
      setSelectedCanvasId(canvas.id);
      setShowNewCanvas(false);
      setNewCanvasTitle("");
      dispatch(addToast("Canvas created", "success"));
    } catch {
      dispatch(addToast("Failed to create canvas", "error"));
    }
  };

  const handleDeleteCanvas = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteCanvas(id).unwrap();
      if (selectedCanvasId === id) {
        setSelectedCanvasId(null);
      }
      dispatch(addToast("Canvas deleted", "info"));
    } catch {
      dispatch(addToast("Failed to delete canvas", "error"));
    }
  };

  const handleRenameCanvas = async (id: string, title: string) => {
    try {
      await updateCanvas({ id, title }).unwrap();
      dispatch(addToast("Canvas renamed", "success"));
    } catch {
      dispatch(addToast("Failed to rename canvas", "error"));
    }
  };

  // ---- Viewport Controls ----

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom((z) => Math.max(0.1, Math.min(5, z * delta)));
      } else {
        setPanX((x) => x - e.deltaX);
        setPanY((y) => y - e.deltaY);
      }
    },
    [],
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool === "pan" || e.button === 1) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
        e.preventDefault();
      }
    },
    [activeTool, panX, panY],
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPanX(panStartRef.current.panX + dx);
        setPanY(panStartRef.current.panY + dy);
      }
      if (draggingItemId) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const newX = (e.clientX - rect.left - panX) / zoom - dragOffset.x;
        const newY = (e.clientY - rect.top - panY) / zoom - dragOffset.y;
        setItems((prev) =>
          prev.map((item) =>
            item.id === draggingItemId
              ? { ...item, x: newX, y: newY }
              : item,
          ),
        );
      }
    },
    [isPanning, draggingItemId, panX, panY, zoom, dragOffset],
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (isPanning) setIsPanning(false);
    if (draggingItemId) {
      setDraggingItemId(null);
      scheduleAutoSave(items, edges);
    }
  }, [isPanning, draggingItemId, items, edges, scheduleAutoSave]);

  // ---- Item Handling ----

  const handleItemMouseDown = useCallback(
    (e: React.MouseEvent, item: CanvasItem) => {
      e.stopPropagation();
      if (activeTool === "connect") {
        if (connectSourceId === null) {
          setConnectSourceId(item.id);
        } else if (connectSourceId !== item.id) {
          const newEdge: CanvasEdge = {
            id: `temp-${Date.now()}`,
            canvasId: selectedCanvasId ?? "",
            sourceItemId: connectSourceId,
            targetItemId: item.id,
            type: "straight",
            createdAt: new Date().toISOString(),
          };
          const updatedEdges = [...edges, newEdge];
          setEdges(updatedEdges);
          setConnectSourceId(null);
          scheduleAutoSave(items, updatedEdges);
          dispatch(addToast("Connector added", "success"));
        } else {
          setConnectSourceId(null);
        }
        return;
      }
      if (activeTool === "select") {
        setSelectedItemId(item.id);
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const offsetX = (e.clientX - rect.left - panX) / zoom - item.x;
        const offsetY = (e.clientY - rect.top - panY) / zoom - item.y;
        setDragOffset({ x: offsetX, y: offsetY });
        setDraggingItemId(item.id);
      }
    },
    [activeTool, connectSourceId, selectedCanvasId, edges, items, panX, panY, zoom, scheduleAutoSave, dispatch],
  );

  const handleItemDoubleClick = useCallback(
    (item: CanvasItem) => {
      if (item.noteId) {
        navigate(`/note/${item.noteId}`);
      } else {
        setEditingItemId(item.id);
        setEditText(item.text);
      }
    },
    [navigate],
  );

  const handleTextSave = useCallback(
    (itemId: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, text: editText } : item,
        ),
      );
      setEditingItemId(null);
      scheduleAutoSave(items, edges);
    },
    [editText, items, edges, scheduleAutoSave],
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedItemId) return;
    const deletedId = selectedItemId;
    const updatedItems = items.filter((i) => i.id !== selectedItemId);
    const deletedEdgeIds = edges
      .filter(
        (e) => e.sourceItemId === selectedItemId || e.targetItemId === selectedItemId,
      )
      .map((e) => e.id);
    const updatedEdges = edges.filter(
      (e) => e.sourceItemId !== selectedItemId && e.targetItemId !== selectedItemId,
    );
    setItems(updatedItems);
    setEdges(updatedEdges);
    setSelectedItemId(null);
    scheduleAutoSave(updatedItems, updatedEdges, {
      deletedItemIds: [deletedId],
      deletedEdgeIds: deletedEdgeIds,
    });
    dispatch(addToast("Item deleted", "info"));
  }, [selectedItemId, items, edges, scheduleAutoSave, dispatch]);

  const handleColorChange = useCallback(
    (color: string) => {
      if (!selectedItemId) return;
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItemId ? { ...item, color } : item,
        ),
      );
      setItemColor(color);
      scheduleAutoSave(items, edges);
    },
    [selectedItemId, items, edges, scheduleAutoSave],
  );

  const handleBringToFront = useCallback(() => {
    if (!selectedItemId) return;
    const maxZ = Math.max(...items.map((i) => i.zIndex), 0);
    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedItemId ? { ...item, zIndex: maxZ + 1 } : item,
      ),
    );
    scheduleAutoSave(items, edges);
  }, [selectedItemId, items, edges, scheduleAutoSave]);

  // ---- Adding Items ----

  const handleAddTextBox = useCallback(() => {
    if (!selectedCanvasId) return;
    const newItem: CanvasItem = {
      id: crypto.randomUUID(),
      canvasId: selectedCanvasId,
      noteId: null,
      type: "text_box",
      text: "New Text",
      color: itemColor,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: 200,
      height: 80,
      zIndex: items.length,
      createdAt: new Date().toISOString(),
    };
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setSelectedItemId(newItem.id);
    setEditingItemId(newItem.id);
    setEditText("New Text");
    scheduleAutoSave(updatedItems, edges);
  }, [selectedCanvasId, itemColor, items, edges, scheduleAutoSave]);

  const handleAddNotePin = useCallback(() => {
    setShowNoteSearch(true);
    setNoteSearchQuery("");
    setNoteSearchResults([]);
  }, []);

  const handleSearchNotes = useCallback(
    async (q: string) => {
      setNoteSearchQuery(q);
      if (q.length < 2) {
        setNoteSearchResults([]);
        return;
      }
      try {
        const result = await lazyGetNotes({ limit: 10, offset: 0 }).unwrap();
        const filtered = result.items.filter(
          (n) =>
            n.title.toLowerCase().includes(q.toLowerCase()),
        );
        setNoteSearchResults(filtered.slice(0, 10));
      } catch {
        // ignore
      }
    },
    [lazyGetNotes],
  );

  const handleSelectNoteForPin = useCallback(
    (noteId: string, noteTitle: string) => {
      if (!selectedCanvasId) return;
      const newItem: CanvasItem = {
        id: crypto.randomUUID(),
        canvasId: selectedCanvasId,
        noteId,
        type: "note_pin",
        text: noteTitle,
        color: itemColor,
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 220,
        height: 80,
        zIndex: items.length,
        createdAt: new Date().toISOString(),
      };
      const updatedItems = [...items, newItem];
      setItems(updatedItems);
      setShowNoteSearch(false);
      setNoteSearchQuery("");
      scheduleAutoSave(updatedItems, edges);
      dispatch(addToast(`Pinned "${noteTitle}"`, "success"));
    },
    [selectedCanvasId, itemColor, items, edges, scheduleAutoSave, dispatch],
  );

  // ---- Edge Handling ----

  const handleDeleteEdge = useCallback(
    (edgeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updatedEdges = edges.filter((ed) => ed.id !== edgeId);
      setEdges(updatedEdges);
      scheduleAutoSave(items, updatedEdges, {
        deletedEdgeIds: [edgeId],
      });
    },
    [edges, items, scheduleAutoSave],
  );

  // ---- Export ----

  const handleExportPng = useCallback(() => {
    const container = canvasRef.current;
    if (!container) return;

    // Calculate bounding box of all items
    if (items.length === 0) {
      dispatch(addToast("Canvas is empty", "info"));
      return;
    }

    const minX = Math.min(...items.map((i) => i.x)) - 20;
    const minY = Math.min(...items.map((i) => i.y)) - 20;
    const maxX = Math.max(...items.map((i) => i.x + i.width)) + 20;
    const maxY = Math.max(...items.map((i) => i.y + i.height)) + 20;
    const exportWidth = maxX - minX;
    const exportHeight = maxY - minY;

    // Create a temporary canvas for export
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    // Draw edges
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    for (const edge of edges) {
      const src = items.find((i) => i.id === edge.sourceItemId);
      const tgt = items.find((i) => i.id === edge.targetItemId);
      if (!src || !tgt) continue;
      const sx = src.x + src.width / 2 - minX;
      const sy = src.y + src.height / 2 - minY;
      const tx = tgt.x + tgt.width / 2 - minX;
      const ty = tgt.y + tgt.height / 2 - minY;

      ctx.beginPath();
      if (edge.type === "curved") {
        const midX = (sx + tx) / 2;
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(midX, Math.min(sy, ty) - 40, tx, ty);
      } else {
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
      }
      ctx.stroke();
    }

    // Draw items
    for (const item of items) {
      const x = item.x - minX;
      const y = item.y - minY;
      const w = item.width;
      const h = item.height;

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fillRect(x + 2, y + 2, w, h);

      // Background
      ctx.fillStyle = item.color;
      ctx.fillRect(x, y, w, h);

      // Text
      ctx.fillStyle = "#ffffff";
      ctx.font = "13px system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      if (item.type === "note_pin") {
        ctx.font = "bold 13px system-ui, sans-serif";
      }

      const lines = item.text.split("\n");
      const lineH = 18;
      const startY = y + h / 2 - ((lines.length - 1) * lineH) / 2;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x + w / 2, startY + i * lineH);
      }

      // Note pin indicator
      if (item.type === "note_pin") {
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.font = "10px system-ui, sans-serif";
        ctx.fillText("📌", x + w - 16, y + 14);
      }
    }

    const link = document.createElement("a");
    link.download = `${canvasTitle || "canvas"}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
    dispatch(addToast("Canvas exported as PNG", "success"));
  }, [items, edges, canvasTitle, dispatch]);

  // ---- Render ----

  const canvasListPanel = (
    <div className="w-56 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900 shrink-0 overflow-y-auto">
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setShowNewCanvas(true)}
          className="w-full px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          + New Canvas
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {canvases.length === 0 && (
          <div className="p-4 text-sm text-gray-400 dark:text-gray-500 text-center">
            No canvases yet
          </div>
        )}
        {canvases.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelectedCanvasId(c.id)}
            className={`px-3 py-2 cursor-pointer text-sm border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between group ${
              selectedCanvasId === c.id
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            <span className="truncate flex-1">{c.title}</span>
            <button
              onClick={(e) => handleDeleteCanvas(c.id, e)}
              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
              title="Delete canvas"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {canvasListPanel}

      {/* Main canvas area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
          {/* Canvas title */}
          <input
            type="text"
            value={canvasTitle}
            onChange={(e) => setCanvasTitle(e.target.value)}
            onBlur={() => {
              if (selectedCanvasId && canvasTitle) {
                handleRenameCanvas(selectedCanvasId, canvasTitle);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && selectedCanvasId && canvasTitle) {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="text-sm font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 w-48"
            placeholder="Canvas Title"
          />

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Tools */}
          <ToolButton
            icon={<SelectIcon />}
            label="Select"
            active={activeTool === "select"}
            onClick={() => setActiveTool("select")}
          />
          <ToolButton
            icon={<PanIcon />}
            label="Pan"
            active={activeTool === "pan"}
            onClick={() => setActiveTool("pan")}
          />
          <ToolButton
            icon={<ConnectIcon />}
            label="Connect"
            active={activeTool === "connect"}
            onClick={() => setActiveTool("connect")}
          />

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Add items */}
          <ToolButton
            icon={<TextIcon />}
            label="Text Box"
            onClick={handleAddTextBox}
          />
          <ToolButton
            icon={<PinIcon />}
            label="Note Pin"
            onClick={handleAddNotePin}
          />

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Actions */}
          <ToolButton
            icon={<DeleteIcon />}
            label="Delete"
            onClick={handleDeleteSelected}
            disabled={!selectedItemId}
          />
          <ToolButton
            icon={<FrontIcon />}
            label="Bring to Front"
            onClick={handleBringToFront}
            disabled={!selectedItemId}
          />

          {/* Color picker */}
          {selectedItemId && (
            <div className="flex items-center gap-1">
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 hover:scale-125 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}

          <div className="flex-1" />

          {/* Zoom controls */}
          <span className="text-xs text-gray-400 tabular-nums">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            title="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 transition-colors font-medium"
            title="Reset zoom"
          >
            Fit
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(5, z + 0.1))}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            title="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>

          {/* Export */}
          <button
            onClick={handleExportPng}
            className="px-2 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            title="Export as PNG"
          >
            Export
          </button>
        </div>

        {/* Canvas area */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900 relative cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {!selectedCanvasId && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                <p className="text-sm">Select or create a canvas to start</p>
              </div>
            </div>
          )}

          {selectedCanvasId && (
            <div
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: "0 0",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            >
              {/* SVG connectors layer */}
              <svg
                className="connectors-svg absolute top-0 left-0 pointer-events-none"
                style={{ width: 10000, height: 10000, overflow: "visible" }}
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="6"
                    refX="8"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
                  </marker>
                </defs>
                {edges.map((edge) => {
                  const src = items.find((i) => i.id === edge.sourceItemId);
                  const tgt = items.find((i) => i.id === edge.targetItemId);
                  if (!src || !tgt) return null;

                  const sx = src.x + src.width / 2;
                  const sy = src.y + src.height / 2;
                  const tx = tgt.x + tgt.width / 2;
                  const ty = tgt.y + tgt.height / 2;

                  return (
                    <g key={edge.id}>
                      <path
                        d={
                          edge.type === "curved"
                            ? `M ${sx} ${sy} Q ${(sx + tx) / 2} ${Math.min(sy, ty) - 40} ${tx} ${ty}`
                            : `M ${sx} ${sy} L ${tx} ${ty}`
                        }
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        markerEnd="url(#arrowhead)"
                        className="pointer-events-auto cursor-pointer hover:stroke-red-400"
                        onClick={(e) => handleDeleteEdge(edge.id, e as unknown as React.MouseEvent)}
                      />
                    </g>
                  );
                })}

                {/* Ghost line when connecting */}
                {activeTool === "connect" && connectSourceId && (
                  <LineToCursor
                    sourceItem={items.find((i) => i.id === connectSourceId)}
                  />
                )}
              </svg>

              {/* Canvas items */}
              {items
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((item) => (
                  <div
                    key={item.id}
                    onMouseDown={(e) => handleItemMouseDown(e, item)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    className={`absolute rounded-lg shadow-lg cursor-move transition-shadow hover:shadow-xl select-none ${
                      selectedItemId === item.id
                        ? "ring-2 ring-blue-400 dark:ring-blue-500"
                        : ""
                    } ${
                      connectSourceId === item.id
                        ? "ring-2 ring-green-400"
                        : ""
                    }`}
                    style={{
                      left: item.x,
                      top: item.y,
                      width: item.width,
                      height: item.height,
                      backgroundColor: item.color,
                      zIndex: item.zIndex,
                    }}
                  >
                    {/* Text content */}
                    <div className="p-3 h-full flex flex-col">
                      {editingItemId === item.id ? (
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onBlur={() => handleTextSave(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setEditingItemId(null);
                            }
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleTextSave(item.id);
                            }
                          }}
                          autoFocus
                          className="flex-1 bg-transparent text-white text-sm outline-none resize-none placeholder-white/50"
                          style={{ fontFamily: "inherit" }}
                        />
                      ) : (
                        <div className="flex-1 overflow-hidden">
                          {item.type === "note_pin" && item.noteId && (
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-xs text-white/70">📌</span>
                            </div>
                          )}
                          <p className="text-sm text-white whitespace-pre-wrap line-clamp-4">
                            {item.text || "Empty"}
                          </p>
                        </div>
                      )}

                      {/* Resize handle */}
                      <div
                        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const startX = e.clientX;
                          const startY = e.clientY;
                          const startW = item.width;
                          const startH = item.height;
                          const handleMouseMove = (ev: MouseEvent) => {
                            const dx = (ev.clientX - startX) / zoom;
                            const dy = (ev.clientY - startY) / zoom;
                            const newW = Math.max(ITEM_MIN_WIDTH, startW + dx);
                            const newH = Math.max(ITEM_MIN_HEIGHT, startH + dy);
                            setItems((prev) =>
                              prev.map((i) =>
                                i.id === item.id
                                  ? { ...i, width: newW, height: newH }
                                  : i,
                              ),
                            );
                          };
                          const handleMouseUp = () => {
                            window.removeEventListener("mousemove", handleMouseMove);
                            window.removeEventListener("mouseup", handleMouseUp);
                            scheduleAutoSave(items, edges);
                          };
                          window.addEventListener("mousemove", handleMouseMove);
                          window.addEventListener("mouseup", handleMouseUp);
                        }}
                      >
                        <svg
                          className="w-3 h-3 text-white/50"
                          viewBox="0 0 10 10"
                          fill="currentColor"
                        >
                          <path d="M10 0v2L2 10H0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Note search modal */}
      {showNoteSearch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowNoteSearch(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 w-80 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100">
              Pin a Note
            </h3>
            <input
              type="text"
              value={noteSearchQuery}
              onChange={(e) => handleSearchNotes(e.target.value)}
              placeholder="Search notes by title..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
              autoFocus
            />
            <div className="mt-2 max-h-48 overflow-y-auto">
              {noteSearchResults.length === 0 && noteSearchQuery.length >= 2 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  No notes found
                </p>
              )}
              {noteSearchResults.map((note) => (
                <button
                  key={note.id}
                  onClick={() => handleSelectNoteForPin(note.id, note.title)}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {note.title || "Untitled"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowNoteSearch(false)}
              className="mt-2 w-full px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* New canvas modal */}
      {showNewCanvas && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowNewCanvas(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-80 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              New Canvas
            </h3>
            <input
              type="text"
              value={newCanvasTitle}
              onChange={(e) => setNewCanvasTitle(e.target.value)}
              placeholder="Canvas title"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateCanvas();
              }}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreateCanvas}
                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => setShowNewCanvas(false)}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Sub-components ----

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function ToolButton({ icon, label, active, onClick, disabled }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
      } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
      title={label}
    >
      {icon}
    </button>
  );
}

function LineToCursor({
  sourceItem,
}: {
  sourceItem?: CanvasItem;
}) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  if (!sourceItem) return null;

  const sx = sourceItem.x + sourceItem.width / 2;
  const sy = sourceItem.y + sourceItem.height / 2;

  // Convert screen mouse pos to canvas coordinates
  // This is approximate since we don't have canvas ref here
  const tx = mousePos.x;
  const ty = mousePos.y;

  return (
    <line
      x1={sx}
      y1={sy}
      x2={tx}
      y2={ty}
      stroke="#3b82f6"
      strokeWidth={2}
      strokeDasharray="5,3"
    />
  );
}

// ---- Icons ----

function SelectIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function PanIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  );
}

function ConnectIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 17h16M4 12h8m-8-5h16" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function FrontIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}
