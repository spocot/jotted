import { useState } from "react";
import type { FolderNode } from "../types";

interface FolderTreeProps {
  folders: FolderNode[];
  activeFolder: string | null;
  onSelectFolder: (path: string | null) => void;
  onRenameFolder: (oldPath: string, newName: string) => Promise<void>;
  onDeleteFolder: (path: string) => Promise<void>;
}

function FolderItem({
  node,
  depth,
  activeFolder,
  onSelectFolder,
  onRenameFolder,
  onDeleteFolder,
}: {
  node: FolderNode;
  depth: number;
  activeFolder: string | null;
  onSelectFolder: (path: string | null) => void;
  onRenameFolder: (oldPath: string, newName: string) => Promise<void>;
  onDeleteFolder: (path: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const hasChildren = node.children.length > 0;
  const isActive = activeFolder === node.path;

  const handleRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === node.name) {
      setRenaming(false);
      return;
    }
    await onRenameFolder(node.path, trimmed);
    setRenaming(false);
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 text-sm rounded cursor-pointer group ${
          isActive
            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        {/* Expand/collapse */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            className="w-4 h-4 flex items-center justify-center shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Folder icon */}
        <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>

        {/* Name */}
        {renaming ? (
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            className="flex-1 min-w-0 px-1 py-0 text-sm border border-blue-400 rounded bg-white dark:bg-gray-700 outline-none"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            onClick={() => onSelectFolder(isActive ? null : node.path)}
            className="flex-1 text-left truncate"
          >
            {node.name}
          </button>
        )}

        {/* Note count */}
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mr-1">
          {node.noteCount}
        </span>

        {/* Actions */}
        {!renaming && (
          <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRenaming(true);
                setRenameValue(node.name);
              }}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Rename folder"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete folder "${node.name}"? Notes will move to parent folder.`)) {
                  onDeleteFolder(node.path);
                }
              }}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500"
              title="Delete folder"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && open && (
        <div>
          {node.children.map((child) => (
            <FolderItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFolder={activeFolder}
              onSelectFolder={onSelectFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FolderTree(props: FolderTreeProps) {
  const { folders } = props;

  if (folders.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {folders.map((node) => (
        <FolderItem key={node.path} {...props} node={node} depth={0} />
      ))}
    </div>
  );
}
