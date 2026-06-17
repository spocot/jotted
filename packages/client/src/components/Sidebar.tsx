import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  useGetNotesQuery,
  useCreateNoteMutation,
  useDeleteNoteMutation,
  useGetTagsQuery,
  useGetFoldersQuery,
  useGetBacklinkCountsQuery,
  useRenameFolderMutation,
  useDeleteFolderMutation,
} from "../store/redux/api";
import { useAppDispatch, useAppSelector } from "../store/redux/hooks";
import {
  selectSidebarOpen,
  selectSidebarWidth,
  setSidebarWidth,
} from "../store/redux/uiSlice";
import { addToast } from "../store/redux/toastSlice";
import FolderTree from "./FolderTree";
import Modal from "./Modal";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarOpen = useAppSelector(selectSidebarOpen);
  const sidebarWidth = useAppSelector(selectSidebarWidth);
  const dispatch = useAppDispatch();
  const dragRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const [filter, setFilter] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [newFolderPath, setNewFolderPath] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteFolder, setNewNoteFolder] = useState("/Unsorted");
  const [createError, setCreateError] = useState("");

  const {
    data: allNotes = [],
    isLoading: loading,
  } = useGetNotesQuery({
    tag: activeTag ?? undefined,
  });
  const { data: tags = [] } = useGetTagsQuery();
  const { data: folders = [] } = useGetFoldersQuery();
  const { data: backlinkCounts = {} } = useGetBacklinkCountsQuery();
  const [createNote] = useCreateNoteMutation();
  const [deleteNote] = useDeleteNoteMutation();
  const [renameFolder] = useRenameFolderMutation();
  const [deleteFolder] = useDeleteFolderMutation();

  const filteredNotes = allNotes.filter((n) =>
    n.title.toLowerCase().includes(filter.toLowerCase()),
  );

  const handleCreate = () => {
    setNewNoteTitle("");
    setNewNoteFolder("/Unsorted");
    setCreateError("");
    setShowCreateModal(true);
  };

  const handleCreateFromModal = async () => {
    const trimmed = newNoteTitle.trim();
    if (!trimmed) return;

    const conflict = allNotes.some(
      (n) => n.title.toLowerCase() === trimmed.toLowerCase(),
    );
    if (conflict) {
      setCreateError(`A note with the title "${trimmed}" already exists`);
      return;
    }

    try {
      const note = await createNote({
        title: trimmed,
        path: newNoteFolder,
      }).unwrap();
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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this note?")) return;
    try {
      await deleteNote(id).unwrap();
    } catch {
      // ignore
    }
    if (location.pathname === `/note/${id}`) {
      navigate("/");
    }
  };

  const handleRenameFolder = async (oldPath: string, newName: string) => {
    try {
      const parentPath = oldPath.split("/").slice(0, -1).join("/");
      const newPath = parentPath ? `${parentPath}/${newName}` : `/${newName}`;
      await renameFolder({ oldPath, newPath }).unwrap();
      dispatch(addToast(`Renamed folder to "${newName}"`, "success"));
    } catch {
      dispatch(addToast("Failed to rename folder", "error"));
    }
  };

  const handleDeleteFolder = async (path: string) => {
    try {
      const result = await deleteFolder(path).unwrap();
      if (result.moved > 0) {
        dispatch(addToast(`${result.moved} note(s) moved to parent folder`, "info"));
      }
      if (activeFolder === path) {
        setActiveFolder(null);
      }
    } catch {
      dispatch(addToast("Failed to delete folder", "error"));
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderPath.trim();
    if (!name) return;
    const folderPath = activeFolder
      ? `${activeFolder}/${name}`
      : `/${name}`;
    try {
      await createNote({ title: "Untitled", path: folderPath }).unwrap();
      setNewFolderPath("");
      dispatch(addToast(`Created folder "${name}"`, "success"));
    } catch {
      dispatch(addToast("Failed to create folder", "error"));
    }
  };

  // Resize handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = true;
      startXRef.current = e.clientX;
      startWidthRef.current = sidebarWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarWidth],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = e.clientX - startXRef.current;
      dispatch(setSidebarWidth(startWidthRef.current + delta));
    };
    const handleMouseUp = () => {
      dragRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setSidebarWidth]);

  if (!sidebarOpen) return null;

  return (
    <aside
      className="border-r border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900 shrink-0 relative"
      style={{ width: sidebarWidth }}
    >
      <div className="p-3 border-b border-gray-200 dark:border-gray-800">
        <input
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {/* Folders section - main focus */}
      <div className="flex-1 overflow-y-auto">
        {loading && allNotes.length === 0 && (
          <div className="p-4 text-sm text-gray-400 dark:text-gray-500 text-center">
            Loading...
          </div>
        )}

        {!loading && folders.length === 0 && filteredNotes.length === 0 && (
          <div className="p-4 text-sm text-gray-400 dark:text-gray-500 text-center">
            No notes yet
          </div>
        )}

        {/* New folder form */}
        <form onSubmit={handleCreateFolder} className="px-3 pt-2 pb-1">
          <div className="flex gap-1">
            <input
              type="text"
              value={newFolderPath}
              onChange={(e) => setNewFolderPath(e.target.value)}
              placeholder={activeFolder ? `New folder in ${activeFolder}...` : "New folder name..."}
              className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors shrink-0"
            >
              Add
            </button>
          </div>
        </form>

        <div className="pb-2">
          {folders.length === 0 && filteredNotes.length > 0 && (
            <div className="px-3 text-xs text-gray-400 dark:text-gray-500">
              No folders
            </div>
          )}
          <FolderTree
            folders={folders}
            notes={filteredNotes}
            activeFolder={activeFolder}
            onSelectFolder={(path) => setActiveFolder(path)}
            onSelectNote={(id) => navigate(`/note/${id}`)}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
            onDeleteNote={handleDelete}
            backlinkCounts={backlinkCounts}
            activeNoteId={location.pathname.startsWith("/note/") ? location.pathname.split("/note/")[1] : null}
          />
        </div>
      </div>

      {/* Tags section */}
      <div className="border-t border-gray-200 dark:border-gray-800">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Tags
        </div>
        <div className="px-3 pb-2 flex flex-wrap gap-1 max-h-24 overflow-y-auto">
          {tags.length === 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">No tags</span>
          )}
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setActiveTag(activeTag === tag.name ? null : tag.name)}
              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                activeTag === tag.name
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40"
              }`}
            >
              #{tag.name}
            </button>
          ))}
          {activeTag && (
            <button
              onClick={() => setActiveTag(null)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleCreate}
          className="w-full px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          + New Note
        </button>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-400/50 active:bg-blue-500/50 transition-colors"
      />

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

          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4 mb-2">
            Folder
          </label>
          <input
            type="text"
            value={newNoteFolder}
            onChange={(e) => setNewNoteFolder(e.target.value)}
            placeholder="/Unsorted"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500"
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
    </aside>
  );
}
