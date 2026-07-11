import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { IconTrash, IconMinus, IconPlus, IconLayoutKanban, IconPointer, IconLink, IconTypography, IconMapPin, IconChevronUp, IconPhoto, IconLasso, IconArrowBackUp, IconArrowForwardUp, IconGridDots, IconMagnet, IconLayoutAlignCenter, IconHierarchy, IconNetwork, IconDotsVertical, IconShape, IconSquare, IconCircle, IconHexagon, IconCloud, IconDiamond, IconSettings, IconFolders, IconArrowsSplit2, IconCategory, IconMaximize, IconArrowUp, IconX, IconBold, IconItalic, IconDeviceDesktop, IconServer, IconDatabase, IconRouter, IconCloudComputing, IconHexagon as IconHexagon2 } from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router-dom";
import * as d3 from "d3";
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
  useGetCanvasVersionsQuery,
  useCreateCanvasVersionMutation,
  useRestoreCanvasVersionMutation,
  useDeleteCanvasVersionMutation,
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

const SHAPE_TYPES: { type: CanvasItem["type"]; label: string }[] = [
  { type: "rectangle", label: "Rectangle" },
  { type: "rounded_rectangle", label: "Rounded" },
  { type: "circle", label: "Circle" },
  { type: "diamond", label: "Diamond" },
  { type: "cylinder", label: "Cylinder" },
  { type: "cloud", label: "Cloud" },
  { type: "hexagon", label: "Hexagon" },
];

function ShapeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "rectangle":
    case "rounded_rectangle":
      return <IconSquare className={className} />;
    case "circle":
      return <IconCircle className={className} />;
    case "diamond":
      return <IconDiamond className={className} />;
    case "hexagon":
      return <IconHexagon className={className} />;
    case "cloud":
      return <IconCloud className={className} />;
    case "cylinder":
      return <IconSquare className={className} />;
    default:
      return <IconSquare className={className} />;
  }
}

/** Returns true if item is a diagram shape type */
function isDiagramItem(item: CanvasItem): boolean {
  return ["rectangle", "rounded_rectangle", "circle", "diamond", "cylinder", "cloud", "hexagon"].includes(item.type);
}

/** Escape XML special characters for SVG export */
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Recursively collect IDs of all children of group items */
function expandGroupChildren(
  selectedIds: Set<string>,
  items: CanvasItem[],
): Set<string> {
  const result = new Set(selectedIds);
  const stack = [...selectedIds];
  while (stack.length > 0) {
    const id = stack.pop()!;
    const item = items.find((i) => i.id === id);
    if (item?.childIds) {
      for (const childId of item.childIds) {
        if (!result.has(childId)) {
          result.add(childId);
          stack.push(childId);
        }
      }
    }
  }
  return result;
}

/** Compute edge port at shape boundary (N/S/E/W midpoint) */
function getEdgePort(item: CanvasItem, tx: number, ty: number): { x: number; y: number } {
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  // Snap to nearest edge midpoint
  if (absDx >= absDy) {
    return { x: cx + Math.sign(dx) * item.width / 2, y: cy };
  } else {
    return { x: cx, y: cy + Math.sign(dy) * item.height / 2 };
  }
}

