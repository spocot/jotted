import { useRef } from "react";
import type { ProjectCard } from "../types";
import { IconCalendarDue, IconGripVertical } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

interface KanbanCardProps {
  card: ProjectCard;
  columnId: string;
  onEdit: (card: ProjectCard) => void;
  onDragStart?: (cardId: string, columnId: string, element: HTMLElement) => void;
  onDragEnd?: () => void;
}

export default function KanbanCard({
  card,
  columnId,
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
        onEdit(card);
      }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 cursor-pointer hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {card.title}
          </p>
          {card.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {card.description}
            </p>
          )}
        </div>
        <button
          className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-grab active:cursor-grabbing"
        >
          <IconGripVertical className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      <div className="flex items-center gap-3 mt-2">
        {card.dueDate && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <IconCalendarDue className="w-3 h-3" />
            {formatDate(card.dueDate)}
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
