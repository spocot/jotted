import { useState, useCallback } from "react";
import {
  useGetTagsQuery,
  useRenameTagMutation,
  useDeleteTagMutation,
  useLazyGetTagNotesQuery,
} from "../store/redux/api";
import type { Tag, Note } from "../types";
import TagPill from "../components/TagPill";
import NoteCard from "../components/NoteCard";
import { useConfirm } from "../hooks/useConfirm";

const PAGE_SIZE = 50;

export default function TagsPage() {
  const confirm = useConfirm();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [tagNotes, setTagNotes] = useState<Note[]>([]);
  const [tagNotesOffset, setTagNotesOffset] = useState(0);
  const [tagNotesHasMore, setTagNotesHasMore] = useState(false);
  const [trigger] = useLazyGetTagNotesQuery();
  const { data: tags = [], isLoading } = useGetTagsQuery();
  const [renameTag] = useRenameTagMutation();
  const [deleteTag] = useDeleteTagMutation();

  const handleSelectTag = useCallback(async (name: string) => {
    if (selectedTag === name) {
      setSelectedTag(null);
      setTagNotes([]);
      return;
    }
    setSelectedTag(name);
    setTagNotes([]);
    setTagNotesOffset(0);
    const result = await trigger({ name, limit: PAGE_SIZE, offset: 0 });
    if (result.data) {
      setTagNotes(result.data.items);
      setTagNotesHasMore(result.data.hasMore);
    }
  }, [selectedTag, trigger]);

  const loadMoreTagNotes = useCallback(async () => {
    if (!selectedTag || !tagNotesHasMore) return;
    const nextOffset = tagNotesOffset + PAGE_SIZE;
    const result = await trigger({ name: selectedTag, limit: PAGE_SIZE, offset: nextOffset });
    if (result.data) {
      setTagNotes((prev) => [...prev, ...result.data!.items]);
      setTagNotesHasMore(result.data.hasMore);
      setTagNotesOffset(nextOffset);
    }
  }, [selectedTag, tagNotesOffset, tagNotesHasMore, trigger]);

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
        await renameTag({ oldName, newName: renameValue.trim() }).unwrap();
        setRenaming(null);
        if (selectedTag === oldName) {
          setSelectedTag(renameValue.trim());
        }
      } catch {
        // error handled by RTK Query
      }
  };

  const handleDelete = async (name: string) => {
    if (!(await confirm(`Delete tag "#${name}"? It will be removed from all notes.`, { title: "Delete Tag", confirmLabel: "Delete", variant: "danger" }))) return;
      try {
        await deleteTag(name).unwrap();
        if (selectedTag === name) {
          setSelectedTag(null);
          setTagNotes([]);
        }
      } catch {
        // error handled by RTK Query
      }
  };

  if (isLoading) {
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
              <TagPill
                name={tag.name}
                active={selectedTag === tag.name}
                onClick={() => handleSelectTag(tag.name)}
              >
                #{tag.name}
                <span className="ml-1 text-xs opacity-70">({tag.noteCount})</span>
              </TagPill>
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
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
          {tagNotesHasMore && (
            <div className="text-center py-4">
              <button
                onClick={loadMoreTagNotes}
                className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
