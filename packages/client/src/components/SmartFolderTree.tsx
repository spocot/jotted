import { useState } from "react";
import { IconStar, IconPencil, IconTrash, IconPlus } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import {
  useGetSmartFoldersQuery,
  useDeleteSmartFolderMutation,
} from "../store/redux/api";
import { useConfirm } from "../hooks/useConfirm";
import SmartFolderEditorModal from "./SmartFolderEditorModal";
import type { SmartFolder } from "../types";

export default function SmartFolderTree() {
  const { data: folders = [], isLoading } = useGetSmartFoldersQuery();
  const [deleteSmartFolder] = useDeleteSmartFolderMutation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [editingFolder, setEditingFolder] = useState<SmartFolder | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const handleClick = (folder: SmartFolder) => {
    navigate(`/search?smartFolder=${folder.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, folder: SmartFolder) => {
    e.stopPropagation();
    if (!(await confirm(`Delete "${folder.name}"?`, {
      title: "Delete Smart Folder",
      confirmLabel: "Delete",
      variant: "danger",
    }))) return;
    try {
      await deleteSmartFolder(folder.id).unwrap();
    } catch { /* handled by RTK Query */ }
  };

  const handleEdit = (e: React.MouseEvent, folder: SmartFolder) => {
    e.stopPropagation();
    setEditingFolder(folder);
  };

  if (isLoading) return null;

  return (
    <>
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Smart Folders
          </span>
          <button
            onClick={() => setShowCreate(true)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="New smart folder"
          >
            <IconPlus size={14} />
          </button>
        </div>
        {folders.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
            No smart folders
          </p>
        )}
        {folders.map((folder) => (
          <div key={folder.id} className="group flex items-center">
            <button
              onClick={() => handleClick(folder)}
              className="flex-1 flex items-center gap-2 px-1 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-left min-w-0"
            >
              <IconStar size={14} className="text-amber-500 dark:text-amber-400 shrink-0" />
              <span className="truncate">{folder.name}</span>
            </button>
            <div className="hidden group-hover:flex shrink-0 pr-1 gap-0.5">
              <button
                onClick={(e) => handleEdit(e, folder)}
                className="p-0.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                title="Edit"
              >
                <IconPencil size={12} />
              </button>
              <button
                onClick={(e) => handleDelete(e, folder)}
                className="p-0.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Delete"
              >
                <IconTrash size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <SmartFolderEditorModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editingFolder && (
        <SmartFolderEditorModal
          open={!!editingFolder}
          onClose={() => setEditingFolder(null)}
          editing={editingFolder}
        />
      )}
    </>
  );
}
