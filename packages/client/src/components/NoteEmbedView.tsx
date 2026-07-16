import { useNavigate } from "react-router-dom";
import { IconExternalLink, IconFileUnknown } from "@tabler/icons-react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useGetNotesQuery } from "../store/redux/api";
import { markdownToHtml } from "../lib/markdown";
import type { Note } from "../types";

export default function NoteEmbedView({ node, selected }: NodeViewProps) {
  const title = (node.attrs as { title?: string }).title ?? "";
  const navigate = useNavigate();
  const { data: notesPage, isLoading, isError } = useGetNotesQuery(
    { title, limit: 1 },
    { skip: !title },
  );
  const note: Note | undefined = notesPage?.items?.[0];

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (note) {
      navigate(`/note/${note.id}`);
    }
  };

  if (!title) {
    return (
      <NodeViewWrapper>
        <div className="my-4 p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/20 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <IconFileUnknown size={16} />
          <span>Embed error: no note title specified</span>
        </div>
      </NodeViewWrapper>
    );
  }

  if (isLoading) {
    return (
      <NodeViewWrapper>
        <div className="my-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/40 animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32" />
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  if (isError || !note) {
    return (
      <NodeViewWrapper>
        <div className="my-4 p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/20 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <IconFileUnknown size={16} />
          <span>Embed: note "{title}" not found</span>
        </div>
      </NodeViewWrapper>
    );
  }

  const contentHtml = markdownToHtml(note.content || "");

  return (
    <NodeViewWrapper>
      <div
        className={`my-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 overflow-hidden ${
          selected ? "ring-2 ring-blue-400" : ""
        }`}
        contentEditable={false}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-blue-100 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
            <IconExternalLink size={14} />
            <span>{note.title || "Untitled"}</span>
          </div>
          <button
            onClick={handleOpen}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Open note
          </button>
        </div>
        <div
          className="px-4 py-3 text-sm prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>
    </NodeViewWrapper>
  );
}
