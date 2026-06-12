import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Tag, Note } from "../types";

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagNotes, setTagNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getTags()
      .then(setTags)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedTag) {
      api.getTagNotes(selectedTag).then(setTagNotes).catch(() => setTagNotes([]));
    } else {
      setTagNotes([]);
    }
  }, [selectedTag]);

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
          <button
            key={tag.id}
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
