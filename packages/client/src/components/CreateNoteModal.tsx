import { useState, useRef, useEffect, useMemo } from "react";
import { useCreateNoteMutation, useGetFoldersQuery } from "../store/redux/api";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import Modal from "./Modal";
import type { FolderNode } from "../types";

function flattenFolders(nodes: FolderNode[]): string[] {
  const result: string[] = [];
  for (const node of nodes) {
    result.push(node.path);
    result.push(...flattenFolders(node.children));
  }
  return result;
}

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
  const { data: folders = [] } = useGetFoldersQuery();
  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState(defaultFolder);
  const [error, setError] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allFolderPaths = useMemo(() => flattenFolders(folders), [folders]);

  const suggestions = useMemo(() => {
    const trimmed = folder.trim();
    if (!trimmed) return allFolderPaths.slice(0, 20);
    const lower = trimmed.toLowerCase();
    return allFolderPaths.filter((p) => p.toLowerCase().includes(lower)).slice(0, 20);
  }, [folder, allFolderPaths]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setFolder(defaultFolder);
      setError("");
      setSelectedIdx(-1);
      setShowDropdown(false);
    }
  }, [open, defaultFolder]);

  // Clamp selected index when suggestions change
  useEffect(() => {
    if (selectedIdx >= suggestions.length) {
      setSelectedIdx(suggestions.length - 1);
    }
  }, [suggestions, selectedIdx]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

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

    const normalizedFolder = folder.startsWith("/") ? folder : `/${folder}`;

    try {
      const note = await createNote({
        title: trimmed,
        path: normalizedFolder,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setShowDropdown(true);
        setSelectedIdx(e.key === "ArrowDown" ? 0 : suggestions.length - 1);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIdx((i) => (i < suggestions.length - 1 ? i + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIdx((i) => (i > 0 ? i - 1 : suggestions.length - 1));
        break;
      case "Enter":
        if (selectedIdx >= 0 && selectedIdx < suggestions.length) {
          e.preventDefault();
          setFolder(suggestions[selectedIdx]);
          setShowDropdown(false);
          setSelectedIdx(-1);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowDropdown(false);
        setSelectedIdx(-1);
        break;
    }
  };

  const selectSuggestion = (path: string) => {
    setFolder(path);
    setShowDropdown(false);
    setSelectedIdx(-1);
    inputRef.current?.focus();
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
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={folder}
            onChange={(e) => {
              setFolder(e.target.value);
              setShowDropdown(true);
              setSelectedIdx(-1);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder="/Unsorted"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500"
          />
          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
            >
              {suggestions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
                  No matching folders
                </div>
              ) : (
                suggestions.map((path, i) => (
                  <button
                    key={path}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(path)}
                    onMouseEnter={() => setSelectedIdx(i)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      i === selectedIdx
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                    } ${i === 0 ? "first:rounded-t-lg" : ""} ${
                      i === suggestions.length - 1 ? "last:rounded-b-lg" : ""
                    }`}
                  >
                    {path}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

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
