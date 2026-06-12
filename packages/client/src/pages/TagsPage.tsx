import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useTagStore } from "../store/useTagStore";
import type { Tag, Note } from "../types";

export default function TagsPage() {
  const { tags, fetchTags, renameTag, deleteTag } = useTagStore();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagNotes, setTagNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    fetchTags().finally(() => setLoading(false));
  }, [fetchTags]);

  useEffect(() => {
    if (selectedTag) {
      api.getTagNotes(selectedTag).then(setTagNotes).catch(() => setTagNotes([]));
    } else {
      setTagNotes([]);
    }
  }, [selectedTag, tags]);

  const handleStartRename = (tag: Tag) => {
    setRenaming(tag.name);
    setRenameValue(tag.name);
  };

  const handleRename = async (oldName: string) => {
    if (!renameValue.trim() || renameValue.trim() === oldName) {
      setRenaming(null);
      return;
    }
    try {
      await renameTag(oldName, renameValue.trim());
      setRenaming(null);
      if (selectedTag === oldName) {
        setSelectedTag(renameValue.trim());
      }
    } catch {
      // error handled by store
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete tag "#${name}"? It will be removed from all notes.`)) return;
    try {
      await deleteTag(name);
      if (selectedTag === name) {
        setSelectedTag(null);
      }
    } catch {
      // error handled by store
    }
  };

  if (loading) {
    return <div className="text-gray-400 dark:text-gray-500">Loading tags...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Tags</h2>

      {tags.length === 0 && (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          No tags yet. Add #tags to your notes and they will appear here.
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {tags.map((tag) => (
          <div key={tag.id} className="group relative">
            {renaming === tag.name ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRename(tag.name);
                }}
                className="inline-flex"
              >
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-blue-400 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none"
                  autoFocus
                  onBlur={() => handleRename(tag.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setRenaming(null);
                  }}
                />
              </form>
            ) : (
              <button
                onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  selectedTag === tag.name
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40"
                }`}
              >
                #{tag.name}
                <span className="ml-1 text-xs opacity-70">({tag.noteCount})</span>
              </button>
            )}
            {renaming !== tag.name && (
              <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
                <button
                  onClick={() => handleStartRename(tag)}
                  className="w-4 h-4 text-xs bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center"
                  title="Rename tag"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDelete(tag.name)}
                  className="w-4 h-4 text-xs bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-red-200 dark:hover:bg-red-800 flex items-center justify-center"
                  title="Delete tag"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedTag && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
            Notes tagged #{selectedTag}
          </h3>
          {tagNotes.length === 0 && (
            <p className="text-gray-400 dark:text-gray-500">No notes found.</p>
          )}
          <div className="grid gap-2">
            {tagNotes.map((note) => (
              <Link
                key={note.id}
                to={`/note/${note.id}`}
                className="block p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  {note.title || "Untitled"}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                  {note.content || "No content"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
