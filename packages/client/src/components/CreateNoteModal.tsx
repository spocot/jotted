import { useState } from "react";
import { useCreateNoteMutation } from "../store/redux/api";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import Modal from "./Modal";

interface CreateNoteModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (note: { id: string }) => void;
  existingTitles: string[];
  defaultFolder?: string;
}

export default function CreateNoteModal({
  open,
  onClose,
  onCreated,
  existingTitles,
  defaultFolder = "/Unsorted",
}: CreateNoteModalProps) {
  const dispatch = useAppDispatch();
  const [createNote] = useCreateNoteMutation();
  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState(defaultFolder);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const conflict = existingTitles.some(
      (t) => t.toLowerCase() === trimmed.toLowerCase(),
    );
    if (conflict) {
      setError(`A note with the title "${trimmed}" already exists`);
      return;
    }

    try {
      const note = await createNote({
        title: trimmed,
        path: folder,
      }).unwrap();
      onCreated(note);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const data = (err as { data?: string })?.data;
      if (status === 409) {
        setError(data ?? `A note with the title "${trimmed}" already exists`);
      } else {
        onClose();
        dispatch(addToast("Failed to create note", "error"));
      }
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Note">
      <form onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Note name
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError("");
          }}
          placeholder="Enter note name..."
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500"
          autoFocus
        />

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4 mb-2">
          Folder
        </label>
        <input
          type="text"
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          placeholder="/Unsorted"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500"
        />

        {error && (
          <p className="mt-2 text-sm text-red-500">{error}</p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded transition-colors"
          >
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}
