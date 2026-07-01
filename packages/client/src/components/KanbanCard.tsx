import { useState, useRef } from "react";
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
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !cardRef.current) return;
    e.preventDefault();
    setIsDragging(true);
    onDragStart?.(card.id, columnId, cardRef.current);

    const startX = e.clientX;
    const startY = e.clientY;
    const ghost = cardRef.current.cloneNode(true) as HTMLElement;
    ghost.style.position = "fixed";
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "9999";
    ghost.style.opacity = "0.8";
    ghost.style.width = `${cardRef.current.offsetWidth}px`;
    ghost.style.transform = "rotate(3deg)";
    ghost.style.left = `${e.clientX}px`;
    ghost.style.top = `${e.clientY}px`;
    document.body.appendChild(ghost);

    const handleMouseMove = (ev: MouseEvent) => {
      ghost.style.left = `${ev.clientX - (e.clientX - startX)}px`;
      ghost.style.top = `${ev.clientY - (e.clientY - startY)}px`;
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      ghost.remove();
      setIsDragging(false);
      onDragEnd?.();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

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
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(card);
      }}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 cursor-pointer hover:shadow-md transition-shadow group ${
        isDragging ? "opacity-50" : ""
      }`}
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
          onMouseDown={(e) => e.stopPropagation()}
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
