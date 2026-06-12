import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNoteStore } from "../store/useNoteStore";
import { useUIStore } from "../store/useUIStore";

export default function Sidebar() {
  const { notes, fetchNotes, createNote, deleteNote, loading } = useNoteStore();
  const { sidebarOpen } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

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

  if (!sidebarOpen) return null;

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900">
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
            <div className="flex items-center justify-between">
              <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                {note.title || "Untitled"}
              </span>
              <button
                onClick={(e) => handleDelete(e, note.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity ml-2 shrink-0"
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

      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleCreate}
          className="w-full px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          + New Note
        </button>
      </div>
    </aside>
  );
}
