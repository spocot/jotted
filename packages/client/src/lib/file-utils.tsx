import { type ReactElement } from "react";
import {
  IconFile,
  IconFileTypePdf,
  IconFileTypeDoc,
  IconFileTypeDocx,
  IconFileTypeXls,
  IconFileTypePpt,
  IconFileTypeZip,
  IconFileCode,
  IconFileTypeHtml,
  IconFileTypeTxt,
  IconFileMusic,
  IconFileUnknown,
} from "@tabler/icons-react";
import type { Upload } from "../types";

interface FileIconInfo {
  icon: ReactElement;
  color: string;
}

export function getFileIcon(upload: Upload): FileIconInfo {
  const { mimeType, originalName } = upload;
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "pdf" || mimeType === "application/pdf") {
    return { icon: <IconFileTypePdf className="w-10 h-10" />, color: "text-red-500" };
  }
  if (ext === "docx") {
    return { icon: <IconFileTypeDocx className="w-10 h-10" />, color: "text-blue-500" };
  }
  if (ext === "doc" || mimeType.includes("msword")) {
    return { icon: <IconFileTypeDoc className="w-10 h-10" />, color: "text-blue-500" };
  }
  if (ext === "xlsx") {
    return { icon: <IconFileTypeXls className="w-10 h-10" />, color: "text-green-500" };
  }
  if (ext === "xls" || mimeType.includes("spreadsheet") || ext === "csv") {
    return { icon: <IconFileTypeXls className="w-10 h-10" />, color: "text-green-500" };
  }
  if (ext === "pptx" || ext === "ppt" || mimeType.includes("presentation")) {
    return { icon: <IconFileTypePpt className="w-10 h-10" />, color: "text-orange-500" };
  }
  if (ext === "zip" || ext === "tar" || ext === "gz" || ext === "bz2" || ext === "7z") {
    return { icon: <IconFileTypeZip className="w-10 h-10" />, color: "text-amber-500" };
  }
  if (/^(js|ts|tsx|jsx|py|rb|go|rs|java|c|cpp|h|json|ya?ml|toml|sql)$/.test(ext)) {
    return { icon: <IconFileCode className="w-10 h-10" />, color: "text-indigo-500" };
  }
  if (ext === "html" || ext === "css" || ext === "xml") {
    return { icon: <IconFileTypeHtml className="w-10 h-10" />, color: "text-pink-500" };
  }
  if (ext === "txt" || ext === "md") {
    return { icon: <IconFileTypeTxt className="w-10 h-10" />, color: "text-gray-400" };
  }
  if (mimeType.startsWith("audio/") || ["mp3", "wav", "ogg", "flac"].includes(ext)) {
    return { icon: <IconFileMusic className="w-10 h-10" />, color: "text-purple-500" };
  }
  if (mimeType.startsWith("video/") || ["mp4", "webm", "mov", "avi"].includes(ext)) {
    return { icon: <IconFile className="w-10 h-10" />, color: "text-red-400" };
  }
  return { icon: <IconFileUnknown className="w-10 h-10" />, color: "text-gray-400" };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toUpperCase() ?? "";
}
