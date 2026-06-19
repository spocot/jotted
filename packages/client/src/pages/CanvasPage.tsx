import { useState, useEffect, useRef, useCallback } from "react";
import { IconTrash, IconMinus, IconPlus, IconLayoutKanban, IconPointer, IconLink, IconTypography, IconMapPin, IconChevronUp, IconPhoto, IconLasso, IconArrowBackUp, IconArrowForwardUp, IconGridDots, IconMagnet } from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useGetCanvasesQuery,
  useGetCanvasQuery,
  useCreateCanvasMutation,
  useUpdateCanvasMutation,
  useDeleteCanvasMutation,
  useBatchUpdateCanvasMutation,
  useLazyGetNotesQuery,
  useGetAllUploadsQuery,
  useUploadFileMutation,
} from "../store/redux/api";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import type {
  CanvasItem,
  CanvasEdge,
  Upload,
} from "../types";

const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

const ITEM_MIN_WIDTH = 120;
const ITEM_MIN_HEIGHT = 60;

export default function CanvasPage() {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id: string }>();
  const selectedCanvasId = paramId ?? null;
  const dispatch = useAppDispatch();

  // Canvas list
  const { data: canvases = [] } = useGetCanvasesQuery();
  const [createCanvas] = useCreateCanvasMutation();
  const [updateCanvas] = useUpdateCanvasMutation();
  const [deleteCanvas] = useDeleteCanvasMutation();
  const [batchUpdate] = useBatchUpdateCanvasMutation();
  const [lazyGetNotes] = useLazyGetNotesQuery();
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
  type Tool = "select" | "lasso" | "connect" | "text_box" | "note_pin";
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [draggingItemIds, setDraggingItemIds] = useState<Set<string>>(new Set());
  const [dragStartPositions, setDragStartPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [itemColor, setItemColor] = useState(COLORS[0]);
  const anchorDragItemIdRef = useRef<string | null>(null);

  // Rubber-band selection
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectRect, setSelectRect] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Grid & Snap
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState<20 | 40 | 80>(40);
  const [snapToGrid, setSnapToGrid] = useState(false);
  // Alignment & Distribution guides
  const [alignmentGuides, setAlignmentGuides] = useState<Array<{ orientation: "horizontal" | "vertical"; position: number; start: number; end: number; extended: boolean }>>([]);
  const [distributionGuides, setDistributionGuides] = useState<Array<{ orientation: "horizontal" | "vertical"; positions: number[] }>>([]);

  // Note search for pinning
  const [showNoteSearch, setShowNoteSearch] = useState(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState("");
  const [noteSearchResults, setNoteSearchResults] = useState<Array<{ id: string; title: string }>>([]);

  // Image picker
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imagePickerTab, setImagePickerTab] = useState<"upload" | "browse">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: allUploads = [] } = useGetAllUploadsQuery();
  const [uploadFile] = useUploadFileMutation();

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // New canvas modal
  const [showNewCanvas, setShowNewCanvas] = useState(false);
  const [newCanvasTitle, setNewCanvasTitle] = useState("");

  // Canvas container ref
  const canvasRef = useRef<HTMLDivElement>(null);
  const loadedCanvasRef = useRef<string | null>(null);

  // Pan/zoom to frame all items within the viewport
  const panToFitItems = useCallback((itemsToFit: CanvasItem[]) => {
    if (itemsToFit.length === 0) return;
    const container = canvasRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const vw = rect.width;
    const vh = rect.height;
    if (vw === 0 || vh === 0) return;

    const pad = 40;
    const minX = Math.min(...itemsToFit.map((i) => i.x)) - pad;
    const minY = Math.min(...itemsToFit.map((i) => i.y)) - pad;
    const maxX = Math.max(...itemsToFit.map((i) => i.x + i.width)) + pad;
    const maxY = Math.max(...itemsToFit.map((i) => i.y + i.height)) + pad;

    const bw = maxX - minX;
    const bh = maxY - minY;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    let zoomLevel = 1;
    if (bw > 0 && bh > 0) {
      zoomLevel = Math.min((vw * 0.8) / bw, (vh * 0.8) / bh, 2);
    }
    zoomLevel = Math.max(0.1, zoomLevel);

    setPanX(vw / 2 - cx * zoomLevel);
    setPanY(vh / 2 - cy * zoomLevel);
    setZoom(zoomLevel);
  }, []);

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
      panToFitItems(canvasData.items);
    }
  }, [canvasData, selectedCanvasId, panToFitItems]);

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

  // ---- Undo / Redo ----

  const MAX_UNDO_DEPTH = 100;
  const undoStackRef = useRef<Array<{ items: CanvasItem[]; edges: CanvasEdge[] }>>([]);
  const redoStackRef = useRef<Array<{ items: CanvasItem[]; edges: CanvasEdge[] }>>([]);

  const pushUndo = useCallback(() => {
    undoStackRef.current.push({ items: JSON.parse(JSON.stringify(items)), edges: JSON.parse(JSON.stringify(edges)) });
    if (undoStackRef.current.length > MAX_UNDO_DEPTH) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, [items, edges]);

  const handleUndo = useCallback(() => {
    const snapshot = undoStackRef.current.pop();
    if (!snapshot) return;
    redoStackRef.current.push({ items: JSON.parse(JSON.stringify(items)), edges: JSON.parse(JSON.stringify(edges)) });
    setItems(snapshot.items);
    setEdges(snapshot.edges);
    setSelectedItemIds(new Set());
    scheduleAutoSave(snapshot.items, snapshot.edges);
  }, [items, edges, scheduleAutoSave]);

  const handleRedo = useCallback(() => {
    const snapshot = redoStackRef.current.pop();
    if (!snapshot) return;
    undoStackRef.current.push({ items: JSON.parse(JSON.stringify(items)), edges: JSON.parse(JSON.stringify(edges)) });
    setItems(snapshot.items);
    setEdges(snapshot.edges);
    setSelectedItemIds(new Set());
    scheduleAutoSave(snapshot.items, snapshot.edges);
  }, [items, edges, scheduleAutoSave]);

  // Keyboard shortcut for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  // ---- Canvas List ----

  const handleCreateCanvas = async () => {
    try {
      const canvas = await createCanvas(newCanvasTitle || undefined).unwrap();
      navigate(`/canvas/${canvas.id}`);
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
        navigate("/canvas");
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
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.max(0.1, Math.min(5, z * delta)));
    },
    [],
  );

  const snapValue = useCallback(
    (value: number) => {
      if (!snapToGrid) return value;
      return Math.round(value / gridSize) * gridSize;
    },
    [snapToGrid, gridSize],
  );

  const computeAlignmentGuides = useCallback(
    (draggedItems: CanvasItem[], allItems: CanvasItem[], draggedIds: Set<string>) => {
      if (snapToGrid || draggedItems.length === 0) {
        setAlignmentGuides([]);
        setDistributionGuides([]);
        return;
      }
      const tolerance = 5;
      const otherItems = allItems.filter((i) => !draggedIds.has(i.id));
      if (otherItems.length === 0) {
        setAlignmentGuides([]);
        setDistributionGuides([]);
        return;
      }

      const candidates: Array<{ orientation: "horizontal" | "vertical"; position: number; itemIds: string[] }> = [];

      for (const dragged of draggedItems) {
        const dLeft = dragged.x;
        const dRight = dragged.x + dragged.width;
        const dTop = dragged.y;
        const dBottom = dragged.y + dragged.height;
        const dCx = dragged.x + dragged.width / 2;
        const dCy = dragged.y + dragged.height / 2;

        const draggedEdges = [
          { pos: dLeft, type: "left" as const },
          { pos: dRight, type: "right" as const },
          { pos: dTop, type: "top" as const },
          { pos: dBottom, type: "bottom" as const },
          { pos: dCx, type: "center-x" as const },
          { pos: dCy, type: "center-y" as const },
        ];

        for (const other of otherItems) {
          const oLeft = other.x;
          const oRight = other.x + other.width;
          const oTop = other.y;
          const oBottom = other.y + other.height;
          const oCx = other.x + other.width / 2;
          const oCy = other.y + other.height / 2;

          const otherEdges = [
            { pos: oLeft, axis: "x" as const },
            { pos: oRight, axis: "x" as const, type: "left" as const },
            { pos: oLeft, axis: "x" as const, type: "right" as const },
            { pos: oRight, axis: "x" as const },
            { pos: oCx, axis: "x" as const },
            { pos: oTop, axis: "y" as const },
            { pos: oBottom, axis: "y" as const },
            { pos: oCy, axis: "y" as const },
          ];

          for (const de of draggedEdges) {
            for (const oe of otherEdges) {
              const isHorizontal =
                (de.type === "top" || de.type === "bottom" || de.type === "center-y") && oe.axis === "y";
              const isVertical =
                (de.type === "left" || de.type === "right" || de.type === "center-x") && oe.axis === "x";
              if (!isHorizontal && !isVertical) continue;
              if (Math.abs(de.pos - oe.pos) > tolerance) continue;

              candidates.push({
                orientation: isHorizontal ? "horizontal" : "vertical",
                position: oe.pos,
                itemIds: [dragged.id, other.id],
              });
            }
          }
        }
      }

      // Deduplicate and merge guides close together
      const merged: Array<{ orientation: "horizontal" | "vertical"; position: number; itemIds: Set<string> }> = [];
      for (const c of candidates) {
        const existing = merged.find(
          (g) => g.orientation === c.orientation && Math.abs(g.position - c.position) <= tolerance,
        );
        if (existing) {
          for (const id of c.itemIds) existing.itemIds.add(id);
        } else {
          merged.push({ ...c, itemIds: new Set(c.itemIds) });
        }
      }

      // Convert to renderable guides
      const minX = Math.min(...allItems.map((i) => i.x));
      const maxX = Math.max(...allItems.map((i) => i.x + i.width));
      const minY = Math.min(...allItems.map((i) => i.y));
      const maxY = Math.max(...allItems.map((i) => i.y + i.height));
      const guides = merged.map((g) => ({
        orientation: g.orientation,
        position: g.position,
        start: g.orientation === "vertical" ? minY : minX,
        end: g.orientation === "vertical" ? maxY : maxX,
        extended: g.itemIds.size >= 3,
      }));
      setAlignmentGuides(guides);

      // Distribution guides
      if (draggedItems.length >= 3) {
        const sortedByX = [...draggedItems].sort((a, b) => a.x - b.x);
        const sortedByY = [...draggedItems].sort((a, b) => a.y - b.y);

        const distGuides: Array<{ orientation: "horizontal" | "vertical"; positions: number[] }> = [];

        // Check horizontal distribution
        const gapsX: number[] = [];
        for (let i = 1; i < sortedByX.length; i++) {
          gapsX.push(sortedByX[i].x - (sortedByX[i - 1].x + sortedByX[i - 1].width));
        }
        if (gapsX.length >= 2) {
          const avgGapX = gapsX.reduce((a, b) => a + b, 0) / gapsX.length;
          const evenX = gapsX.every((g) => Math.abs(g - avgGapX) <= tolerance);
          if (evenX) {
            distGuides.push({
              orientation: "vertical",
              positions: sortedByX.map((item) => item.x + item.width / 2),
            });
          }
        }

        // Check vertical distribution
        const gapsY: number[] = [];
        for (let i = 1; i < sortedByY.length; i++) {
          gapsY.push(sortedByY[i].y - (sortedByY[i - 1].y + sortedByY[i - 1].height));
        }
        if (gapsY.length >= 2) {
          const avgGapY = gapsY.reduce((a, b) => a + b, 0) / gapsY.length;
          const evenY = gapsY.every((g) => Math.abs(g - avgGapY) <= tolerance);
          if (evenY) {
            distGuides.push({
              orientation: "horizontal",
              positions: sortedByY.map((item) => item.y + item.height / 2),
            });
          }
        }

        setDistributionGuides(distGuides);
      } else {
        setDistributionGuides([]);
      }
    },
    [snapToGrid],
  );

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - panX) / zoom,
        y: (clientY - rect.top - panY) / zoom,
      };
    },
    [panX, panY, zoom],
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool === "lasso" && e.button === 0) {
        // Start rubber-band selection
        const coords = getCanvasCoords(e.clientX, e.clientY);
        setIsSelecting(true);
        setSelectRect({
          startX: coords.x,
          startY: coords.y,
          currentX: coords.x,
          currentY: coords.y,
        });
        e.preventDefault();
        return;
      }
      if (activeTool !== "connect" || e.button === 1) {
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
        e.preventDefault();
      }
    },
    [activeTool, panX, panY, getCanvasCoords],
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isSelecting && selectRect) {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        setSelectRect((prev) =>
          prev ? { ...prev, currentX: coords.x, currentY: coords.y } : prev,
        );
        return;
      }
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPanX(panStartRef.current.panX + dx);
        setPanY(panStartRef.current.panY + dy);
      }
      if (draggingItemIds.size > 0 && anchorDragItemIdRef.current) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const newX = (e.clientX - rect.left - panX) / zoom - dragOffset.x;
        const newY = (e.clientY - rect.top - panY) / zoom - dragOffset.y;
        const anchorStart = dragStartPositions.get(anchorDragItemIdRef.current);
        if (!anchorStart) return;
        let deltaX = newX - anchorStart.x;
        let deltaY = newY - anchorStart.y;

        // Snap to grid
        if (snapToGrid) {
          const snappedX = snapValue(anchorStart.x + deltaX);
          const snappedY = snapValue(anchorStart.y + deltaY);
          deltaX = snappedX - anchorStart.x;
          deltaY = snappedY - anchorStart.y;
        }

        setItems((prev) => {
          const updated = prev.map((item) => {
            if (!draggingItemIds.has(item.id)) return item;
            const startPos = dragStartPositions.get(item.id);
            if (!startPos) return item;
            return {
              ...item,
              x: startPos.x + deltaX,
              y: startPos.y + deltaY,
            };
          });

          // Compute alignment guides based on updated positions
          const draggedItems = updated.filter((i) => draggingItemIds.has(i.id));
          computeAlignmentGuides(draggedItems, updated, draggingItemIds);

          return updated;
        });
      }
    },
    [isSelecting, selectRect, getCanvasCoords, isPanning, draggingItemIds, dragStartPositions, panX, panY, zoom, dragOffset, snapToGrid, snapValue, computeAlignmentGuides],
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (isSelecting && selectRect) {
      // Finalize rubber-band selection
      const minX = Math.min(selectRect.startX, selectRect.currentX);
      const minY = Math.min(selectRect.startY, selectRect.currentY);
      const maxX = Math.max(selectRect.startX, selectRect.currentX);
      const maxY = Math.max(selectRect.startY, selectRect.currentY);
      const newSelected = new Set<string>();
      for (const item of items) {
        if (
          item.x < maxX &&
          item.x + item.width > minX &&
          item.y < maxY &&
          item.y + item.height > minY
        ) {
          newSelected.add(item.id);
        }
      }
      setSelectedItemIds(newSelected);
      setIsSelecting(false);
      setSelectRect(null);
      return;
    }
    if (isPanning) setIsPanning(false);
    if (draggingItemIds.size > 0) {
      setDraggingItemIds(new Set());
      setDragStartPositions(new Map());
      setAlignmentGuides([]);
      setDistributionGuides([]);
      scheduleAutoSave(items, edges);
    }
  }, [isSelecting, selectRect, isPanning, draggingItemIds, items, edges, scheduleAutoSave]);

  // ---- Item Handling ----

  const handleItemMouseDown = useCallback(
    (e: React.MouseEvent, item: CanvasItem) => {
      e.stopPropagation();
      if (activeTool === "connect") {
        if (connectSourceId === null) {
          setConnectSourceId(item.id);
        } else if (connectSourceId !== item.id) {
          pushUndo();
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
      if (activeTool === "select" || activeTool === "lasso") {
        let newSelectedIds: Set<string>;
        if (e.shiftKey) {
          // Toggle this item in the selection
          newSelectedIds = new Set(selectedItemIds);
          if (newSelectedIds.has(item.id)) {
            newSelectedIds.delete(item.id);
          } else {
            newSelectedIds.add(item.id);
          }
        } else if (selectedItemIds.has(item.id)) {
          // Keep current multi-selection and start drag on all
          newSelectedIds = new Set(selectedItemIds);
        } else {
          // Single select
          newSelectedIds = new Set([item.id]);
        }
        setSelectedItemIds(newSelectedIds);

        // Snapshot for undo at drag start (one entry for the whole drag)
        pushUndo();

        // Record start positions for all dragged items
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const offsetX = (e.clientX - rect.left - panX) / zoom - item.x;
        const offsetY = (e.clientY - rect.top - panY) / zoom - item.y;
        setDragOffset({ x: offsetX, y: offsetY });

        const startPositions = new Map<string, { x: number; y: number }>();
        for (const sid of newSelectedIds) {
          const si = items.find((i) => i.id === sid);
          if (si) {
            startPositions.set(sid, { x: si.x, y: si.y });
          }
        }
        setDragStartPositions(startPositions);
        setDraggingItemIds(newSelectedIds);
        anchorDragItemIdRef.current = item.id;
      }
    },
    [activeTool, connectSourceId, selectedCanvasId, edges, items, panX, panY, zoom, scheduleAutoSave, dispatch, selectedItemIds, pushUndo],
  );

  const handleItemDoubleClick = useCallback(
    (item: CanvasItem) => {
      if (item.type === "image") {
        setLightboxUrl(item.text);
      } else if (item.noteId) {
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
      pushUndo();
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, text: editText } : item,
        ),
      );
      setEditingItemId(null);
      scheduleAutoSave(items, edges);
    },
    [editText, items, edges, scheduleAutoSave, pushUndo],
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedItemIds.size === 0) return;
    pushUndo();
    const deletedIds = [...selectedItemIds];
    const updatedItems = items.filter((i) => !selectedItemIds.has(i.id));
    const deletedEdgeIds = edges
      .filter(
        (e) => selectedItemIds.has(e.sourceItemId) || selectedItemIds.has(e.targetItemId),
      )
      .map((e) => e.id);
    const updatedEdges = edges.filter(
      (e) => !selectedItemIds.has(e.sourceItemId) && !selectedItemIds.has(e.targetItemId),
    );
    setItems(updatedItems);
    setEdges(updatedEdges);
    setSelectedItemIds(new Set());
    scheduleAutoSave(updatedItems, updatedEdges, {
      deletedItemIds: deletedIds,
      deletedEdgeIds: deletedEdgeIds,
    });
    dispatch(addToast(deletedIds.length > 1 ? `${deletedIds.length} items deleted` : "Item deleted", "info"));
  }, [selectedItemIds, items, edges, scheduleAutoSave, dispatch, pushUndo]);

  const handleColorChange = useCallback(
    (color: string) => {
      if (selectedItemIds.size === 0) return;
      pushUndo();
      setItems((prev) =>
        prev.map((item) =>
          selectedItemIds.has(item.id) ? { ...item, color } : item,
        ),
      );
      setItemColor(color);
      scheduleAutoSave(items, edges);
    },
    [selectedItemIds, items, edges, scheduleAutoSave, pushUndo],
  );

  const handleBringToFront = useCallback(() => {
    if (selectedItemIds.size === 0) return;
    pushUndo();
    const maxZ = Math.max(...items.map((i) => i.zIndex), 0);
    let nextZ = maxZ + 1;
    setItems((prev) =>
      prev.map((item) => {
        if (!selectedItemIds.has(item.id)) return item;
        return { ...item, zIndex: nextZ++ };
      }),
    );
    scheduleAutoSave(items, edges);
  }, [selectedItemIds, items, edges, scheduleAutoSave, pushUndo]);

  // ---- Adding Items ----

  const handleAddTextBox = useCallback(() => {
    if (!selectedCanvasId) return;
    pushUndo();
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
    setSelectedItemIds(new Set([newItem.id]));
    setEditingItemId(newItem.id);
    setEditText("New Text");
    scheduleAutoSave(updatedItems, edges);
  }, [selectedCanvasId, itemColor, items, edges, scheduleAutoSave, pushUndo]);

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
      pushUndo();
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
    [selectedCanvasId, itemColor, items, edges, scheduleAutoSave, dispatch, pushUndo],
  );

  // ---- Image Handling ----

  const handleAddImage = useCallback(() => {
    setShowImagePicker(true);
    setImagePickerTab("upload");
  }, []);

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!selectedCanvasId) return;
      try {
        const upload = await uploadFile({ noteId: "", file }).unwrap();
        pushUndo();
        const newItem: CanvasItem = {
          id: crypto.randomUUID(),
          canvasId: selectedCanvasId,
          noteId: null,
          type: "image",
          text: upload.url,
          color: "#3b82f6",
          x: 100 + Math.random() * 200,
          y: 100 + Math.random() * 200,
          width: 240,
          height: 180,
          zIndex: items.length,
          createdAt: new Date().toISOString(),
        };
        const updatedItems = [...items, newItem];
        setItems(updatedItems);
        setSelectedItemIds(new Set([newItem.id]));
        setShowImagePicker(false);
        scheduleAutoSave(updatedItems, edges);
        dispatch(addToast("Image added", "success"));
      } catch {
        dispatch(addToast("Failed to upload image", "error"));
      }
    },
    [selectedCanvasId, items, edges, uploadFile, scheduleAutoSave, dispatch, pushUndo],
  );

  const handleSelectExistingImage = useCallback(
    (upload: Upload) => {
      if (!selectedCanvasId) return;
      pushUndo();
      const newItem: CanvasItem = {
        id: crypto.randomUUID(),
        canvasId: selectedCanvasId,
        noteId: null,
        type: "image",
        text: upload.url,
        color: "#3b82f6",
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 240,
        height: 180,
        zIndex: items.length,
        createdAt: new Date().toISOString(),
      };
      const updatedItems = [...items, newItem];
      setItems(updatedItems);
      setSelectedItemIds(new Set([newItem.id]));
      setShowImagePicker(false);
      scheduleAutoSave(updatedItems, edges);
      dispatch(addToast("Image added", "success"));
    },
    [selectedCanvasId, items, edges, scheduleAutoSave, dispatch, pushUndo],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleImageUpload(file);
      }
    },
    [handleImageUpload],
  );

  const handleImageDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        handleImageUpload(file);
      }
    },
    [handleImageUpload],
  );

  const handleCanvasPaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await handleImageUpload(file);
          }
          return;
        }
      }
    },
    [handleImageUpload],
  );

  // ---- Edge Handling ----

  const handleDeleteEdge = useCallback(
    (edgeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      pushUndo();
      const updatedEdges = edges.filter((ed) => ed.id !== edgeId);
      setEdges(updatedEdges);
      scheduleAutoSave(items, updatedEdges, {
        deletedEdgeIds: [edgeId],
      });
    },
    [edges, items, scheduleAutoSave, pushUndo],
  );

  // ---- Export ----

  const handleExportPng = useCallback(async () => {
    const container = canvasRef.current;
    if (!container) return;

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

    // Preload all images for export
    const imageCache = new Map<string, HTMLImageElement>();
    const imageItems = items.filter((i) => i.type === "image");
    await Promise.all(
      imageItems.map(
        (item) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              imageCache.set(item.id, img);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = item.text;
          }),
      ),
    );

    // Draw items
    for (const item of items) {
      const x = item.x - minX;
      const y = item.y - minY;
      const w = item.width;
      const h = item.height;

      if (item.type === "image") {
        const img = imageCache.get(item.id);
        if (img) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 8);
          ctx.clip();
          ctx.drawImage(img, x, y, w, h);
          ctx.restore();
        }
      } else {
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
            onClick={() => navigate(`/canvas/${c.id}`)}
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
              <IconTrash className="w-4 h-4" />
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
            icon={<IconPointer />}
            label="Select / Pan"
            active={activeTool === "select"}
            onClick={() => setActiveTool("select")}
          />
          <ToolButton
            icon={<IconLink />}
            label="Connect"
            active={activeTool === "connect"}
            onClick={() => setActiveTool("connect")}
          />
          <ToolButton
            icon={<IconLasso />}
            label="Lasso Select"
            active={activeTool === "lasso"}
            onClick={() => setActiveTool("lasso")}
          />

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Add items */}
          <ToolButton
            icon={<IconTypography />}
            label="Text Box"
            onClick={handleAddTextBox}
          />
          <ToolButton
            icon={<IconMapPin />}
            label="Note Pin"
            onClick={handleAddNotePin}
          />
          <ToolButton
            icon={<IconPhoto />}
            label="Image"
            onClick={handleAddImage}
          />

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Actions */}
          <ToolButton
            icon={<IconTrash />}
            label="Delete"
            onClick={handleDeleteSelected}
            disabled={selectedItemIds.size === 0}
          />
          <ToolButton
            icon={<IconChevronUp />}
            label="Bring to Front"
            onClick={handleBringToFront}
            disabled={selectedItemIds.size === 0}
          />

          {/* Color picker */}
          {selectedItemIds.size > 0 && (
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

          {/* Selection count badge */}
          {selectedItemIds.size > 1 && (
            <div className="flex items-center gap-1 ml-1">
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                {selectedItemIds.size} selected
              </span>
            </div>
          )}

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Grid & Snap */}
          <div className="relative">
            <ToolButton
              icon={<IconGridDots />}
              label={showGrid ? "Hide grid" : "Show grid"}
              active={showGrid}
              onClick={() => setShowGrid((v) => !v)}
            />
            {showGrid && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-50 flex">
                {([20, 40, 80] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setGridSize(size)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      gridSize === size
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}
          </div>
          <ToolButton
            icon={<IconMagnet />}
            label={snapToGrid ? "Snap to grid: ON" : "Snap to grid: OFF"}
            active={snapToGrid}
            onClick={() => setSnapToGrid((v) => !v)}
          />

          <div className="flex-1" />

          {/* Undo / Redo */}
          <ToolButton
            icon={<IconArrowBackUp />}
            label="Undo (Ctrl+Z)"
            onClick={handleUndo}
            disabled={undoStackRef.current.length === 0}
          />
          <ToolButton
            icon={<IconArrowForwardUp />}
            label="Redo (Ctrl+Shift+Z)"
            onClick={handleRedo}
            disabled={redoStackRef.current.length === 0}
          />

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Zoom controls */}
          <span className="text-xs text-gray-400 tabular-nums">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            title="Zoom out"
          >
            <IconMinus className="w-4 h-4" />
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
            <IconPlus className="w-4 h-4" />
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
          tabIndex={0}
          className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900 relative cursor-grab active:cursor-grabbing outline-none"
          style={showGrid ? {
            backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
            backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
            backgroundPosition: `${panX}px ${panY}px`,
            backgroundRepeat: "repeat",
          } : undefined}
          onWheel={handleWheel}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onDrop={handleImageDrop}
          onDragOver={(e) => e.preventDefault()}
          onPaste={handleCanvasPaste}
        >
          {!selectedCanvasId && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <IconLayoutKanban className="w-16 h-16 mx-auto mb-4 opacity-30" />
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
                width: 10000,
                height: 10000,
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

                {/* Alignment guides */}
                {alignmentGuides.map((guide, idx) => (
                  <line
                    key={`align-${idx}`}
                    x1={guide.orientation === "vertical" ? guide.position : guide.start}
                    y1={guide.orientation === "horizontal" ? guide.position : guide.start}
                    x2={guide.orientation === "vertical" ? guide.position : guide.end}
                    y2={guide.orientation === "horizontal" ? guide.position : guide.end}
                    stroke="#3b82f6"
                    strokeWidth={guide.extended ? 1.5 : 1}
                    strokeDasharray={guide.extended ? "4,2" : undefined}
                    opacity={0.8}
                  />
                ))}

                {/* Distribution guides */}
                {distributionGuides.map((dGuide, idx) => (
                  <g key={`dist-${idx}`}>
                    {dGuide.positions.map((pos, pIdx) => (
                      <line
                        key={`dist-${idx}-${pIdx}`}
                        x1={dGuide.orientation === "vertical" ? pos : 0}
                        y1={dGuide.orientation === "horizontal" ? pos : 0}
                        x2={dGuide.orientation === "vertical" ? pos : 10000}
                        y2={dGuide.orientation === "horizontal" ? pos : 10000}
                        stroke="#22c55e"
                        strokeWidth={1}
                        strokeDasharray="3,3"
                        opacity={0.6}
                      />
                    ))}
                    {/* Gap indicators */}
                    {dGuide.positions.length >= 3 && (
                      <>
                        {dGuide.positions.slice(0, -1).map((pos, pIdx) => {
                          const nextPos = dGuide.positions[pIdx + 1];
                          const mid = (pos + nextPos) / 2;
                          return (
                            <text
                              key={`dist-label-${idx}-${pIdx}`}
                              x={dGuide.orientation === "vertical" ? mid : 50}
                              y={dGuide.orientation === "horizontal" ? mid : 50}
                              fill="#22c55e"
                              fontSize={10}
                              textAnchor="middle"
                              opacity={0.7}
                            >
                              ↔
                            </text>
                          );
                        })}
                      </>
                    )}
                  </g>
                ))}
              </svg>

              {/* Rubber-band selection rectangle */}
              {isSelecting && selectRect && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: Math.min(selectRect.startX, selectRect.currentX),
                    top: Math.min(selectRect.startY, selectRect.currentY),
                    width: Math.abs(selectRect.currentX - selectRect.startX),
                    height: Math.abs(selectRect.currentY - selectRect.startY),
                    backgroundColor: "rgba(59, 130, 246, 0.1)",
                    border: "2px solid #3b82f6",
                    borderRadius: 4,
                    zIndex: 999999,
                  }}
                />
              )}

              {/* Canvas items */}
              {[...items]
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((item) => (
                  <div
                    key={item.id}
                    onMouseDown={(e) => handleItemMouseDown(e, item)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    className={`absolute rounded-lg shadow-lg cursor-move transition-shadow hover:shadow-xl select-none overflow-hidden ${
                      selectedItemIds.has(item.id)
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
                      backgroundColor: item.type === "image" ? "transparent" : item.color,
                      zIndex: item.zIndex,
                    }}
                  >
                    {/* Image content */}
                    {item.type === "image" ? (
                      <>
                        <img
                          src={item.text}
                          alt=""
                          className="w-full h-full object-cover"
                          draggable={false}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        {/* Resize handle */}
                        <div
                          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-10"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            pushUndo();
                            const startX = e.clientX;
                            const startY = e.clientY;
                            // Record initial sizes for all selected items
                            const initialSizes = new Map<string, { width: number; height: number }>();
                            for (const sid of selectedItemIds) {
                              const si = items.find((i) => i.id === sid);
                              if (si) {
                                initialSizes.set(sid, { width: si.width, height: si.height });
                              }
                            }
                            if (initialSizes.size === 0) {
                              initialSizes.set(item.id, { width: item.width, height: item.height });
                            }
                            const handleMouseMove = (ev: MouseEvent) => {
                              const dx = (ev.clientX - startX) / zoom;
                              const dy = (ev.clientY - startY) / zoom;
                              setItems((prev) =>
                                prev.map((i) => {
                                  const initSize = initialSizes.get(i.id);
                                  if (!initSize) return i;
                                  let w = Math.max(ITEM_MIN_WIDTH, initSize.width + dx);
                                  let h = Math.max(ITEM_MIN_HEIGHT, initSize.height + dy);
                                  if (snapToGrid) {
                                    w = snapValue(w);
                                    h = snapValue(h);
                                  }
                                  return {
                                    ...i,
                                    width: w,
                                    height: h,
                                  };
                                }),
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
                            className="w-4 h-4 text-white drop-shadow-md"
                            viewBox="0 0 10 10"
                            fill="currentColor"
                          >
                            <path d="M10 0v2L2 10H0z" />
                          </svg>
                        </div>
                      </>
                    ) : (
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
                            pushUndo();
                            const startX = e.clientX;
                            const startY = e.clientY;
                            // Record initial sizes for all selected items
                            const initialSizes = new Map<string, { width: number; height: number }>();
                            for (const sid of selectedItemIds) {
                              const si = items.find((i) => i.id === sid);
                              if (si) {
                                initialSizes.set(sid, { width: si.width, height: si.height });
                              }
                            }
                            if (initialSizes.size === 0) {
                              initialSizes.set(item.id, { width: item.width, height: item.height });
                            }
                            const handleMouseMove = (ev: MouseEvent) => {
                              const dx = (ev.clientX - startX) / zoom;
                              const dy = (ev.clientY - startY) / zoom;
                              setItems((prev) =>
                                prev.map((i) => {
                                  const initSize = initialSizes.get(i.id);
                                  if (!initSize) return i;
                                  let w = Math.max(ITEM_MIN_WIDTH, initSize.width + dx);
                                  let h = Math.max(ITEM_MIN_HEIGHT, initSize.height + dy);
                                  if (snapToGrid) {
                                    w = snapValue(w);
                                    h = snapValue(h);
                                  }
                                  return {
                                    ...i,
                                    width: w,
                                    height: h,
                                  };
                                }),
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
                    )}
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

      {/* Image picker modal */}
      {showImagePicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowImagePicker(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 w-[480px] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Add Image
              </h3>
              <button
                onClick={() => setShowImagePicker(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setImagePickerTab("upload")}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  imagePickerTab === "upload"
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Upload New
              </button>
              <button
                onClick={() => setImagePickerTab("browse")}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  imagePickerTab === "browse"
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Browse Gallery
              </button>
            </div>

            {imagePickerTab === "upload" ? (
              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleImageDrop(e as unknown as React.DragEvent);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <IconPhoto className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  PNG, JPG, GIF, WebP, SVG (max 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {allUploads.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No images uploaded yet
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {allUploads.map((upload) => (
                      <button
                        key={upload.id}
                        onClick={() => handleSelectExistingImage(upload)}
                        className="aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:ring-2 hover:ring-blue-400 transition-all"
                      >
                        <img
                          src={upload.url}
                          alt={upload.originalName}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl"
          >
            &times;
          </button>
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


