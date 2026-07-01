import { useState, useEffect } from "react";
import type { ProjectCard } from "../types";
import {
  IconX,
  IconCalendarDue,
  IconLink,
} from "@tabler/icons-react";
import { useLazySearchNotesQuery } from "../store/redux/api";

interface CardEditorProps {
  card?: ProjectCard;
  onSave: (data: {
    title: string;
    description: string;
    noteId?: string | null;
    dueDate?: string | null;
  }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function CardEditor({
  card,
  onSave,
  onDelete,
  onClose,
}: CardEditorProps) {
  const [title, setTitle] = useState(card?.title ?? "");
  const [description, setDescription] = useState(card?.description ?? "");
  const [dueDate, setDueDate] = useState(card?.dueDate ?? "");
  const [noteId, setNoteId] = useState<string | null>(card?.noteId ?? null);
  const [noteTitle, setNoteTitle] = useState("");
  const [showNoteSearch, setShowNoteSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchNotes] = useLazySearchNotesQuery();
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; title: string }>
  >([]);

  useEffect(() => {
    if (card?.noteId) {
      setNoteId(card.noteId);
    }
  }, [card?.noteId]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const result = await searchNotes({ q: searchQuery, limit: 10 }).unwrap();
    setSearchResults(result.items);
  };

  const handleSelectNote = (note: { id: string; title: string }) => {
    setNoteId(note.id);
    setNoteTitle(note.title);
    setShowNoteSearch(false);
    setSearchQuery("");
  };

  const handleRemoveNote = () => {
    setNoteId(null);
    setNoteTitle("");
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description,
      noteId,
      dueDate: dueDate || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold">
            {card ? "Edit Card" : "New Card"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <input
            type="text"
            placeholder="Card title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          {/* Due Date */}
          <div className="flex items-center gap-2">
            <IconCalendarDue className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Linked Note */}
          <div>
            {noteId ? (
              <div className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <IconLink className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="flex-1 truncate text-blue-700 dark:text-blue-300">
                  {noteTitle || "Linked note"}
                </span>
                <button
                  onClick={handleRemoveNote}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <IconX className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNoteSearch(!showNoteSearch)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full text-gray-500"
              >
                <IconLink className="w-3.5 h-3.5" />
                Link to note...
              </button>
            )}
            {showNoteSearch && (
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    className="flex-1 px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSearch}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    Search
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
                    {searchResults.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => handleSelectNote(note)}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        {note.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 rounded transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
