import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNoteStore } from "../store/useNoteStore";
import { useTagStore } from "../store/useTagStore";
import { useUIStore } from "../store/useUIStore";
import { api } from "../api/client";

export default function Sidebar() {
  const { notes, fetchNotes, createNote, deleteNote, loading } = useNoteStore();
  const { tags, fetchTags } = useTagStore();
  const { sidebarOpen, sidebarWidth, setSidebarWidth } = useUIStore();
  const dragRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [backlinkCounts, setBacklinkCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchNotes(undefined, activeTag ?? undefined);
  }, [fetchNotes, activeTag]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    api.getBacklinkCounts().then(setBacklinkCounts).catch(() => {});
  }, [notes.length]);

  const filtered = notes.filter(
    (n) => n.title.toLowerCase().includes(filter.toLowerCase()),
  );

  const handleCreate = async () => {
    const note = await createNote({ title: "Untitled" });
    navigate(`/note/${note.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this note?")) return;
    await deleteNote(id);
    if (location.pathname === `/note/${id}`) {
      navigate("/");
    }
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
      setSidebarWidth(startWidthRef.current + delta);
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
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <input
          type="text"
          placeholder="Filter notes..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && notes.length === 0 && (
          <div className="p-4 text-sm text-gray-400 dark:text-gray-500 text-center">
            Loading...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="p-4 text-sm text-gray-400 dark:text-gray-500 text-center">
            {filter ? "No notes match filter" : "No notes yet"}
          </div>
        )}

        {filtered.map((note) => (
          <button
            key={note.id}
            onClick={() => navigate(`/note/${note.id}`)}
            className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors group ${
              location.pathname === `/note/${note.id}`
                ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500"
                : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                {note.title || "Untitled"}
                {backlinkCounts[note.id] > 0 && (
                  <span
                    className="inline-block w-2 h-2 rounded-full bg-blue-500 shrink-0"
                    title={`${backlinkCounts[note.id]} backlink${backlinkCounts[note.id] !== 1 ? "s" : ""}`}
                  />
                )}
              </span>
              <button
                onClick={(e) => handleDelete(e, note.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity shrink-0"
                title="Delete note"
              >
                ×
              </button>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {new Date(note.updatedAt).toLocaleDateString()}
            </div>
          </button>
        ))}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Tags
        </div>
        <div className="px-3 pb-2 flex flex-wrap gap-1 max-h-24 overflow-y-auto">
          {tags.length === 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">No tags</span>
          )}
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setActiveTag(activeTag === tag.name ? null : tag.name)}
              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                activeTag === tag.name
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40"
              }`}
            >
              #{tag.name}
            </button>
          ))}
          {activeTag && (
            <button
              onClick={() => setActiveTag(null)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleCreate}
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
    </aside>
  );
}
