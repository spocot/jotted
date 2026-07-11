import { useState, useEffect, useCallback } from "react";
import { IconFolder, IconCopy } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useLazyGetNotesQuery } from "../store/redux/api";
import type { Note, PageResponse } from "../types";
import { NoteListSkeleton } from "../components/Skeleton";
import NoteCard from "../components/NoteCard";
import CreateNoteModal from "../components/CreateNoteModal";
import TemplatePickerModal from "../components/TemplatePickerModal";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";

const PAGE_SIZE = 50;

export default function NoteListPage() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [trigger] = useLazyGetNotesQuery();
  const dispatch = useAppDispatch();

  const handleTemplateApplied = (result: unknown) => {
    const note = result as { id?: string; title?: string };
    if (note?.id) {
      navigate(`/note/${note.id}`);
    }
    dispatch(addToast("Created note from template", "success"));
  };

  useEffect(() => {
    trigger({ limit: PAGE_SIZE, offset: 0 }).then((result: { data?: PageResponse<Note> }) => {
      if (result.data) {
        setNotes(result.data.items);
        setHasMore(result.data.hasMore);
      }
      setInitialLoading(false);
    });
  }, [trigger]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextOffset = offset + PAGE_SIZE;
    const result = await trigger({ limit: PAGE_SIZE, offset: nextOffset });
    if (result.data) {
      const page = result.data as PageResponse<Note>;
      setNotes((prev) => [...prev, ...page.items]);
      setHasMore(page.hasMore);
      setOffset(nextOffset);
    }
    setLoadingMore(false);
  }, [trigger, offset, loadingMore, hasMore]);

  // Group notes by folder path
  const notesByFolder: Record<string, Note[]> = {};
  for (const note of notes) {
    const path = note.path || "/Unsorted";
    if (!notesByFolder[path]) {
      notesByFolder[path] = [];
    }
    notesByFolder[path].push(note);
  }

  const folderPaths = Object.keys(notesByFolder).sort();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">All Notes</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex items-center gap-1"
          >
            <IconCopy className="w-4 h-4" />
            From Template
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            + New Note
          </button>
        </div>
      </div>

      {initialLoading && notes.length === 0 && <NoteListSkeleton />}

      {!initialLoading && notes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 dark:text-gray-500 mb-4">
            No notes yet. Create your first note to get started.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Create your first note
          </button>
        </div>
      )}

      {folderPaths.map((path) => {
        const folderNotes = notesByFolder[path];
        const folderName = path.split("/").filter(Boolean).pop() || "Unsorted";

        return (
          <div key={path} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <IconFolder className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {folderName}
              </h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                ({folderNotes.length} note{folderNotes.length !== 1 ? "s" : ""})
              </span>
            </div>

            <div className="grid gap-2">
              {folderNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          </div>
        );
      })}

      {hasMore && !initialLoading && (
        <div className="text-center py-4">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load more notes"}
          </button>
        </div>
      )}

      <CreateNoteModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(note) => {
          setShowCreateModal(false);
          navigate(`/note/${note.id}`);
        }}
        existingTitles={[]}
      />

      {showTemplatePicker && (
        <TemplatePickerModal
          target="note"
          onClose={() => setShowTemplatePicker(false)}
          onApplied={handleTemplateApplied}
          onCreateBlank={() => {
            setShowTemplatePicker(false);
            setShowCreateModal(true);
          }}
        />
      )}
    </div>
  );
}
