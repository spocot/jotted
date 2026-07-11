import { useRef } from "react";
import type { ProjectCard } from "../types";
import { IconCalendarDue, IconGripVertical } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

interface KanbanCardProps {
  card: ProjectCard;
  columnId: string;
  selected?: boolean;
  onSelect?: (cardId: string) => void;
  onEdit: (card: ProjectCard) => void;
  onDragStart?: (cardId: string, columnId: string, element: HTMLElement) => void;
  onDragEnd?: () => void;
}

export default function KanbanCard({
  card,
  columnId,
  selected,
  onSelect,
  onEdit,
  onDragStart,
  onDragEnd,
}: KanbanCardProps) {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const isOverdue =
    card.dueDate && new Date(card.dueDate) < new Date() && !card.checklist?.every((i) => i.done);

  return (
    <div
      ref={cardRef}
      draggable="true"
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", card.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(card.id, columnId, cardRef.current!);
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect && (e.shiftKey || e.metaKey || e.ctrlKey)) {
          onSelect(card.id);
        } else {
          onEdit(card);
        }
      }}
      className={`bg-white dark:bg-gray-800 rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow group ${
        selected
          ? "border-blue-400 dark:border-blue-500 ring-1 ring-blue-200 dark:ring-blue-800"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Selection checkbox */}
        {onSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(card.id);
            }}
            className={`shrink-0 mt-0.5 w-4 h-4 rounded border transition-colors flex items-center justify-center ${
              selected
                ? "bg-blue-500 border-blue-500 text-white"
                : "border-gray-300 dark:border-gray-600 hover:border-blue-400"
            }`}
          >
            {selected && (
              <svg
                className="w-2.5 h-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {card.title}
          </p>
          {card.labels && card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {card.labels.map((label) => (
                <span
                  key={label.id}
                  className="px-1.5 py-0.5 text-[10px] font-medium rounded-full text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
          {card.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {card.description}
            </p>
          )}
        </div>
        <button className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-grab active:cursor-grabbing">
          <IconGripVertical className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      <div className="flex items-center gap-3 mt-2">
        {card.dueDate && (
          <span
            className={`flex items-center gap-1 text-xs ${
              isOverdue
                ? "text-red-500 font-medium"
                : "text-gray-400"
            }`}
          >
            <IconCalendarDue className="w-3 h-3" />
            {formatDate(card.dueDate)}
          </span>
        )}
        {card.checklist && card.checklist.length > 0 && (
          <span className="text-xs text-gray-400">
            {card.checklist.filter((i) => i.done).length}/
            {card.checklist.length} done
          </span>
        )}
        {card.commentCount && card.commentCount > 0 && (
          <span className="text-xs text-gray-400">
            {card.commentCount} comment{card.commentCount !== 1 ? "s" : ""}
          </span>
        )}
        {card.noteId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/note/${card.noteId}`);
            }}
            className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
          >
            Open note
          </button>
        )}
      </div>
    </div>
  );
}
