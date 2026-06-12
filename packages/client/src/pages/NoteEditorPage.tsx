import { useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useNoteStore } from "../store/useNoteStore";

const DEBOUNCE_MS = 500;

export default function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedNote, selectNote, updateNote, loading } = useNoteStore();
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (id) {
      selectNote(id);
    }
  }, [id, selectNote]);

  useEffect(() => {
    if (selectedNote && selectedNote.id === id) {
      if (titleRef.current && titleRef.current.value !== selectedNote.title) {
        titleRef.current.value = selectedNote.title;
      }
      if (contentRef.current && contentRef.current.value !== selectedNote.content) {
        contentRef.current.value = selectedNote.content;
      }
    }
  }, [selectedNote, id]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const title = titleRef.current?.value ?? "";
      const content = contentRef.current?.value ?? "";
      if (id) {
        updateNote(id, { title, content });
      }
    }, DEBOUNCE_MS);
  }, [id, updateNote]);

  if (!id) {
    return <div className="text-gray-400 dark:text-gray-500">Select a note</div>;
  }

  if (loading && !selectedNote) {
    return <div className="text-gray-400 dark:text-gray-500">Loading note...</div>;
  }

  if (!loading && !selectedNote) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 dark:text-gray-500 mb-4">Note not found</p>
        <button
          onClick={() => navigate("/")}
          className="text-blue-600 hover:underline"
        >
          Back to notes
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <input
        ref={titleRef}
        type="text"
        defaultValue={selectedNote?.title ?? ""}
        onChange={scheduleSave}
        placeholder="Note title"
        className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder-gray-300 dark:placeholder-gray-600 mb-4 text-gray-900 dark:text-gray-100"
      />

      <div className="flex items-center gap-2 mb-4 text-xs text-gray-400 dark:text-gray-500">
        {selectedNote?.tags.map((tag) => (
          <span
            key={tag.id}
            className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
          >
            #{tag.name}
          </span>
        ))}
      </div>

      <textarea
        ref={contentRef}
        defaultValue={selectedNote?.content ?? ""}
        onChange={scheduleSave}
        placeholder="Start writing..."
        className="w-full min-h-[60vh] bg-transparent border-none outline-none resize-none text-base leading-relaxed placeholder-gray-300 dark:placeholder-gray-600 text-gray-900 dark:text-gray-100 font-mono"
      />

      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 flex items-center justify-between">
        <span>
          Last updated:{" "}
          {selectedNote?.updatedAt
            ? new Date(selectedNote.updatedAt).toLocaleString()
            : "—"}
        </span>
        {selectedNote && selectedNote.backlinks.length > 0 && (
          <span>
            {selectedNote.backlinks.length} backlink
            {selectedNote.backlinks.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
