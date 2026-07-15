import { Link } from "react-router-dom";
import type { Note } from "../types";

interface NoteCardProps {
  note: Note;
  title?: React.ReactNode;
  content?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function NoteCard({
  note,
  title,
  content,
  footer,
}: NoteCardProps) {
  return (
    <Link
      to={`/note/${note.id}`}
      className="block p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
    >
      <h3 className="font-medium text-gray-900 dark:text-gray-100">
        {title ?? (note.title || "Untitled")}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
        {content ?? (note.content || "No content")}
      </p>
      {footer !== undefined ? (
        footer
      ) : (
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          {new Date(note.updatedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
    </Link>
  );
}
