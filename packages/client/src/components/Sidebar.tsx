import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  useDeleteNoteMutation,
  useGetTagsQuery,
  useGetNotesQuery,
} from "../store/redux/api";
import { useAppDispatch, useAppSelector } from "../store/redux/hooks";
import {
  selectSidebarOpen,
  selectSidebarWidth,
  setSidebarWidth,
} from "../store/redux/uiSlice";
import TagPill from "./TagPill";
import CreateNoteModal from "./CreateNoteModal";
import { useConfirm } from "../hooks/useConfirm";
import type { Note } from "../types";

const RECENT_COUNT = 12;

export default function Sidebar() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const sidebarWidth = useAppSelector(selectSidebarWidth);
  const dispatch = useAppDispatch();
  const dragRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: tags = [] } = useGetTagsQuery();
  const {
    data: recentData,
    isLoading: recentLoading,
  } = useGetNotesQuery({ limit: RECENT_COUNT, sort: "updatedAt", order: "DESC" });
  const recentNotes: Note[] = (recentData?.items as Note[]) ?? [];
  const [deleteNote] = useDeleteNoteMutation();

  const handleDelete = async (id: string) => {
    if (!(await confirm("Delete this note?", { title: "Delete Note", confirmLabel: "Delete", variant: "danger" }))) return;
    try {
      await deleteNote(id).unwrap();
    } catch {
      // ignore
    }
    if (location.pathname === `/note/${id}`) {
      navigate("/");
    }
  };

  const handleTagClick = (tagName: string) => {
    if (activeTag === tagName) {
      setActiveTag(null);
    } else {
      setActiveTag(tagName);
    }
    navigate(`/tags?tag=${encodeURIComponent(tagName)}`);
  };

  // Resize handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = true;
      startXRef.current = e.clientX;
      startWidthRef.current = sidebarWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarWidth],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = e.clientX - startXRef.current;
      dispatch(setSidebarWidth(startWidthRef.current + delta));
    };
    const handleMouseUp = () => {
      dragRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setSidebarWidth]);

  if (!sidebarOpen) return null;

  return (
    <aside
      className="border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900 shrink-0 relative"
      style={{ width: sidebarWidth }}
    >
      <div className="flex-1 overflow-y-auto">
        {/* Recent notes */}
        <div className="px-3 pt-3 pb-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
            Recent
          </h3>
          {recentLoading ? (
            <div className="text-xs text-gray-400 dark:text-gray-500">Loading...</div>
          ) : recentNotes.length === 0 ? (
            <div className="text-xs text-gray-400 dark:text-gray-500">No notes yet</div>
          ) : (
            <ul className="space-y-0.5">
              {recentNotes.map((note) => (
                <li key={note.id}>
                  <div className="flex items-center gap-1 group">
                    <button
                      onClick={() => navigate(`/note/${note.id}`)}
                      className={`flex-1 text-left px-2 py-1 text-sm rounded truncate transition-colors ${
                        location.pathname === `/note/${note.id}`
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
                      }`}
                    >
                      {note.title || "Untitled"}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                      className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-all shrink-0"
                      title="Delete note"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Tags section */}
      <div className="border-t border-gray-200 dark:border-gray-800">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Tags
        </div>
        <div className="px-3 pb-2 flex flex-wrap gap-1 max-h-24 overflow-y-auto">
          {tags.length === 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">No tags</span>
          )}
          {tags.map((tag) => (
            <TagPill
              key={tag.id}
              name={tag.name}
              active={activeTag === tag.name}
              onClick={() => handleTagClick(tag.name)}
            />
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          + New Note
        </button>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-400/50 active:bg-blue-500/50 transition-colors"
      />

      <CreateNoteModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(note) => {
          setShowCreateModal(false);
          navigate(`/note/${note.id}`);
        }}
        existingTitles={[]}
      />
    </aside>
  );
}
