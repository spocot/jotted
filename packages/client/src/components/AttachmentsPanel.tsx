import { useState, useRef } from "react";
import { IconDownload } from "@tabler/icons-react";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import {
  useGetUploadsQuery,
  useUploadFileMutation,
  useDeleteUploadMutation,
} from "../store/redux/api";
import type { Upload } from "../types";
import { useConfirm } from "../hooks/useConfirm";
import { getFileIcon, formatFileSize, getFileExtension, extractFileFromDrag, tryCreateEmailFileFromDrag } from "../lib/file-utils";

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
    const file = extractFileFromDrag(e.dataTransfer);
    if (file) {
      handleFile(file);
      return;
    }
    const emailFile = tryCreateEmailFileFromDrag(e.dataTransfer);
    if (emailFile) {
      handleFile(emailFile);
    }
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

  const images = uploads.filter((u) => u.mimeType.startsWith("image/"));
  const files = uploads.filter((u) => !u.mimeType.startsWith("image/"));

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

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-2 transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-200 dark:border-gray-700"
        }`}
      >
        {loading ? (
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
            Loading...
          </div>
        ) : uploads.length === 0 ? (
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
            Drop files here or click Upload
          </div>
        ) : null}

        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {images.map((upload) => (
              <div
                key={upload.id}
                className="group relative border border-gray-200 dark:border-gray-700 rounded overflow-hidden bg-white dark:bg-gray-800"
              >
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
                <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                  <span className="truncate">{upload.originalName}</span>
                  <span className="shrink-0 ml-1">{formatFileSize(upload.size)}</span>
                </div>
                <button
                  onClick={() => handleDelete(upload)}
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  title="Delete"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-1.5">
            {files.map((upload) => {
              const { icon, color } = getFileIcon(upload);
              return (
                <div
                  key={upload.id}
                  className="group flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div className={`shrink-0 ${color}`}>
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <a
                      href={upload.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 truncate block"
                    >
                      {upload.originalName}
                    </a>
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      <span className="uppercase bg-gray-100 dark:bg-gray-700 px-1 rounded text-[10px] font-mono">{getFileExtension(upload.originalName)}</span>
                      <span>{formatFileSize(upload.size)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <a
                      href={upload.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Download"
                      download
                    >
                      <IconDownload className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(upload)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