function getShapeConstraints(type: CanvasItem["type"]) {
  switch (type) {
    case "circle":
      return { minWidth: 60, minHeight: 60, maxWidth: 800, maxHeight: 800, lockAspectRatio: true };
    case "diamond":
    case "hexagon":
      return { minWidth: 80, minHeight: 60, maxWidth: 800, maxHeight: 600, lockAspectRatio: false };
    case "cylinder":
      return { minWidth: 80, minHeight: 60, maxWidth: 600, maxHeight: 800, lockAspectRatio: false };
    case "cloud":
      return { minWidth: 100, minHeight: 60, maxWidth: 800, maxHeight: 500, lockAspectRatio: false };
    case "rounded_rectangle":
      return { minWidth: 80, minHeight: 50, maxWidth: 1200, maxHeight: 800, lockAspectRatio: false };
    default:
      return { minWidth: ITEM_MIN_WIDTH, minHeight: ITEM_MIN_HEIGHT, maxWidth: 1200, maxHeight: 800, lockAspectRatio: false };
  }
}

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

  // Phase 36: Versioning hooks
  const { data: canvasVersions = [] } = useGetCanvasVersionsQuery(selectedCanvasId ?? "", {
    skip: !selectedCanvasId,
  });
  const [createCanvasVersion] = useCreateCanvasVersionMutation();
  const [restoreCanvasVersion] = useRestoreCanvasVersionMutation();
  const [deleteCanvasVersion] = useDeleteCanvasVersionMutation();

  const getCanvasVersions = useCallback(
    (_canvasId: string) => canvasVersions,
    [canvasVersions],
  );

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
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [draggingItemIds, setDraggingItemIds] = useState<Set<string>>(new Set());
  const [dragStartPositions, setDragStartPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [itemColor, setItemColor] = useState(COLORS[0]);
  const [itemFontSize, setItemFontSize] = useState(14);
  const [itemFontWeight, setItemFontWeight] = useState<"normal" | "bold">("normal");
  const [itemFontStyle, setItemFontStyle] = useState<"normal" | "italic">("normal");
  const anchorDragItemIdRef = useRef<string | null>(null);

  // Phase 36: Architecture Canvas Enhancements
  const [showEdgeEditor, setShowEdgeEditor] = useState(false);
  const [edgeEditorPos, setEdgeEditorPos] = useState({ x: 0, y: 0 });
  const [showPortHints, setShowPortHints] = useState<string | null>(null);
  const [activePort, setActivePort] = useState<{ itemId: string; port: "N" | "S" | "E" | "W" } | null>(null);
  const [showStencilLibrary, setShowStencilLibrary] = useState(false);
  const [stencilCategory, setStencilCategory] = useState<"aws" | "erd" | "c4" | "network">("aws");
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [placementMode, setPlacementMode] = useState<{ shapeType: CanvasItem["type"] | null; tempItem: CanvasItem | null }>({ shapeType: null, tempItem: null });
  const [placementPreviewPos, setPlacementPreviewPos] = useState({ x: 0, y: 0 });

  // Rubber-band selection
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectRect, setSelectRect] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Grid & Snap
  const [showGrid, setShowGrid] = useState(false);
  const [gridSize, setGridSize] = useState<20 | 40 | 80>(40);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [snapToGuides, setSnapToGuides] = useState(false);
  // Alignment & Distribution guides
  const [alignmentGuides, setAlignmentGuides] = useState<Array<{ orientation: "horizontal" | "vertical"; position: number; start: number; end: number; extended: boolean }>>([]);
  const [distributionGuides, setDistributionGuides] = useState<Array<{ orientation: "horizontal" | "vertical"; positions: number[] }>>([]);

  // Auto-layout
  const [showAutoLayout, setShowAutoLayout] = useState(false);
  const [isLayouting, setIsLayouting] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showShapes, setShowShapes] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

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
              lockAspectRatio: i.lockAspectRatio,
              minWidth: i.minWidth,
              minHeight: i.minHeight,
              maxWidth: i.maxWidth,
              maxHeight: i.maxHeight,
              groupId: i.groupId,
              childIds: i.childIds,
              fontSize: i.fontSize,
              fontWeight: i.fontWeight,
              fontStyle: i.fontStyle,
            })),
            edges: updatedEdges.map((e) => ({
              id: e.id,
              sourceItemId: e.sourceItemId,
              targetItemId: e.targetItemId,
              type: e.type,
              label: e.label,
              edgeStyle: e.edgeStyle,
              arrowStart: e.arrowStart,
              arrowEnd: e.arrowEnd,
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

  // Close dropdowns on outside click
  const autoLayoutRef = useRef<HTMLDivElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showAutoLayout) return;
    const handler = (e: MouseEvent) => {
      if (autoLayoutRef.current && !autoLayoutRef.current.contains(e.target as Node)) {
        setShowAutoLayout(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [showAutoLayout]);
  useEffect(() => {
    if (!showOverflow) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [showOverflow]);

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

  const handleCreateDiagram = async () => {
    try {
      setShowGrid(true);
      setSnapToGrid(true);
      const canvas = await createCanvas("Untitled Diagram").unwrap();
      navigate(`/canvas/${canvas.id}`);
      dispatch(addToast("Diagram created", "success"));
    } catch {
      dispatch(addToast("Failed to create diagram", "error"));
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
      if (draggedItems.length === 0) {
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
    [],
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
      if (placementMode.shapeType && placementMode.tempItem) {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        const snappedX = snapToGrid ? snapValue(coords.x) : coords.x;
        const snappedY = snapToGrid ? snapValue(coords.y) : coords.y;
        pushUndo();
        const newItem: CanvasItem = {
          ...placementMode.tempItem,
          id: crypto.randomUUID(),
          canvasId: selectedCanvasId!,
          x: snappedX - placementMode.tempItem.width / 2,
          y: snappedY - placementMode.tempItem.height / 2,
          createdAt: new Date().toISOString(),
        };
        const updatedItems = [...items, newItem];
        setItems(updatedItems);
        setSelectedItemIds(new Set([newItem.id]));
        scheduleAutoSave(updatedItems, edges);
        dispatch(addToast(`${placementMode.shapeType.replace("_", " ")} placed`, "success"));
        return;
      }
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
    [activeTool, panX, panY, getCanvasCoords, placementMode, snapToGrid, snapValue, selectedCanvasId, pushUndo, items, edges, scheduleAutoSave, dispatch],
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (placementMode.shapeType && placementMode.tempItem) {
        const coords = getCanvasCoords(e.clientX, e.clientY);
        const snappedX = snapToGrid ? snapValue(coords.x) : coords.x;
        const snappedY = snapToGrid ? snapValue(coords.y) : coords.y;
        setPlacementPreviewPos({ x: snappedX, y: snappedY });
        return;
      }
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

        // Snap to alignment guides (if grid snap is off)
        if (snapToGuides && !snapToGrid) {
          const projected = items.map((item) => {
            if (!draggingItemIds.has(item.id)) return item;
            const startPos = dragStartPositions.get(item.id);
            if (!startPos) return item;
            return { ...item, x: startPos.x + deltaX, y: startPos.y + deltaY };
          });
          const otherItems = projected.filter((i) => !draggingItemIds.has(i.id));
          const draggedItems = projected.filter((i) => draggingItemIds.has(i.id));
          const alignTolerance = 5;
          let guideDx = 0;
          let guideDy = 0;
          let closestDist = alignTolerance;

          for (const d of draggedItems) {
            const dLeft = d.x;
            const dRight = d.x + d.width;
            const dTop = d.y;
            const dBottom = d.y + d.height;
            const dCx = d.x + d.width / 2;
            const dCy = d.y + d.height / 2;

            for (const other of otherItems) {
              const oLeft = other.x;
              const oRight = other.x + other.width;
              const oTop = other.y;
              const oBottom = other.y + other.height;
              const oCx = other.x + other.width / 2;
              const oCy = other.y + other.height / 2;

              const vPairs = [
                [dLeft, oLeft], [dLeft, oRight],
                [dRight, oLeft], [dRight, oRight],
                [dCx, oCx],
              ];
              for (const [edge, target] of vPairs) {
                const dist = Math.abs(edge - target);
                if (dist < closestDist) {
                  closestDist = dist;
                  guideDx = target - edge;
                }
              }

              const hPairs = [
                [dTop, oTop], [dTop, oBottom],
                [dBottom, oTop], [dBottom, oBottom],
                [dCy, oCy],
              ];
              for (const [edge, target] of hPairs) {
                const dist = Math.abs(edge - target);
                if (dist < closestDist) {
                  closestDist = dist;
                  guideDy = target - edge;
                }
              }
            }
          }

          deltaX += guideDx;
          deltaY += guideDy;
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
    [isSelecting, selectRect, getCanvasCoords, isPanning, draggingItemIds, dragStartPositions, panX, panY, zoom, dragOffset, snapToGrid, snapValue, snapToGuides, computeAlignmentGuides, items, placementMode, snapToGrid, snapValue],
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

  // ---- Auto-Layout ----

  const animateItems = useCallback(
    (targetItems: CanvasItem[], duration = 500) => {
      const startItems = items.map((i) => ({ ...i }));
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const ease = 1 - Math.pow(1 - t, 3);

        setItems((prev) =>
          prev.map((item) => {
            const target = targetItems.find((ti) => ti.id === item.id);
            if (!target) return item;
            const start = startItems.find((si) => si.id === item.id);
            if (!start) return item;
            return {
              ...item,
              x: start.x + (target.x - start.x) * ease,
              y: start.y + (target.y - start.y) * ease,
            };
          }),
        );

        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          setItems(targetItems);
          scheduleAutoSave(targetItems, edges);
        }
      };

      requestAnimationFrame(step);
    },
    [items, edges, scheduleAutoSave],
  );

  const handleForceLayout = useCallback(() => {
    if (items.length === 0) return;
    setIsLayouting(true);

    requestAnimationFrame(() => {
      pushUndo();

      const nodes: Array<{ id: string; width: number; height: number; x: number; y: number; r: number }> = items.map((i) => ({
        id: i.id,
        width: i.width,
        height: i.height,
        x: i.x + i.width / 2,
        y: i.y + i.height / 2,
        r: Math.sqrt(i.width * i.width + i.height * i.height) / 2 + 20,
      }));
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const links = edges
        .filter((e) => nodeMap.has(e.sourceItemId) && nodeMap.has(e.targetItemId))
        .map((e) => ({ source: e.sourceItemId, target: e.targetItemId }));

      const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
      const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;

      const linkDistance = (link: any) => {
        const src = nodes.find((n) => n.id === link.source);
        const tgt = nodes.find((n) => n.id === link.target);
        if (!src || !tgt) return 100;
        return src.r + tgt.r;
      };

      const simulation = d3
        .forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(-500))
        .force("link", d3.forceLink(links).id((d: any) => d.id).distance(linkDistance).strength(0.3))
        .force("center", d3.forceCenter(cx, cy))
        .force("collide", d3.forceCollide().radius((d: any) => d.r))
        .alphaDecay(0.05)
        .stop();

      for (let i = 0; i < 300; i++) {
        simulation.tick();
      }

      const targetItems: CanvasItem[] = items.map((item) => {
        const node = nodes.find((n) => n.id === item.id);
        if (!node) return item;
        return {
          ...item,
          x: node.x - item.width / 2,
          y: node.y - item.height / 2,
        };
      });

      setIsLayouting(false);
      animateItems(targetItems, 500);
    });
  }, [items, edges, pushUndo, animateItems]);

  const handleTreeLayout = useCallback(() => {
    if (items.length === 0) return;
    setIsLayouting(true);

    requestAnimationFrame(() => {
      pushUndo();

      // Build adjacency list from edges
      const adj = new Map<string, string[]>();
      for (const item of items) {
        adj.set(item.id, []);
      }
      for (const edge of edges) {
        adj.get(edge.sourceItemId)?.push(edge.targetItemId);
        adj.get(edge.targetItemId)?.push(edge.sourceItemId);
      }

      // Find root: item with most connections
      let rootId = items[0].id;
      let maxDegree = 0;
      for (const [id, neighbors] of adj) {
        if (neighbors.length > maxDegree) {
          maxDegree = neighbors.length;
          rootId = id;
        }
      }

      // BFS to assign levels (ignore back-edges via visited set)
      const visited = new Set<string>();
      const levels = new Map<string, number>();
      const queue: string[] = [rootId];
      visited.add(rootId);
      levels.set(rootId, 0);

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        const level = levels.get(nodeId) ?? 0;
        for (const neighbor of adj.get(nodeId) ?? []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            levels.set(neighbor, level + 1);
            queue.push(neighbor);
          }
        }
      }

      // Handle disconnected items
      for (const item of items) {
        if (!levels.has(item.id)) {
          levels.set(item.id, 0);
        }
      }

      // Group items by level
      const byLevel = new Map<number, string[]>();
      for (const [id, level] of levels) {
        if (!byLevel.has(level)) byLevel.set(level, []);
        byLevel.get(level)!.push(id);
      }

      const sortedLevels = [...byLevel.keys()].sort((a, b) => a - b);
      const PADDING = 30;
      const VERTICAL_PADDING = 40;

      // Compute max item height for vertical spacing
      const maxItemHeight = Math.max(...items.map((i) => i.height));
      const levelSpacing = maxItemHeight + VERTICAL_PADDING;

      // Layout each level based on actual item widths
      const levelLayouts = new Map<number, { positions: Map<string, number>; totalWidth: number }>();
      for (const level of sortedLevels) {
        const siblingIds = byLevel.get(level) ?? [];
        let cursorX = 0;
        const positions = new Map<string, number>();
        for (const id of siblingIds) {
          const item = items.find((i) => i.id === id);
          if (!item) continue;
          positions.set(id, cursorX);
          cursorX += item.width + PADDING;
        }
        const totalWidth = Math.max(0, cursorX - PADDING);
        levelLayouts.set(level, { positions, totalWidth });
      }

      // Calculate bounds of current items for centering
      const minX = Math.min(...items.map((i) => i.x));
      const maxX = Math.max(...items.map((i) => i.x + i.width));
      const minY = Math.min(...items.map((i) => i.y));
      const maxY = Math.max(...items.map((i) => i.y + i.height));
      const currentCx = (minX + maxX) / 2;
      const currentCy = (minY + maxY) / 2;

      const targetItems: CanvasItem[] = items.map((item) => {
        const level = levels.get(item.id) ?? 0;
        const layout = levelLayouts.get(level);
        if (!layout) return item;
        const posX = layout.positions.get(item.id);
        if (posX === undefined) return item;

        return {
          ...item,
          x: currentCx + posX - layout.totalWidth / 2,
          y: currentCy + (level - sortedLevels.length / 2) * levelSpacing,
        };
      });

      setIsLayouting(false);
      animateItems(targetItems, 500);
    });
  }, [items, edges, pushUndo, animateItems]);

  // ---- Item Handling ----

  const handleItemMouseDown = useCallback(
    (e: React.MouseEvent, item: CanvasItem) => {
      e.stopPropagation();
      if (activeTool === "connect") {
        if (connectSourceId === null) {
          setConnectSourceId(item.id);
        } else if (connectSourceId !== item.id) {
          // Prevent duplicate connections
          const exists = edges.some(
            (e) =>
              (e.sourceItemId === connectSourceId && e.targetItemId === item.id) ||
              (e.sourceItemId === item.id && e.targetItemId === connectSourceId),
          );
          if (exists) {
            setConnectSourceId(null);
            dispatch(addToast("Connection already exists", "info"));
            return;
          }
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

        // Expand to include children of any group items in the selection
        const expandedIds = expandGroupChildren(newSelectedIds, items);

        // Snapshot for undo at drag start (one entry for the whole drag)
        pushUndo();

        // Record start positions for all dragged items
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const offsetX = (e.clientX - rect.left - panX) / zoom - item.x;
        const offsetY = (e.clientY - rect.top - panY) / zoom - item.y;
        setDragOffset({ x: offsetX, y: offsetY });

        const startPositions = new Map<string, { x: number; y: number }>();
        for (const sid of expandedIds) {
          const si = items.find((i) => i.id === sid);
          if (si) {
            startPositions.set(sid, { x: si.x, y: si.y });
          }
        }
        setDragStartPositions(startPositions);
        setDraggingItemIds(expandedIds);
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
    const expandedIds = expandGroupChildren(selectedItemIds, items);
    const updatedItems = items.filter((i) => !expandedIds.has(i.id));
    const deletedEdgeIds = edges
      .filter(
        (e) => expandedIds.has(e.sourceItemId) || expandedIds.has(e.targetItemId),
      )
      .map((e) => e.id);
    const updatedEdges = edges.filter(
      (e) => !expandedIds.has(e.sourceItemId) && !expandedIds.has(e.targetItemId),
    );
    setItems(updatedItems);
    setEdges(updatedEdges);
    setSelectedItemIds(new Set());
    scheduleAutoSave(updatedItems, updatedEdges, {
      deletedItemIds: [...expandedIds],
      deletedEdgeIds: deletedEdgeIds,
    });
    dispatch(addToast(expandedIds.size > 1 ? `${expandedIds.size} items deleted` : "Item deleted", "info"));
  }, [selectedItemIds, items, edges, scheduleAutoSave, dispatch, pushUndo]);

  const handleColorChange = useCallback(
    (color: string) => {
      if (selectedItemIds.size === 0) return;
      pushUndo();
      const expandedIds = expandGroupChildren(selectedItemIds, items);
      setItems((prev) =>
        prev.map((item) =>
          expandedIds.has(item.id) ? { ...item, color } : item,
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
    const expandedIds = expandGroupChildren(selectedItemIds, items);
    const maxZ = Math.max(...items.map((i) => i.zIndex), 0);
    let nextZ = maxZ + 1;
    setItems((prev) =>
      prev.map((item) => {
        if (!expandedIds.has(item.id)) return item;
        return { ...item, zIndex: nextZ++ };
      }),
    );
    scheduleAutoSave(items, edges);
  }, [selectedItemIds, items, edges, scheduleAutoSave, pushUndo]);

  const handleFontSizeChange = useCallback(
    (size: number) => {
      if (selectedItemIds.size === 0) return;
      pushUndo();
      const expandedIds = expandGroupChildren(selectedItemIds, items);
      setItems((prev) =>
        prev.map((item) =>
          expandedIds.has(item.id) ? { ...item, fontSize: size } : item,
        ),
      );
      setItemFontSize(size);
      scheduleAutoSave(items, edges);
    },
    [selectedItemIds, items, edges, scheduleAutoSave, pushUndo],
  );

  const handleFontWeightToggle = useCallback(() => {
    if (selectedItemIds.size === 0) return;
    const newWeight = itemFontWeight === "bold" ? "normal" : "bold";
    pushUndo();
    const expandedIds = expandGroupChildren(selectedItemIds, items);
    setItems((prev) =>
      prev.map((item) =>
        expandedIds.has(item.id) ? { ...item, fontWeight: newWeight as "normal" | "bold" } : item,
      ),
    );
    setItemFontWeight(newWeight as "normal" | "bold");
    scheduleAutoSave(items, edges);
  }, [selectedItemIds, itemFontWeight, items, edges, scheduleAutoSave, pushUndo]);

  const handleFontStyleToggle = useCallback(() => {
    if (selectedItemIds.size === 0) return;
    const newStyle = itemFontStyle === "italic" ? "normal" : "italic";
    pushUndo();
    const expandedIds = expandGroupChildren(selectedItemIds, items);
    setItems((prev) =>
      prev.map((item) =>
        expandedIds.has(item.id) ? { ...item, fontStyle: newStyle as "normal" | "italic" } : item,
      ),
    );
    setItemFontStyle(newStyle as "normal" | "italic");
    scheduleAutoSave(items, edges);
  }, [selectedItemIds, itemFontStyle, items, edges, scheduleAutoSave, pushUndo]);

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

  const handleAddShape = useCallback(
    (shapeType: CanvasItem["type"]) => {
      if (!selectedCanvasId) return;
      pushUndo();
      const newItem: CanvasItem = {
        id: crypto.randomUUID(),
        canvasId: selectedCanvasId,
        noteId: null,
        type: shapeType,
        text: "",
        color: "#3b82f6",
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 140,
        height: 100,
        zIndex: items.length,
        createdAt: new Date().toISOString(),
      };
      const updatedItems = [...items, newItem];
      setItems(updatedItems);
      setSelectedItemIds(new Set([newItem.id]));
      setShowShapes(false);
      scheduleAutoSave(updatedItems, edges);
      dispatch(addToast(`${shapeType.replace("_", " ")} added`, "success"));
    },
    [selectedCanvasId, items, edges, scheduleAutoSave, dispatch, pushUndo],
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

  // ---- Phase 36: Edge Property Editor ----

  const handleSelectEdge = useCallback(
    (edgeId: string, e: React.MouseEvent, _clientX: number, _clientY: number) => {
      e.stopPropagation();
      setSelectedEdgeId(selectedEdgeId === edgeId ? null : edgeId);
      setSelectedItemIds(new Set());
      if (selectedEdgeId !== edgeId) {
        const edge = edges.find((ed) => ed.id === edgeId);
        if (edge) {
          const src = items.find((i) => i.id === edge.sourceItemId);
          const tgt = items.find((i) => i.id === edge.targetItemId);
          if (src && tgt) {
            const midX = (src.x + src.width / 2 + tgt.x + tgt.width / 2) / 2;
            const midY = (src.y + src.height / 2 + tgt.y + tgt.height / 2) / 2;
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
              setEdgeEditorPos({
                x: (midX + panX) * zoom - rect.left + 20,
                y: (midY + panY) * zoom - rect.top - 40,
              });
            }
          }
          setShowEdgeEditor(true);
        }
      }
    },
    [selectedEdgeId, edges, items, panX, panY, zoom],
  );

  const handleUpdateEdge = useCallback(
    (edgeId: string, updates: Partial<Pick<CanvasEdge, "label" | "edgeStyle" | "arrowStart" | "arrowEnd" | "type">>) => {
      pushUndo();
      const updatedEdges = edges.map((ed) =>
        ed.id === edgeId ? { ...ed, ...updates } : ed,
      );
      setEdges(updatedEdges);
      scheduleAutoSave(items, updatedEdges);
    },
    [edges, items, scheduleAutoSave, pushUndo],
  );

  // ---- Phase 36: Port Visualization ----

  const handleItemMouseEnter = useCallback((itemId: string) => {
    setShowPortHints(itemId);
    setHoveredItemId(itemId);
  }, []);

  const handleItemMouseLeave = useCallback((itemId: string) => {
    if (showPortHints === itemId) setShowPortHints(null);
    if (hoveredItemId === itemId) setHoveredItemId(null);
    if (activePort?.itemId === itemId) setActivePort(null);
  }, [showPortHints, hoveredItemId, activePort]);

  const handlePortHover = useCallback((itemId: string, port: "N" | "S" | "E" | "W") => {
    setActivePort({ itemId, port });
  }, []);

  const closeEdgeEditor = useCallback(() => {
    setShowEdgeEditor(false);
    setSelectedEdgeId(null);
  }, []);

  function getPortPositions(item: CanvasItem) {
    return [
      { label: "N" as const, x: item.x + item.width / 2, y: item.y },
      { label: "S" as const, x: item.x + item.width / 2, y: item.y + item.height },
      { label: "E" as const, x: item.x + item.width, y: item.y + item.height / 2 },
      { label: "W" as const, x: item.x, y: item.y + item.height / 2 },
    ];
  }

  // ---- Phase 36: Grouping ----

  const handleGroupItems = useCallback(() => {
    if (selectedItemIds.size < 2) return;
    pushUndo();
    const groupId = crypto.randomUUID();
    const groupItems = items.filter((i) => selectedItemIds.has(i.id));
    const minX = Math.min(...groupItems.map((i) => i.x));
    const minY = Math.min(...groupItems.map((i) => i.y));
    const maxX = Math.max(...groupItems.map((i) => i.x + i.width));
    const maxY = Math.max(...groupItems.map((i) => i.y + i.height));
    
    const groupItem: CanvasItem = {
      id: groupId,
      canvasId: selectedCanvasId!,
      noteId: null,
      type: "group",
      text: "Group",
      color: "#64748b",
      x: minX - 10,
      y: minY - 10,
      width: maxX - minX + 20,
      height: maxY - minY + 20,
      zIndex: Math.min(...groupItems.map((i) => i.zIndex)) - 1,
      createdAt: new Date().toISOString(),
      fontSize: 14,
      fontWeight: "bold",
      fontStyle: "normal",
      lockAspectRatio: false,
      childIds: groupItems.map((i) => i.id),
    };

    const updatedItems = items.map((i) =>
      selectedItemIds.has(i.id) ? { ...i, groupId } : i,
    );
    setItems([...updatedItems, groupItem]);
    setSelectedItemIds(new Set([groupId]));
    scheduleAutoSave([...updatedItems, groupItem], edges);
    dispatch(addToast(`${selectedItemIds.size} items grouped`, "success"));
  }, [selectedItemIds, items, selectedCanvasId, edges, scheduleAutoSave, dispatch, pushUndo]);

  const handleUngroupItems = useCallback(() => {
    if (selectedItemIds.size !== 1) return;
    const groupItem = items.find((i) => i.id === [...selectedItemIds][0]);
    if (!groupItem || groupItem.type !== "group") return;
    pushUndo();
    const childIds = groupItem.childIds || [];
    const updatedItems = items
      .filter((i) => i.id !== groupItem.id)
      .map((i) => (childIds.includes(i.id) ? { ...i, groupId: null } : i));
    setItems(updatedItems);
    setSelectedItemIds(new Set(childIds));
    scheduleAutoSave(updatedItems, edges);
    dispatch(addToast("Group ungrouped", "success"));
  }, [selectedItemIds, items, edges, scheduleAutoSave, dispatch, pushUndo]);

  // ---- Phase 36: Stencil Library ----

  const STENCIL_TEMPLATES = useMemo(() => ({
    aws: [
      { type: "rectangle" as CanvasItem["type"], label: "EC2", icon: IconDeviceDesktop, color: "#FF9900" },
      { type: "cylinder" as CanvasItem["type"], label: "RDS", icon: IconDatabase, color: "#527FFF" },
      { type: "cloud" as CanvasItem["type"], label: "S3", icon: IconCloudComputing, color: "#569A31" },
      { type: "hexagon" as CanvasItem["type"], label: "Lambda", icon: IconHexagon2, color: "#FF9900" },
      { type: "diamond" as CanvasItem["type"], label: "Route 53", icon: IconDiamond, color: "#FF9900" },
      { type: "rectangle" as CanvasItem["type"], label: "ALB", icon: IconServer, color: "#FF9900" },
    ],
    erd: [
      { type: "rectangle" as CanvasItem["type"], label: "Entity", icon: IconSquare, color: "#3B82F6" },
      { type: "diamond" as CanvasItem["type"], label: "Relationship", icon: IconDiamond, color: "#EF4444" },
      { type: "rounded_rectangle" as CanvasItem["type"], label: "Attribute", icon: IconCircle, color: "#22C55E" },
      { type: "hexagon" as CanvasItem["type"], label: "Weak Entity", icon: IconHexagon2, color: "#F59E0B" },
    ],
    c4: [
      { type: "rectangle" as CanvasItem["type"], label: "System", icon: IconServer, color: "#1168BD" },
      { type: "cylinder" as CanvasItem["type"], label: "Database", icon: IconDatabase, color: "#1168BD" },
      { type: "rounded_rectangle" as CanvasItem["type"], label: "Container", icon: IconSquare, color: "#1168BD" },
      { type: "cloud" as CanvasItem["type"], label: "External System", icon: IconCloudComputing, color: "#1168BD" },
    ],
    network: [
      { type: "rectangle" as CanvasItem["type"], label: "Router", icon: IconRouter, color: "#6B7280" },
      { type: "hexagon" as CanvasItem["type"], label: "Switch", icon: IconHexagon2, color: "#6B7280" },
      { type: "cylinder" as CanvasItem["type"], label: "Server", icon: IconServer, color: "#6B7280" },
      { type: "diamond" as CanvasItem["type"], label: "Firewall", icon: IconDiamond, color: "#EF4444" },
    ],
  }), []);

  const handleAddStencilItem = useCallback(
    (template: { type: CanvasItem["type"]; label: string; color: string }) => {
      if (!selectedCanvasId) return;
      pushUndo();
      const newItem: CanvasItem = {
        id: crypto.randomUUID(),
        canvasId: selectedCanvasId,
        noteId: null,
        type: template.type,
        text: template.label,
        color: template.color,
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 140,
        height: 100,
        zIndex: items.length,
        createdAt: new Date().toISOString(),
        fontSize: 14,
        fontWeight: "bold",
        fontStyle: "normal",
        lockAspectRatio: getShapeConstraints(template.type).lockAspectRatio,
        minWidth: getShapeConstraints(template.type).minWidth,
        minHeight: getShapeConstraints(template.type).minHeight,
        maxWidth: getShapeConstraints(template.type).maxWidth,
        maxHeight: getShapeConstraints(template.type).maxHeight,
      };
      const updatedItems = [...items, newItem];
      setItems(updatedItems);
      setSelectedItemIds(new Set([newItem.id]));
      scheduleAutoSave(updatedItems, edges);
      dispatch(addToast(`${template.label} added from stencil`, "success"));
    },
    [selectedCanvasId, items, edges, scheduleAutoSave, dispatch, pushUndo, getShapeConstraints],
  );

  // ---- Phase 36: Canvas Versioning ----

  const [createVersionTitle, setCreateVersionTitle] = useState("");
  const [createVersionDescription, setCreateVersionDescription] = useState("");

  const handleCreateVersion = useCallback(async () => {
    if (!selectedCanvasId || !createVersionTitle.trim()) return;
    try {
      await createCanvasVersion({
        canvasId: selectedCanvasId,
        title: createVersionTitle,
        description: createVersionDescription,
        items,
        edges,
        thumbnail: undefined,
      }).unwrap();
      setCreateVersionTitle("");
      setCreateVersionDescription("");
      dispatch(addToast("Version saved", "success"));
    } catch {
      dispatch(addToast("Failed to save version", "error"));
    }
  }, [selectedCanvasId, createVersionTitle, createVersionDescription, items, edges, dispatch]);

  const handleRestoreVersion = useCallback(async (versionId: string) => {
    if (!selectedCanvasId) return;
    try {
      const result = await restoreCanvasVersion({ canvasId: selectedCanvasId, versionId }).unwrap();
      dispatch(addToast("Version restored", "success"));
      return result;
    } catch {
      dispatch(addToast("Failed to restore version", "error"));
    }
  }, [selectedCanvasId, dispatch]);

  const handleDeleteVersion = useCallback(async (versionId: string) => {
    if (!selectedCanvasId) return;
    try {
      await deleteCanvasVersion({ canvasId: selectedCanvasId, versionId }).unwrap();
      dispatch(addToast("Version deleted", "success"));
    } catch {
      dispatch(addToast("Failed to delete version", "error"));
    }
  }, [selectedCanvasId, dispatch]);

  // ---- Phase 36: Keyboard-driven Placement ----

  const handleShapeSelectForPlacement = useCallback(
    (shapeType: CanvasItem["type"]) => {
      if (!selectedCanvasId) return;
      const constraints = getShapeConstraints(shapeType);
      const tempItem: CanvasItem = {
        id: "preview-" + Date.now(),
        canvasId: selectedCanvasId,
        noteId: null,
        type: shapeType,
        text: shapeType.replace("_", " "),
        color: COLORS[0],
        x: 0,
        y: 0,
        width: constraints.minWidth || 140,
        height: constraints.minHeight || 100,
        zIndex: items.length,
        createdAt: new Date().toISOString(),
        fontSize: 14,
        fontWeight: "normal",
        fontStyle: "normal",
        lockAspectRatio: constraints.lockAspectRatio,
        minWidth: constraints.minWidth,
        minHeight: constraints.minHeight,
        maxWidth: constraints.maxWidth,
        maxHeight: constraints.maxHeight,
      };
      setPlacementMode({ shapeType, tempItem });
      setPlacementPreviewPos({ x: 100, y: 100 });
      setActiveTool("select");
    },
    [selectedCanvasId, items, getShapeConstraints],
  );

  // Update handleKeyDown for placement mode
  const handleKeyDownWithPlacement = useCallback(
    (e: KeyboardEvent) => {
      if (placementMode.shapeType && placementMode.tempItem) {
        switch (e.key) {
          case "Tab":
            e.preventDefault();
            const shapeTypes: CanvasItem["type"][] = ["rectangle", "rounded_rectangle", "circle", "diamond", "hexagon", "cylinder", "cloud"];
            const currentIndex = shapeTypes.indexOf(placementMode.shapeType);
            const nextIndex = (currentIndex + 1) % shapeTypes.length;
            handleShapeSelectForPlacement(shapeTypes[nextIndex]);
            return;
          case "Escape":
            setPlacementMode({ shapeType: null, tempItem: null });
            setPlacementPreviewPos({ x: 0, y: 0 });
            return;
          default:
            if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              return;
            }
        }
      }
      
      // Regular keyboard shortcuts
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
      if (selectedEdgeId && (e.key === "Delete" || e.key === "Backspace")) {
        if (editingItemId) return;
        e.preventDefault();
        // Use handleDeleteEdge logic directly
        pushUndo();
        const updatedEdges = edges.filter((ed) => ed.id !== selectedEdgeId);
        setEdges(updatedEdges);
        scheduleAutoSave(items, updatedEdges, { deletedEdgeIds: [selectedEdgeId] });
        setSelectedEdgeId(null);
      }
    },
    [placementMode, placementPreviewPos, selectedCanvasId, items, edges, scheduleAutoSave, dispatch, pushUndo, selectedEdgeId, handleUndo, handleRedo, editingItemId, getShapeConstraints, handleShapeSelectForPlacement]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDownWithPlacement);
    return () => {
      window.removeEventListener("keydown", handleKeyDownWithPlacement);
    };
  }, [handleKeyDownWithPlacement]);

  // ---- Phase 36: Font/Color sync with selection ----

  useEffect(() => {
    if (selectedItemIds.size === 1) {
      const sel = items.find((i) => i.id === [...selectedItemIds][0]);
      if (sel) {
        setItemColor(sel.color);
        setItemFontSize(sel.fontSize ?? 14);
        setItemFontWeight(sel.fontWeight ?? "normal");
        setItemFontStyle(sel.fontStyle ?? "normal");
      }
    }
  }, [selectedItemIds, items]);

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
          // object-fit: cover — crop to container aspect ratio
          const imgAspect = img.naturalWidth / img.naturalHeight;
          const containerAspect = w / h;
          let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
          if (imgAspect > containerAspect) {
            const cropW = img.naturalHeight * containerAspect;
            sx = (img.naturalWidth - cropW) / 2;
            sw = cropW;
          } else if (imgAspect < containerAspect) {
            const cropH = img.naturalWidth / containerAspect;
            sy = (img.naturalHeight - cropH) / 2;
            sh = cropH;
          }
          ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
          ctx.restore();
        }
      } else {
        // Shape-specific shadow + fill + stroke
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 2;

        if (item.type === "rectangle") {
          ctx.fillRect(x + 2, y + 2, w, h);
          ctx.fillStyle = item.color;
          ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x, y, w, h);
        } else if (item.type === "rounded_rectangle") {
          ctx.beginPath();
          ctx.roundRect(x + 2, y + 2, w, h, 12);
          ctx.fill();
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 12);
          ctx.fill();
          ctx.stroke();
        } else if (item.type === "circle") {
          ctx.beginPath();
          ctx.ellipse(x + w / 2 + 2, y + h / 2 + 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (item.type === "diamond") {
          ctx.beginPath();
          ctx.moveTo(x + w / 2 + 2, y + 2);
          ctx.lineTo(x + w + 2, y + h / 2 + 2);
          ctx.lineTo(x + w / 2 + 2, y + h + 2);
          ctx.lineTo(x + 2, y + h / 2 + 2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.moveTo(x + w / 2, y);
          ctx.lineTo(x + w, y + h / 2);
          ctx.lineTo(x + w / 2, y + h);
          ctx.lineTo(x, y + h / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (item.type === "hexagon") {
          ctx.beginPath();
          ctx.moveTo(x + w * 0.25 + 2, y + 2);
          ctx.lineTo(x + w * 0.75 + 2, y + 2);
          ctx.lineTo(x + w + 2, y + h / 2 + 2);
          ctx.lineTo(x + w * 0.75 + 2, y + h + 2);
          ctx.lineTo(x + w * 0.25 + 2, y + h + 2);
          ctx.lineTo(x + 2, y + h / 2 + 2);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.moveTo(x + w * 0.25, y);
          ctx.lineTo(x + w * 0.75, y);
          ctx.lineTo(x + w, y + h / 2);
          ctx.lineTo(x + w * 0.75, y + h);
          ctx.lineTo(x + w * 0.25, y + h);
          ctx.lineTo(x, y + h / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (item.type === "cylinder") {
          const rx = w / 2 - 2;
          const ry = 10;
          // Shadow
          ctx.fillStyle = "rgba(0,0,0,0.1)";
          ctx.beginPath();
          ctx.rect(x + 2, y + 14, w - 4, h - 24);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + w / 2 + 2, y + 12 + 2, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + w / 2 + 2, y + h - 12 + 2, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
          // Fill
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.rect(x + 2, y + 12, w - 4, h - 24);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + 12, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + h - 12, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
          // Stroke edges
          ctx.beginPath();
          ctx.moveTo(x + 2, y + 12);
          ctx.lineTo(x + 2, y + h - 12);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + w - 2, y + 12);
          ctx.lineTo(x + w - 2, y + h - 12);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + 12, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + h - 12, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (item.type === "cloud") {
          // Shadow
          ctx.fillStyle = "rgba(0,0,0,0.1)";
          ctx.beginPath();
          ctx.moveTo(x + w * 0.25 + 2, y + h - 2);
          ctx.bezierCurveTo(x + w * 0.05 + 2, y + h - 2, x + w * 0.05 + 2, y + h * 0.4 + 2, x + w * 0.18 + 2, y + h * 0.4 + 2);
          ctx.bezierCurveTo(x + w * 0.12 + 2, y + h * 0.15 + 2, x + w * 0.35 + 2, y + h * 0.08 + 2, x + w * 0.5 + 2, y + h * 0.2 + 2);
          ctx.bezierCurveTo(x + w * 0.55 + 2, y + h * 0.05 + 2, x + w * 0.75 + 2, y + h * 0.05 + 2, x + w * 0.8 + 2, y + h * 0.25 + 2);
          ctx.bezierCurveTo(x + w * 0.95 + 2, y + h * 0.2 + 2, x + w * 0.95 + 2, y + h * 0.5 + 2, x + w * 0.82 + 2, y + h * 0.55 + 2);
          ctx.bezierCurveTo(x + w * 0.95 + 2, y + h * 0.6 + 2, x + w * 0.9 + 2, y + h - 2, x + w * 0.7 + 2, y + h - 2);
          ctx.closePath();
          ctx.fill();
          // Fill
          ctx.fillStyle = item.color;
          ctx.beginPath();
          ctx.moveTo(x + w * 0.25, y + h);
          ctx.bezierCurveTo(x + w * 0.05, y + h, x + w * 0.05, y + h * 0.4, x + w * 0.18, y + h * 0.4);
          ctx.bezierCurveTo(x + w * 0.12, y + h * 0.15, x + w * 0.35, y + h * 0.08, x + w * 0.5, y + h * 0.2);
          ctx.bezierCurveTo(x + w * 0.55, y + h * 0.05, x + w * 0.75, y + h * 0.05, x + w * 0.8, y + h * 0.25);
          ctx.bezierCurveTo(x + w * 0.95, y + h * 0.2, x + w * 0.95, y + h * 0.5, x + w * 0.82, y + h * 0.55);
          ctx.bezierCurveTo(x + w * 0.95, y + h * 0.6, x + w * 0.9, y + h, x + w * 0.7, y + h);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Fallback for unknown types (note_pin, text_box, etc.)
          ctx.fillRect(x + 2, y + 2, w, h);
          ctx.fillStyle = item.color;
          ctx.fillRect(x, y, w, h);
        }

        // Text
        ctx.fillStyle = "#ffffff";
        const fontSize = item.fontSize ?? 13;
        const fontWeight = item.fontWeight === "bold" ? "bold " : "";
        const fontStyle = item.fontStyle === "italic" ? "italic " : "";
        ctx.font = `${fontStyle}${fontWeight}${fontSize}px system-ui, sans-serif`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";

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

  const handleExportSvg = useCallback(() => {
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

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${exportWidth}" height="${exportHeight}" viewBox="0 0 ${exportWidth} ${exportHeight}">`;
    svg += `<rect width="${exportWidth}" height="${exportHeight}" fill="white"/>`;

    svg += `<defs>`;
    svg += `<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8"/></marker>`;
    svg += `<marker id="arrowhead-start" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto"><polygon points="10 0, 0 3.5, 10 7" fill="#94a3b8"/></marker>`;
    svg += `</defs>`;

    // Edges
    for (const edge of edges) {
      const src = items.find((i) => i.id === edge.sourceItemId);
      const tgt = items.find((i) => i.id === edge.targetItemId);
      if (!src || !tgt) continue;
      const sx = src.x + src.width / 2 - minX;
      const sy = src.y + src.height / 2 - minY;
      const tx = tgt.x + tgt.width / 2 - minX;
      const ty = tgt.y + tgt.height / 2 - minY;
      const dash =
        edge.edgeStyle === "dashed" ? ' stroke-dasharray="6,3"' :
        edge.edgeStyle === "dotted" ? ' stroke-dasharray="2,2"' : "";
      const markerStart = edge.arrowStart ? ' marker-start="url(#arrowhead-start)"' : "";
      const markerEnd = (edge.arrowEnd ?? true) ? ' marker-end="url(#arrowhead)"' : "";
      const d = edge.type === "curved"
        ? `M ${sx} ${sy} Q ${(sx + tx) / 2} ${Math.min(sy, ty) - 40} ${tx} ${ty}`
        : `M ${sx} ${sy} L ${tx} ${ty}`;
      svg += `<path d="${d}" fill="none" stroke="#94a3b8" stroke-width="2"${dash}${markerStart}${markerEnd}/>`;
      if (edge.label) {
        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2;
        svg += `<text x="${midX}" y="${midY - 6}" text-anchor="middle" font-size="11" font-family="system-ui, sans-serif" fill="#64748b">${escapeXml(edge.label)}</text>`;
      }
    }

    // Items
    for (const item of [...items].sort((a, b) => a.zIndex - b.zIndex)) {
      const x = item.x - minX;
      const y = item.y - minY;
      const w = item.width;
      const h = item.height;
      if (item.type === "image") {
        svg += `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${item.text}"/>`;
      } else if (["rectangle", "rounded_rectangle", "circle", "diamond", "hexagon", "cylinder", "cloud"].includes(item.type)) {
        const stroke = ' stroke="#64748b" stroke-width="2"';
        if (item.type === "rectangle") {
          svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${item.color}"${stroke}/>`;
        } else if (item.type === "rounded_rectangle") {
          svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" ry="12" fill="${item.color}"${stroke}/>`;
        } else if (item.type === "circle") {
          svg += `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${item.color}"${stroke}/>`;
        } else if (item.type === "diamond") {
          svg += `<polygon points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}" fill="${item.color}"${stroke}/>`;
        } else if (item.type === "hexagon") {
          svg += `<polygon points="${x + w * 0.25},${y} ${x + w * 0.75},${y} ${x + w},${y + h / 2} ${x + w * 0.75},${y + h} ${x + w * 0.25},${y + h} ${x},${y + h / 2}" fill="${item.color}"${stroke}/>`;
        } else if (item.type === "cylinder") {
          svg += `<rect x="${x + 2}" y="${y + 12}" width="${w - 4}" height="${h - 24}" fill="${item.color}"${stroke}/>`;
          svg += `<ellipse cx="${x + w / 2}" cy="${y + 12}" rx="${w / 2 - 2}" ry="10" fill="${item.color}"${stroke}/>`;
          svg += `<ellipse cx="${x + w / 2}" cy="${y + h - 12}" rx="${w / 2 - 2}" ry="10" fill="${item.color}"${stroke}/>`;
          svg += `<path d="M ${x + 2} ${y + 12} L ${x + 2} ${y + h - 12}" fill="none"${stroke}/>`;
          svg += `<path d="M ${x + w - 2} ${y + 12} L ${x + w - 2} ${y + h - 12}" fill="none"${stroke}/>`;
        } else if (item.type === "cloud") {
          svg += `<path d="M ${x + w * 0.25} ${y + h - 4} C ${x + w * 0.05} ${y + h - 4}, ${x + w * 0.05} ${y + h * 0.4}, ${x + w * 0.18} ${y + h * 0.4} C ${x + w * 0.12} ${y + h * 0.15}, ${x + w * 0.35} ${y + h * 0.08}, ${x + w * 0.5} ${y + h * 0.2} C ${x + w * 0.55} ${y + h * 0.05}, ${x + w * 0.75} ${y + h * 0.05}, ${x + w * 0.8} ${y + h * 0.25} C ${x + w * 0.95} ${y + h * 0.2}, ${x + w * 0.95} ${y + h * 0.5}, ${x + w * 0.82} ${y + h * 0.55} C ${x + w * 0.95} ${y + h * 0.6}, ${x + w * 0.9} ${y + h - 4}, ${x + w * 0.7} ${y + h - 4} Z" fill="${item.color}"${stroke}/>`;
        }
        if (item.text) {
          svg += `<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="central" font-size="13" font-family="system-ui, sans-serif" fill="white">${escapeXml(item.text)}</text>`;
        }
      } else {
        svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${item.color}"/>`;
        if (item.text) {
          svg += `<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="central" font-size="13" font-family="system-ui, sans-serif" fill="white">${escapeXml(item.text)}</text>`;
        }
      }
    }

    svg += "</svg>";

    const blob = new Blob([svg], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.download = `${canvasTitle || "canvas"}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    dispatch(addToast("Canvas exported as SVG", "success"));
  }, [items, edges, canvasTitle, dispatch]);

  const handleExportMermaid = useCallback(() => {
    if (items.length === 0) {
      dispatch(addToast("Canvas is empty", "info"));
      return;
    }

    const nodeIds = new Map<string, string>();
    let counter = 0;
    let code = "graph TD\n";

    const getNodeId = (item: CanvasItem): string => {
      if (nodeIds.has(item.id)) return nodeIds.get(item.id)!;
      const id = `N${counter++}`;
      nodeIds.set(item.id, id);
      const label = (item.text || item.type.replace("_", " ")).replace(/"/g, '\\"');
      let nodeDef: string;
      switch (item.type) {
        case "rounded_rectangle":
          nodeDef = `${id}("${label}")`;
          break;
        case "circle":
          nodeDef = `${id}(("${label}"))`;
          break;
        case "diamond":
          nodeDef = `${id}{"${label}"}`;
          break;
        case "hexagon":
          nodeDef = `${id}{{"${label}"}}`;
          break;
        case "cylinder":
          nodeDef = `${id}[("${label}")]`;
          break;
        case "cloud":
          nodeDef = `${id}>"${label}"]`;
          break;
        default:
          nodeDef = `${id}["${label}"]`;
          break;
      }
      code += `  ${nodeDef}\n`;
      return id;
    };

    items.forEach((item) => getNodeId(item));

    for (const edge of edges) {
      const srcId = nodeIds.get(edge.sourceItemId);
      const tgtId = nodeIds.get(edge.targetItemId);
      if (!srcId || !tgtId) continue;
      const hasArrow = edge.arrowEnd ?? true;
      const connector = hasArrow ? "-->" : "---";
      const label = edge.label ? `|"${edge.label.replace(/"/g, '\\"')}"|` : "";
      const style = edge.edgeStyle === "dashed" ? "-.->" : edge.edgeStyle === "dotted" ? "-..->" : undefined;
      if (hasArrow && style) {
        code += `  ${srcId} ${style} ${tgtId}\n`;
      } else {
        code += `  ${srcId} ${connector} ${label} ${tgtId}\n`;
      }
    }

    navigator.clipboard.writeText(code).then(() => {
      dispatch(addToast("Mermaid diagram copied to clipboard", "success"));
    }).catch(() => {
      dispatch(addToast("Failed to copy to clipboard", "error"));
    });
  }, [items, edges, dispatch]);

  // ---- Render ----

  const canvasListPanel = (
    <div className="w-56 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900 shrink-0 overflow-y-auto">
      <div className="p-3 border-b border-gray-200 dark:border-gray-800 space-y-1.5">
        <button
          onClick={() => setShowNewCanvas(true)}
          className="w-full px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          + New Canvas
        </button>
        <button
          onClick={handleCreateDiagram}
          className="w-full px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
        >
          + New Diagram
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
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0 flex-wrap">
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
            className="text-sm font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 w-24 sm:w-32 lg:w-48 shrink min-w-0"
            placeholder="Canvas Title"
          />

          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />

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

          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />

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

          {/* Shapes dropdown */}
          <div className="relative">
            <ToolButton
              icon={<IconShape />}
              label="Diagram Shapes"
              active={showShapes}
              onClick={() => setShowShapes((v) => !v)}
            />
            {showShapes && (
              <div
                className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1.5 z-50 grid grid-cols-4 gap-1 min-w-[200px]"
                onMouseLeave={() => setShowShapes(false)}
              >
                {SHAPE_TYPES.map((shape) => (
                  <button
                    key={shape.type}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        handleShapeSelectForPlacement(shape.type);
                        setShowShapes(false);
                      } else {
                        handleAddShape(shape.type);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleShapeSelectForPlacement(shape.type);
                      setShowShapes(false);
                    }}
                    className="flex flex-col items-center gap-1 px-2 py-1.5 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title={`${shape.label} (Ctrl+Click to place, Right-click to place)`}
                  >
                    <ShapeIcon type={shape.type} className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    <span className="text-gray-500">{shape.label}</span>
                  </button>
                ))}
                <div className="col-span-4 pt-1 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      handleShapeSelectForPlacement("rectangle");
                      setShowShapes(false);
                    }}
                    className="w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded py-1 transition-colors"
                  >
                    Place Mode (click on canvas)
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />

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
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600 hover:scale-125 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}

          {/* Shape text styling */}
          {selectedItemIds.size >= 1 && (
            <div className="flex items-center gap-1">
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />
              <select
                value={itemFontSize}
                onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                className="text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-gray-600 dark:text-gray-400 cursor-pointer"
                title="Font size"
              >
                {[10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ToolButton
                icon={<IconBold />}
                label="Bold"
                active={itemFontWeight === "bold"}
                onClick={handleFontWeightToggle}
              />
              <ToolButton
                icon={<IconItalic />}
                label="Italic"
                active={itemFontStyle === "italic"}
                onClick={handleFontStyleToggle}
              />
            </div>
          )}

          {/* Selection count badge */}
          {selectedItemIds.size > 1 && (
            <div className="flex items-center gap-1 ml-1">
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                {selectedItemIds.size} selected
              </span>
            </div>
          )}

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

          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />

          {/* Zoom controls */}
          <span className="text-xs text-gray-400 tabular-nums w-8 text-right">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            title="Zoom out"
          >
            <IconMinus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-1 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 transition-colors font-medium"
            title="Reset zoom"
          >
            Fit
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(5, z + 0.1))}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            title="Zoom in"
          >
            <IconPlus className="w-3.5 h-3.5" />
          </button>

          {/* Overflow menu (grid, snap, layout) */}
          <div className="relative" ref={overflowRef}>
            <ToolButton
              icon={<IconDotsVertical />}
              label="More options"
              active={showOverflow}
              onClick={() => setShowOverflow((v) => !v)}
            />
            {showOverflow && (
              <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1.5 z-50 min-w-[170px] space-y-1">
                {/* Grid toggle + size */}
                <div className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                  <div className="flex items-center gap-1.5">
                    <IconGridDots className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Grid</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={() => setShowGrid((v) => !v)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
                {showGrid && (
                  <div className="flex items-center gap-1 px-1.5 pb-1">
                    <span className="text-xs text-gray-400 w-6">Size</span>
                    {([20, 40, 80] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setGridSize(size)}
                        className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                          gridSize === size
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                )}

                {/* Snap to grid */}
                <div className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                  <div className="flex items-center gap-1.5">
                    <IconMagnet className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Snap to grid</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snapToGrid}
                      onChange={() => setSnapToGrid((v) => !v)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>

                {/* Snap to guides */}
                <div className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                  <div className="flex items-center gap-1.5">
                    <IconLayoutAlignCenter className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Snap to guides</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snapToGuides}
                      onChange={() => setSnapToGuides((v) => !v)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>

                <hr className="border-gray-200 dark:border-gray-700 my-1" />

                {/* Minimap toggle */}
                <div className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                  <div className="flex items-center gap-1.5">
                    <IconMaximize className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Minimap</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMinimap}
                      onChange={() => setShowMinimap((v) => !v)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>

                <hr className="border-gray-200 dark:border-gray-700 my-1" />

                {/* Auto-Layout */}
                <div className="relative" ref={autoLayoutRef}>
                  <button
                    onClick={() => setShowAutoLayout((v) => !v)}
                    disabled={isLayouting || items.length === 0}
                    className="w-full flex items-center gap-1.5 px-1.5 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-40"
                  >
                    {isLayouting ? (
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <IconNetwork className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    )}
                    Auto-Layout
                  </button>
                  {showAutoLayout && !isLayouting && (
                    <div className="absolute left-full top-0 ml-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-1 z-50 flex flex-col min-w-[150px]">
                      <button
                        onClick={() => {
                          setShowAutoLayout(false);
                          setShowOverflow(false);
                          handleForceLayout();
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors text-left"
                      >
                        <IconNetwork className="w-3.5 h-3.5 shrink-0" />
                        Force-Directed
                      </button>
                      <button
                        onClick={() => {
                          setShowAutoLayout(false);
                          setShowOverflow(false);
                          handleTreeLayout();
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors text-left"
                      >
                        <IconHierarchy className="w-3.5 h-3.5 shrink-0" />
                        Tree
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExport((v) => !v)}
              className="px-1.5 py-0.5 text-xs font-medium rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              title="Export canvas"
            >
              Export
            </button>
            {showExport && (
              <div
                className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[100px]"
                onMouseLeave={() => setShowExport(false)}
              >
                <button
                  onClick={() => { setShowExport(false); handleExportPng(); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  PNG
                </button>
                <button
                  onClick={() => { setShowExport(false); handleExportSvg(); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  SVG
                </button>
                <button
                  onClick={() => { setShowExport(false); handleExportMermaid(); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Mermaid
                </button>
              </div>
            )}
          </div>

          {/* Phase 36: Group/Ungroup */}
          <div className="flex items-center gap-1">
            <ToolButton
              icon={<IconFolders />}
              label="Group (Ctrl+G)"
              onClick={handleGroupItems}
              disabled={selectedItemIds.size < 2}
            />
            <ToolButton
              icon={<IconArrowsSplit2 />}
              label="Ungroup"
              onClick={handleUngroupItems}
              disabled={selectedItemIds.size !== 1 || items.find((i) => i.id === [...selectedItemIds][0])?.type !== "group"}
            />
          </div>

          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />

          {/* Phase 36: Stencil Library */}
          <div className="relative">
            <ToolButton
              icon={<IconCategory />}
              label="Stencil Library"
              active={showStencilLibrary}
              onClick={() => setShowStencilLibrary((v) => !v)}
            />
            {showStencilLibrary && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-50 w-64">
                <div className="flex gap-1 mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                  {(["aws", "erd", "c4", "network"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setStencilCategory(cat)}
                      className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                        stencilCategory === cat
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                          : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {cat.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1 max-h-60 overflow-y-auto">
                  {STENCIL_TEMPLATES[stencilCategory].map((tmpl) => (
                    <button
                      key={tmpl.label}
                      onClick={() => handleAddStencilItem(tmpl)}
                      className="flex flex-col items-center gap-1 px-2 py-2 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title={tmpl.label}
                    >
                      <tmpl.icon className="w-5 h-5" style={{ color: tmpl.color }} />
                      <span className="text-gray-500">{tmpl.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-0.5" />

          {/* Phase 36: Version History */}
          <ToolButton
            icon={<IconSettings />}
            label="Version History"
            active={showVersionHistory}
            onClick={() => setShowVersionHistory((v) => !v)}
          />

          {/* Phase 36: Placement Mode Indicator */}
          {placementMode.shapeType && (
            <div className="flex items-center gap-1 ml-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded border border-amber-300 dark:border-amber-700">
              <IconArrowUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Placing: {placementMode.shapeType.replace("_", " ")} — click canvas to place
              </span>
              <button
                onClick={() => { setPlacementMode({ shapeType: null, tempItem: null }); }}
                className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
              >
                <IconX className="w-3 h-3" />
              </button>
            </div>
          )}
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
                  <marker
                    id="arrowhead-start"
                    markerWidth="8"
                    markerHeight="6"
                    refX="0"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="8 0, 0 3, 8 6" fill="#94a3b8" />
                  </marker>
                </defs>
                {edges.map((edge) => {
                  const src = items.find((i) => i.id === edge.sourceItemId);
                  const tgt = items.find((i) => i.id === edge.targetItemId);
                  if (!src || !tgt) return null;

                  // Get connection ports (snap to edge midpoints for diagram shapes)
                  const diagramTypes = ["rectangle", "rounded_rectangle", "circle", "diamond", "cylinder", "cloud", "hexagon"];
                  const srcIsDiagram = diagramTypes.includes(src.type);
                  const tgtIsDiagram = diagramTypes.includes(tgt.type);

                  const sx = srcIsDiagram
                    ? getEdgePort(src, tgt.x + tgt.width / 2, tgt.y + tgt.height / 2).x
                    : src.x + src.width / 2;
                  const sy = srcIsDiagram
                    ? getEdgePort(src, tgt.x + tgt.width / 2, tgt.y + tgt.height / 2).y
                    : src.y + src.height / 2;
                  const tx = tgtIsDiagram
                    ? getEdgePort(tgt, src.x + src.width / 2, src.y + src.height / 2).x
                    : tgt.x + tgt.width / 2;
                  const ty = tgtIsDiagram
                    ? getEdgePort(tgt, src.x + src.width / 2, src.y + src.height / 2).y
                    : tgt.y + tgt.height / 2;

                  const strokeDasharray =
                    edge.edgeStyle === "dashed" ? "6,3" :
                    edge.edgeStyle === "dotted" ? "2,2" :
                    undefined;

                  const midX = (sx + tx) / 2;
                  const midY = (sy + ty) / 2;

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
                        strokeDasharray={strokeDasharray}
                        markerStart={edge.arrowStart ? "url(#arrowhead-start)" : undefined}
                        markerEnd={edge.arrowEnd ?? true ? "url(#arrowhead)" : undefined}
                        className="pointer-events-auto cursor-pointer hover:stroke-red-400"
                        onClick={(e) => handleSelectEdge(edge.id, e as unknown as React.MouseEvent, e.clientX, e.clientY)}
                      />
                      {edge.label && (
                        <g transform={`translate(${midX}, ${midY})`}>
                          <rect
                            x={-edge.label.length * 4 - 4}
                            y={-11}
                            width={edge.label.length * 8 + 8}
                            height={18}
                            rx={3}
                            fill="white"
                            fillOpacity={0.9}
                            stroke="#d1d5db"
                            strokeWidth={0.5}
                          />
                          <text
                            x={0}
                            y={2}
                            textAnchor="middle"
                            className="text-[11px] fill-gray-700 dark:fill-gray-300 select-none"
                            style={{ fontFamily: "system-ui, sans-serif" }}
                          >
                            {edge.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Ghost line when connecting */}
                {activeTool === "connect" && connectSourceId && (
                  <LineToCursor
                    sourceItem={items.find((i) => i.id === connectSourceId)}
                    canvasRef={canvasRef}
                    panX={panX}
                    panY={panY}
                    zoom={zoom}
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

              {/* Phase 36: Placement Preview — shown inside canvas transform */}
              {placementMode.shapeType && placementMode.tempItem && (
                <div
                  className="absolute pointer-events-none z-[999999]"
                  style={{
                    left: placementPreviewPos.x - placementMode.tempItem.width / 2,
                    top: placementPreviewPos.y - placementMode.tempItem.height / 2,
                    width: placementMode.tempItem.width,
                    height: placementMode.tempItem.height,
                    border: "2px dashed #3b82f6",
                    borderRadius: placementMode.tempItem.type === "rounded_rectangle" ? 12 : 4,
                    backgroundColor: "rgba(59,130,246,0.15)",
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-medium">
                    {placementMode.tempItem.text}
                  </div>
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-blue-600 dark:text-blue-400 bg-white/90 dark:bg-gray-800/90 px-1.5 py-0.5 rounded">
                    click to place · Tab to cycle · Esc to cancel
                  </div>
                </div>
              )}

              {/* Phase 36: Port Visualization Hints — inside canvas transform */}
              {showPortHints && items.find((i) => i.id === showPortHints) && (() => {
                const item = items.find((i) => i.id === showPortHints)!;
                const ports = getPortPositions(item);
                return (
                  <>
                    {ports.map((port) => (
                      <div
                        key={port.label}
                        className="absolute w-2 h-2 bg-blue-500 rounded-full pointer-events-auto z-[99999]"
                        onMouseEnter={() => handlePortHover(showPortHints, port.label)}
                        style={{
                          left: port.x - 4,
                          top: port.y - 4,
                          border: "2px solid white",
                          boxShadow: "0 0 0 1px #3b82f6",
                        }}
                      >
                        {activePort?.itemId === showPortHints && activePort?.port === port.label && (
                          <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-50" />
                        )}
                      </div>
                    ))}
                    {activePort && activePort.itemId === showPortHints && (() => {
                      const pitem = items.find((i) => i.id === activePort.itemId);
                      if (!pitem) return null;
                      const pports = getPortPositions(pitem);
                      const pport = pports.find((p) => p.label === activePort.port);
                      if (!pport) return null;
                      return (
                        <div
                          className="absolute w-3 h-3 bg-blue-500 rounded-full pointer-events-none animate-ping opacity-75 z-[99999]"
                          style={{ left: pport.x - 4, top: pport.y - 4 }}
                        />
                      );
                    })()}
                  </>
                );
              })()}

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
                    onMouseEnter={() => handleItemMouseEnter(item.id)}
                    onMouseLeave={() => handleItemMouseLeave(item.id)}
                    className={`absolute ${
                      isDiagramItem(item) || item.type === "group" ? "" : "rounded-lg shadow-lg overflow-hidden"
                    } cursor-move transition-shadow hover:shadow-xl select-none ${
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
                      backgroundColor: (item.type === "image" || isDiagramItem(item)) ? "transparent" : item.color,
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
                            const expandedIdsResize = selectedItemIds;
                            for (const sid of expandedIdsResize) {
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
                                  const constraints = getShapeConstraints(i.type);
                                  let w = Math.max(constraints.minWidth, initSize.width + dx);
                                  w = Math.min(constraints.maxWidth, w);
                                  let h = Math.max(constraints.minHeight, initSize.height + dy);
                                  h = Math.min(constraints.maxHeight, h);
                                  if (constraints.lockAspectRatio && i.lockAspectRatio !== false) {
                                    const aspect = initSize.width / initSize.height;
                                    if (Math.abs(dx) > Math.abs(dy)) {
                                      h = w / aspect;
                                    } else {
                                      w = h * aspect;
                                    }
                                  }
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
                    ) : isDiagramItem(item) ? (
                      <>
                        <svg
                          className="absolute inset-0 w-full h-full"
                          viewBox={`0 0 ${item.width} ${item.height}`}
                          style={{ width: item.width, height: item.height }}
                        >
                          {item.type === "rectangle" && (
                            <rect x={2} y={2} width={item.width - 4} height={item.height - 4} rx={0} ry={0} fill={item.color} stroke="#64748b" strokeWidth={2} />
                          )}
                          {item.type === "rounded_rectangle" && (
                            <rect x={2} y={2} width={item.width - 4} height={item.height - 4} rx={12} ry={12} fill={item.color} stroke="#64748b" strokeWidth={2} />
                          )}
                          {item.type === "circle" && (
                            <ellipse cx={item.width / 2} cy={item.height / 2} rx={item.width / 2 - 2} ry={item.height / 2 - 2} fill={item.color} stroke="#64748b" strokeWidth={2} />
                          )}
                          {item.type === "diamond" && (
                            <polygon
                              points={`${item.width / 2},2 ${item.width - 2},${item.height / 2} ${item.width / 2},${item.height - 2} 2,${item.height / 2}`}
                              fill={item.color}
                              stroke="#64748b"
                              strokeWidth={2}
                            />
                          )}
                          {item.type === "hexagon" && (
                            <polygon
                              points={`${item.width * 0.25},2 ${item.width * 0.75},2 ${item.width - 2},${item.height / 2} ${item.width * 0.75},${item.height - 2} ${item.width * 0.25},${item.height - 2} 2,${item.height / 2}`}
                              fill={item.color}
                              stroke="#64748b"
                              strokeWidth={2}
                            />
                          )}
                          {item.type === "cloud" && (
                            <path
                              d={`M ${item.width * 0.25} ${item.height - 4} 
                                  C ${item.width * 0.05} ${item.height - 4}, ${item.width * 0.05} ${item.height * 0.4}, ${item.width * 0.18} ${item.height * 0.4}
                                  C ${item.width * 0.12} ${item.height * 0.15}, ${item.width * 0.35} ${item.height * 0.08}, ${item.width * 0.5} ${item.height * 0.2}
                                  C ${item.width * 0.55} ${item.height * 0.05}, ${item.width * 0.75} ${item.height * 0.05}, ${item.width * 0.8} ${item.height * 0.25}
                                  C ${item.width * 0.95} ${item.height * 0.2}, ${item.width * 0.95} ${item.height * 0.5}, ${item.width * 0.82} ${item.height * 0.55}
                                  C ${item.width * 0.95} ${item.height * 0.6}, ${item.width * 0.9} ${item.height - 4}, ${item.width * 0.7} ${item.height - 4}
                                  Z`}
                              fill={item.color}
                              stroke="#64748b"
                              strokeWidth={2}
                            />
                          )}
                          {item.type === "cylinder" && (
                            <>
                              <rect x={2} y={12} width={item.width - 4} height={item.height - 24} fill={item.color} stroke="#64748b" strokeWidth={2} />
                              <ellipse cx={item.width / 2} cy={12} rx={item.width / 2 - 2} ry={10} fill={item.color} stroke="#64748b" strokeWidth={2} />
                              <ellipse cx={item.width / 2} cy={item.height - 12} rx={item.width / 2 - 2} ry={10} fill={item.color} stroke="#64748b" strokeWidth={2} />
                              <path d={`M 2 12 L 2 ${item.height - 12}`} fill="none" stroke="#64748b" strokeWidth={2} />
                              <path d={`M ${item.width - 2} 12 L ${item.width - 2} ${item.height - 12}`} fill="none" stroke="#64748b" strokeWidth={2} />
                            </>
                          )}
                        </svg>
                        {item.text && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span
                              className="text-white drop-shadow-sm px-2 text-center leading-tight"
                              style={{
                                fontSize: (item.fontSize ?? 14) * zoom,
                                fontWeight: item.fontWeight ?? "normal",
                                fontStyle: item.fontStyle ?? "normal",
                              }}
                            >
                              {item.text}
                            </span>
                          </div>
                        )}
                        {/* Resize handle */}
                        <div
                          className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize z-10"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            pushUndo();
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const initialSizes = new Map<string, { width: number; height: number }>();
                            const expandedIdsRS = selectedItemIds;
                            for (const sid of expandedIdsRS) {
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
                                  const constraints = getShapeConstraints(i.type);
                                  let w = Math.max(constraints.minWidth, initSize.width + dx);
                                  w = Math.min(constraints.maxWidth, w);
                                  let h = Math.max(constraints.minHeight, initSize.height + dy);
                                  h = Math.min(constraints.maxHeight, h);
                                  if (constraints.lockAspectRatio && i.lockAspectRatio !== false) {
                                    const aspect = initSize.width / initSize.height;
                                    if (Math.abs(dx) > Math.abs(dy)) {
                                      h = w / aspect;
                                    } else {
                                      w = h * aspect;
                                    }
                                  }
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
                          <svg className="w-3 h-3 text-white/50" viewBox="0 0 10 10" fill="currentColor">
                            <path d="M10 0v2L2 10H0z" />
                          </svg>
                        </div>
                      </>
                    ) : item.type === "group" ? (
                      <>
                        <div
                          className="absolute inset-0 border-2 border-dashed border-gray-400 dark:border-gray-500 rounded-lg pointer-events-none"
                          style={{ backgroundColor: item.color + "20" }}
                        />
                        <div className="absolute top-0 left-3 -translate-y-1/2 pointer-events-none select-none">
                          <span
                            className="absolute inset-x-0 top-1/2 h-[3px]"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="relative top-[2px] text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
                            {item.text}
                          </span>
                        </div>
                        {/* Resize handle */}
                        <div
                          className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize z-10"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            pushUndo();
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const initialSizes = new Map<string, { width: number; height: number }>();
                            const expandedResizeIds2 = selectedItemIds;
                            for (const sid of expandedResizeIds2) {
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
                                  let w = Math.max(60, initSize.width + dx);
                                  let h = Math.max(40, initSize.height + dy);
                                  if (snapToGrid) {
                                    w = snapValue(w);
                                    h = snapValue(h);
                                  }
                                  return { ...i, width: w, height: h };
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
                          <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" viewBox="0 0 10 10" fill="currentColor">
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
                            const initialSizes = new Map<string, { width: number; height: number }>();
                            const expandedResizeIds = selectedItemIds;
                            for (const sid of expandedResizeIds) {
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
                                  const constraints = getShapeConstraints(i.type);
                                  let w = Math.max(constraints.minWidth, initSize.width + dx);
                                  w = Math.min(constraints.maxWidth, w);
                                  let h = Math.max(constraints.minHeight, initSize.height + dy);
                                  h = Math.min(constraints.maxHeight, h);
                                  if (constraints.lockAspectRatio && i.lockAspectRatio !== false) {
                                    const aspect = initSize.width / initSize.height;
                                    if (Math.abs(dx) > Math.abs(dy)) {
                                      h = w / aspect;
                                    } else {
                                      w = h * aspect;
                                    }
                                  }
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
                          <svg className="w-3 h-3 text-white/50" viewBox="0 0 10 10" fill="currentColor">
                            <path d="M10 0v2L2 10H0z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}

      {/* Phase 36: Mini-map */}
      {showMinimap && selectedCanvasId && items.length > 0 && (() => {
        const mapW = 180;
        const mapH = 130;
        const pad = 40;
        const minX = Math.min(...items.map((i) => i.x)) - pad;
        const minY = Math.min(...items.map((i) => i.y)) - pad;
        const maxX = Math.max(...items.map((i) => i.x + i.width)) + pad;
        const maxY = Math.max(...items.map((i) => i.y + i.height)) + pad;
        const bw = maxX - minX || 1;
        const bh = maxY - minY || 1;
        const scale = Math.min(mapW / bw, mapH / bh);
        const container = canvasRef.current;
        const containerRect = container?.getBoundingClientRect();
        const viewW = containerRect ? containerRect.width / zoom : 800;
        const viewH = containerRect ? containerRect.height / zoom : 600;
        const viewX = -panX / zoom;
        const viewY = -panY / zoom;

        return (
          <div className="absolute bottom-3 right-3 z-20 rounded-md shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
            <svg width={mapW} height={mapH}>
              <rect width={mapW} height={mapH} fill="#f8fafc" className="dark:hidden" />
              <rect width={mapW} height={mapH} fill="#1e293b" className="hidden dark:block" />
              {edges.map((edge) => {
                const src = items.find((i) => i.id === edge.sourceItemId);
                const tgt = items.find((i) => i.id === edge.targetItemId);
                if (!src || !tgt) return null;
                return (
                  <line
                    key={edge.id}
                    x1={(src.x + src.width / 2 - minX) * scale}
                    y1={(src.y + src.height / 2 - minY) * scale}
                    x2={(tgt.x + tgt.width / 2 - minX) * scale}
                    y2={(tgt.y + tgt.height / 2 - minY) * scale}
                    stroke="#94a3b8"
                    strokeWidth={0.5}
                  />
                );
              })}
              {items.map((item) => {
                const rx = (item.x - minX) * scale;
                const ry = (item.y - minY) * scale;
                const rw = Math.max(2, item.width * scale);
                const rh = Math.max(2, item.height * scale);
                return (
                  <rect
                    key={item.id}
                    x={rx}
                    y={ry}
                    width={rw}
                    height={rh}
                    fill={item.color}
                    opacity={0.7}
                    rx={item.type === "rounded_rectangle" ? 2 : 0}
                  />
                );
              })}
              <rect
                x={(viewX - minX) * scale}
                y={(viewY - minY) * scale}
                width={viewW * scale}
                height={viewH * scale}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1.5}
                rx={1}
              />
            </svg>
            <div
              className="absolute inset-0 cursor-pointer"
              onMouseDown={(e) => {
                const svgRect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - svgRect.left;
                const clickY = e.clientY - svgRect.top;
                const canvasX = clickX / scale + minX;
                const canvasY = clickY / scale + minY;
                if (container) {
                  const cr = container.getBoundingClientRect();
                  setPanX(cr.width / 2 - canvasX * zoom);
                  setPanY(cr.height / 2 - canvasY * zoom);
                }
              }}
            />
          </div>
        );
      })()}

        </div>

        </div>

      {/* Phase 36: Edge Property Editor */}
      {showEdgeEditor && selectedEdgeId && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 min-w-[220px] pointer-events-auto"
          style={{
            left: edgeEditorPos.x,
            top: edgeEditorPos.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Edge Properties</span>
            <button onClick={closeEdgeEditor} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">&times;</button>
          </div>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Label</label>
              <input
                type="text"
                value={edges.find((e) => e.id === selectedEdgeId)?.label || ""}
                onChange={(e) => handleUpdateEdge(selectedEdgeId, { label: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
                placeholder="Edge label"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Line Style</label>
              <select
                value={edges.find((e) => e.id === selectedEdgeId)?.edgeStyle || "solid"}
                onChange={(e) => handleUpdateEdge(selectedEdgeId, { edgeStyle: e.target.value as CanvasEdge["edgeStyle"] })}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Line Type</label>
              <select
                value={edges.find((e) => e.id === selectedEdgeId)?.type || "straight"}
                onChange={(e) => handleUpdateEdge(selectedEdgeId, { type: e.target.value as CanvasEdge["type"] })}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
              >
                <option value="straight">Straight</option>
                <option value="curved">Curved</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={!!edges.find((e) => e.id === selectedEdgeId)?.arrowStart}
                  onChange={(e) => handleUpdateEdge(selectedEdgeId, { arrowStart: e.target.checked ? 1 : 0 })}
                  className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Start Arrow
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={!!edges.find((e) => e.id === selectedEdgeId)?.arrowEnd}
                  onChange={(e) => handleUpdateEdge(selectedEdgeId, { arrowEnd: e.target.checked ? 1 : 0 })}
                  className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                End Arrow
              </label>
            </div>
            <button
              onClick={(e) => { closeEdgeEditor(); handleDeleteEdge(selectedEdgeId, e); }}
              className="w-full mt-2 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete Edge
            </button>
          </div>
        </div>
      )}

      {/* Phase 36: Version History Panel */}
      {showVersionHistory && selectedCanvasId && (
        <div className="fixed top-16 right-4 z-40 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[60vh] flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Version History</span>
            <button onClick={() => setShowVersionHistory(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">&times;</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
              <input
                type="text"
                value={createVersionTitle}
                onChange={(e) => setCreateVersionTitle(e.target.value)}
                placeholder="Version title"
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
              />
              <input
                type="text"
                value={createVersionDescription}
                onChange={(e) => setCreateVersionDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
              />
              <button
                onClick={handleCreateVersion}
                disabled={!createVersionTitle.trim()}
                className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Version
              </button>
            </div>
            <hr className="border-gray-200 dark:border-gray-700 my-1" />
            {getCanvasVersions(selectedCanvasId).map((version) => (
              <div
                key={version.id}
                className="p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 cursor-pointer"
                onClick={() => handleRestoreVersion(version.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{version.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteVersion(version.id); }}
                    className="text-gray-400 hover:text-red-500 text-xs px-1"
                    title="Delete version"
                  >
                    &times;
                  </button>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{version.description}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{new Date(version.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {getCanvasVersions(selectedCanvasId).length === 0 && (
              <div className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm">
                No versions saved yet
              </div>
            )}
          </div>
        </div>
      )}

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
      className={`p-1 rounded transition-colors ${
        active
          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
      } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
      title={label}
    >
      <span className="[&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>
    </button>
  );
}

function LineToCursor({
  sourceItem,
  canvasRef,
  panX,
  panY,
  zoom,
}: {
  sourceItem?: CanvasItem;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  panX: number;
  panY: number;
  zoom: number;
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

  // Convert screen mouse coords to canvas space
  const rect = canvasRef.current?.getBoundingClientRect();
  let tx = mousePos.x;
  let ty = mousePos.y;
  if (rect) {
    tx = (mousePos.x - rect.left - panX) / zoom;
    ty = (mousePos.y - rect.top - panY) / zoom;
  }

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


