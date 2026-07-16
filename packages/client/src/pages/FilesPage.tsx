import { useNavigate } from "react-router-dom";
import { IconFile, IconTrash, IconLink } from "@tabler/icons-react";
import { useGetAllUploadsQuery, useDeleteUploadMutation } from "../store/redux/api";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import { useConfirm } from "../hooks/useConfirm";
import type { Upload } from "../types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function FilesPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const dispatch = useAppDispatch();
  const { data: uploads = [], isLoading } = useGetAllUploadsQuery();
  const [deleteUpload] = useDeleteUploadMutation();

  const handleDelete = async (upload: Upload) => {
    if (!(await confirm(
      `Delete "${upload.originalName}"?`,
      { title: "Delete File", confirmLabel: "Delete", variant: "danger" },
    ))) return;
    try {
      await deleteUpload(upload.id).unwrap();
      dispatch(addToast("File deleted", "info"));
    } catch {
      dispatch(addToast("Failed to delete file", "error"));
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          Files
          {!isLoading && <span className="ml-2 text-base font-normal text-gray-400 dark:text-gray-500">({uploads.length})</span>}
        </h2>
      </div>

      {isLoading ? (
        <div className="text-gray-400 dark:text-gray-500">Loading files...</div>
      ) : uploads.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <IconFile className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No files uploaded yet.</p>
          <p className="text-sm mt-1">Upload images in a note's Attachments panel to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {uploads.map((upload) => (
            <FileCard
              key={upload.id}
              upload={upload}
              onDelete={handleDelete}
              onNavigate={(noteId) => navigate(`/note/${noteId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileCard({ upload, onDelete, onNavigate }: {
  upload: Upload;
  onDelete: (upload: Upload) => void;
  onNavigate: (noteId: string) => void;
}) {
  const isImage = upload.mimeType.startsWith("image/");

  return (
    <div className="group border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 transition-colors hover:border-gray-300 dark:hover:border-gray-600">
      {isImage ? (
        <a
          href={upload.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block aspect-square overflow-hidden bg-gray-100 dark:bg-gray-900"
        >
          <img
            src={upload.url}
            alt={upload.originalName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        </a>
      ) : (
        <div className="aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <IconFile className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        </div>
      )}

      <div className="p-2">
        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate" title={upload.originalName}>
          {upload.originalName}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center justify-between">
          <span>{formatSize(upload.size)}</span>
          <span>{formatDate(upload.createdAt)}</span>
        </div>

        {upload.noteId && (
          <button
            onClick={() => onNavigate(upload.noteId!)}
            className="mt-1.5 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 truncate flex items-center gap-1 max-w-full"
            title={upload.noteTitle ?? "Untitled"}
          >
            <IconLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{upload.noteTitle || "Untitled"}</span>
          </button>
        )}
        {!upload.noteId && (
          <div className="mt-1.5 text-xs text-gray-400 dark:text-gray-500 italic">
            No linked note
          </div>
        )}
      </div>

      <button
        onClick={() => onDelete(upload)}
        className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
        title="Delete"
      >
        <IconTrash className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
