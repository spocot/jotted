import { useState, useRef } from "react";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import {
  useGetUploadsQuery,
  useUploadFileMutation,
  useDeleteUploadMutation,
} from "../store/redux/api";
import type { Upload } from "../types";
import { useConfirm } from "../hooks/useConfirm";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];

interface AttachmentsPanelProps {
  noteId: string;
}

export default function AttachmentsPanel({ noteId }: AttachmentsPanelProps) {
  const confirm = useConfirm();
  const { data: uploads = [], isLoading: loading } = useGetUploadsQuery(noteId);
  const [uploadFile] = useUploadFileMutation();
  const [deleteUpload] = useDeleteUploadMutation();
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();

  const handleFile = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      dispatch(addToast("Only image files are allowed", "error"));
      return;
    }
    try {
      await uploadFile({ noteId, file }).unwrap();
      dispatch(addToast("File uploaded", "success"));
    } catch {
      dispatch(addToast("Failed to upload file", "error"));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDelete = async (upload: Upload) => {
    if (!(await confirm(`Delete "${upload.originalName}"?`, { title: "Delete Attachment", confirmLabel: "Delete", variant: "danger" }))) return;
    try {
      await deleteUpload(upload.id).unwrap();
      dispatch(addToast("File deleted", "info"));
    } catch {
      dispatch(addToast("Failed to delete file", "error"));
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (uploads.length === 0 && !loading) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Attachments ({uploads.length})
        </h3>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
          >
            + Upload
          </button>
        </div>
      </div>

      {/* Drag-and-drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-2 transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-200 dark:border-gray-700"
        }`}
      >
        {/* Image grid */}
        {uploads.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="group relative border border-gray-200 dark:border-gray-700 rounded overflow-hidden bg-white dark:bg-gray-800"
              >
                {upload.mimeType.startsWith("image/") ? (
                  <a
                    href={upload.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={upload.url}
                      alt={upload.originalName}
                      className="w-full h-24 object-cover"
                    />
                  </a>
                ) : (
                  <div className="w-full h-24 flex items-center justify-center text-gray-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                  <span className="truncate">{upload.originalName}</span>
                  <span className="shrink-0 ml-1">{formatSize(upload.size)}</span>
                </div>
                <button
                  onClick={() => handleDelete(upload)}
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
