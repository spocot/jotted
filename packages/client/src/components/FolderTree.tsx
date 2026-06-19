import { useState } from "react";
import { IconChevronRight, IconFolder, IconPencil, IconTrash, IconFile } from "@tabler/icons-react";
import { useGetNotesQuery } from "../store/redux/api";
import type { FolderNode } from "../types";
import { useConfirm } from "../hooks/useConfirm";

function FolderItem({
  node,
  depth,
  activeFolder,
  onSelectFolder,
  onSelectNote,
  onRenameFolder,
  onDeleteFolder,
  onDeleteNote,
  activeNoteId,
}: {
  node: FolderNode;
  depth: number;
  activeFolder: string | null;
  onSelectFolder: (path: string | null) => void;
  onSelectNote: (id: string) => void;
  onRenameFolder: (oldPath: string, newName: string) => Promise<void>;
  onDeleteFolder: (path: string) => Promise<void>;
  onDeleteNote: (id: string) => void;
  activeNoteId: string | null;
}) {
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const hasChildren = node.children.length > 0;
  const isActive = activeFolder === node.path;

  // Lazy load notes for this folder when expanded
  const { data: notesPage } = useGetNotesQuery(
    { folder: node.path, limit: 50 },
    { skip: !open },
  );
  const folderNotes = notesPage?.items ?? [];

  // Count includes direct children note count + indirect via children tree
  const totalNotes = node.noteCount;

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
        {totalNotes > 0 || hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            className="w-4 h-4 flex items-center justify-center shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <IconChevronRight
              className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Folder icon */}
        <IconFolder className="w-4 h-4 shrink-0 text-gray-400" />

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
          {totalNotes}
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
              <IconPencil className="w-3 h-3" />
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (await confirm(`Delete folder "${node.name}"? Notes will move to parent folder.`, { title: "Delete Folder", confirmLabel: "Delete", variant: "danger" })) {
                  onDeleteFolder(node.path);
                }
              }}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500"
              title="Delete folder"
            >
              <IconTrash className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>

      {/* Children */}
      {open && (
        <div>
          {node.children.map((child) => (
            <FolderItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFolder={activeFolder}
              onSelectFolder={onSelectFolder}
              onSelectNote={onSelectNote}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onDeleteNote={onDeleteNote}
              activeNoteId={activeNoteId}
            />
          ))}

          {/* Notes in this folder */}
          {folderNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              className={`w-full text-left pr-2 py-1.5 text-sm flex items-center justify-between gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 group ${
                activeNoteId === note.id
                  ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300"
              }`}
              style={{ paddingLeft: `${8 + (depth + 2) * 16}px` }}
            >
              <span className="truncate flex items-center gap-1.5">
                <IconFile className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                <span className="truncate">{note.title || "Untitled"}</span>
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNote(note.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 cursor-pointer transition-opacity shrink-0"
                title="Delete note"
              >
                ×
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface FolderTreeWrapperProps {
  folders: FolderNode[];
  activeFolder: string | null;
  onSelectFolder: (path: string | null) => void;
  onSelectNote: (id: string) => void;
  onRenameFolder: (oldPath: string, newName: string) => Promise<void>;
  onDeleteFolder: (path: string) => Promise<void>;
  onDeleteNote: (id: string) => void;
  activeNoteId: string | null;
}

export default function FolderTree(props: FolderTreeWrapperProps) {
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
