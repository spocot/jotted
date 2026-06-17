import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetNotesQuery, useCreateNoteMutation } from "../store/redux/api";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import { NoteListSkeleton } from "../components/Skeleton";
import Modal from "../components/Modal";

export default function NoteListPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data: notes = [], isLoading: loading } = useGetNotesQuery();
  const [createNote] = useCreateNoteMutation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [createError, setCreateError] = useState("");

  const handleCreate = () => {
    setNewNoteTitle("");
    setCreateError("");
    setShowCreateModal(true);
  };

  const handleCreateFromModal = async () => {
    const trimmed = newNoteTitle.trim();
    if (!trimmed) return;

    const conflict = notes.some(
      (n) => n.title.toLowerCase() === trimmed.toLowerCase(),
    );
    if (conflict) {
      setCreateError(`A note with the title "${trimmed}" already exists`);
      return;
    }

    try {
      const note = await createNote({ title: trimmed }).unwrap();
      setShowCreateModal(false);
      navigate(`/note/${note.id}`);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const data = (err as { data?: string })?.data;
      if (status === 409) {
        setCreateError(data ?? `A note with the title "${trimmed}" already exists`);
      } else {
        setShowCreateModal(false);
        dispatch(addToast("Failed to create note", "error"));
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">All Notes</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          + New Note
        </button>
      </div>

      {loading && notes.length === 0 && <NoteListSkeleton />}

      {!loading && notes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 dark:text-gray-500 mb-4">
            No notes yet. Create your first note to get started.
          </p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Create your first note
          </button>
        </div>
      )}

      <div className="grid gap-2">
        {notes.map((note) => (
          <a
            key={note.id}
            href={`/note/${note.id}`}
            className="block p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {note.title || "Untitled"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {note.content || "No content"}
            </p>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              {new Date(note.updatedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </a>
        ))}
      </div>

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Note">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateFromModal();
          }}
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Note name
          </label>
          <input
            type="text"
            value={newNoteTitle}
            onChange={(e) => {
              setNewNoteTitle(e.target.value);
              setCreateError("");
            }}
            placeholder="Enter note name..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500"
            autoFocus
          />
          {createError && (
            <p className="mt-2 text-sm text-red-500">{createError}</p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newNoteTitle.trim()}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
