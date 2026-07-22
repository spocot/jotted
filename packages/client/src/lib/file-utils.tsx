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
  IconMail,
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
  if (ext === "msg" || ext === "eml" || mimeType === "message/rfc822" || mimeType === "application/vnd.ms-outlook") {
    return { icon: <IconMail className="w-10 h-10" />, color: "text-blue-500" };
  }
  return { icon: <IconFileUnknown className="w-10 h-10" />, color: "text-gray-400" };
}

const EMAIL_MIME_TYPES = [
  "message/rfc822",
  "application/vnd.ms-outlook",
  "application/x-ole-storage",
];

const EMAIL_LIKE_MIMES = [
  "application/octet-stream",
  "",
  "application/x-msdownload",
];

export function isEmailFile(file: File): boolean {
  if (EMAIL_MIME_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  if (name.endsWith(".msg") || name.endsWith(".eml")) return true;
  if (EMAIL_LIKE_MIMES.includes(file.type)) {
    if (/\.(msg|eml)$/i.test(file.name)) return true;
    if (file.name === "" || file.name === "blob") return true;
  }
  return false;
}

export function extractFileFromDrag(dataTransfer: DataTransfer): File | undefined {
  for (let i = 0; i < (dataTransfer.files?.length ?? 0); i++) {
    const f = dataTransfer.files[i];
    if (f) return f;
  }
  for (let i = 0; i < (dataTransfer.items?.length ?? 0); i++) {
    const item = dataTransfer.items[i];
    if (item.kind === "file") {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  return undefined;
}

function extractSubjectFromHtml(html: string): string {
  let m = html.match(/>([^<]{2,80}?)\s*-\s*[^<]+</s);
  if (m) return m[1].trim().replace(/[<>:"/\\|?*]/g, "_");
  m = html.match(/<title>([^<]+)<\/title>/i);
  if (m) return m[1].trim().replace(/[<>:"/\\|?*]/g, "_").slice(0, 80);
  m = html.match(/<h[1-6][^>]*>([^<]+)/i);
  if (m) return m[1].trim().replace(/[<>:"/\\|?*]/g, "_").slice(0, 80);
  return "";
}

export function tryCreateEmailFileFromDrag(dataTransfer: DataTransfer): File | undefined {
  const html = dataTransfer.getData("text/html");
  const plain = dataTransfer.getData("text/plain");
  const rtf = dataTransfer.getData("text/rtf");

  if (!html && !plain && !rtf) return undefined;

  let body = html || "";
  if (!body && rtf) {
    const rtfText = rtf.replace(/\\(rtf[^ ]*|pard|par|tab|cell|row|header[flr]?|footer[flr]?|page|sectd?|pnseclvl[0-9]*|colortbl[;]|stylesheet|fonttbl[;]|listtable[;]|listoverridetable[;]|\\\*\\[a-z]+|\\[a-z]+[0-9]*\s?)/gi, " ");
    const textMatch = rtfText.match(/[a-zA-Z]{3,}[\s\S]{10,200}/);
    body = textMatch ? `<html><body><p>${textMatch[0].replace(/\s+/g, " ").trim()}</p></body></html>` : "";
  }

  if (!body && !plain) return undefined;

  const subject = html || rtf ? extractSubjectFromHtml(body) : (plain ?? "").slice(0, 80).trim();
  const filename = `${subject || "Email"}.eml`;

  const cleanedBody = body
    ? body.replace(/^<meta[^>]*>/g, "").replace(/^<html[^>]*>/, "").replace(/<\/html>/, "")
    : (plain ?? "");

  const header = [
    "X-Unsent: 1",
    `Date: ${new Date().toUTCString()}`,
    subject ? `Subject: ${subject}` : "",
    "Content-Type: text/html; charset=utf-8",
    "",
    "",
  ].join("\r\n");

  const content = subject ? `${header}\r\n${cleanedBody}` : (html ?? plain ?? rtf ?? "");
  return new File([content], filename, { type: "message/rfc822" });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toUpperCase() ?? "";
}
