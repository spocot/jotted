import { useState, useRef, useEffect } from "react";
import type { ProjectCard, ProjectColumn } from "../types";
import { IconPlus, IconDots } from "@tabler/icons-react";
import KanbanCard from "./KanbanCard";

interface KanbanColumnProps {
  column: ProjectColumn;
  cards: ProjectCard[];
  onAddCard: (columnId: string) => void;
  onEditCard: (card: ProjectCard) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onCardDragStart?: (
    cardId: string,
    fromColumnId: string,
    element: HTMLElement,
  ) => void;
  onCardDrop?: (cardId: string, targetColumnId: string) => void;
}

export default function KanbanColumn({
  column,
  cards,
  onAddCard,
  onEditCard,
  onRenameColumn,
  onDeleteColumn,
  onCardDragStart,
  onCardDrop,
}: KanbanColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [showMenu, setShowMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const columnRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(column.title);
  }, [column.title]);

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleSave = () => {
    if (title.trim() && title.trim() !== column.title) {
      onRenameColumn(column.id, title.trim());
    } else {
      setTitle(column.title);
    }
    setIsEditingTitle(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const cardId = e.dataTransfer.getData("text/plain");
    if (cardId) {
      onCardDrop?.(cardId, column.id);
    }
  };

  return (
    <div
      ref={columnRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-shrink-0 w-72 flex flex-col bg-gray-50 dark:bg-gray-900 rounded-xl border ${
        isDragOver
          ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/10"
          : "border-gray-200 dark:border-gray-800"
      } transition-colors`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSave();
                if (e.key === "Escape") {
                  setTitle(column.title);
                  setIsEditingTitle(false);
                }
              }}
              className="text-sm font-semibold bg-transparent border-b border-blue-500 outline-none px-0 py-0 text-gray-900 dark:text-gray-100 w-full"
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate"
            >
              {column.title}
            </button>
          )}
          <span className="text-xs text-gray-400 font-medium shrink-0">
            {cards.length}
          </span>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <IconDots className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {showMenu && (
            <>
              <button
                onClick={() => {
                  setIsEditingTitle(true);
                  setShowMenu(false);
                }}
                className="absolute right-0 top-full mt-1 whitespace-nowrap px-2 py-1 text-xs rounded bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
              >
                Rename
              </button>
              <button
                onClick={() => {
                  onDeleteColumn(column.id);
                  setShowMenu(false);
                }}
                className="absolute right-0 top-full mt-8 whitespace-nowrap px-2 py-1 text-xs rounded bg-white dark:bg-gray-800 shadow-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors z-10"
              >
                Delete column
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[60px]">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            columnId={column.id}
            onEdit={onEditCard}
            onDragStart={onCardDragStart}
            onDragEnd={() => setIsDragOver(false)}
          />
        ))}
      </div>

      {/* Add card button */}
      <button
        onClick={() => onAddCard(column.id)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-b-xl transition-colors"
      >
        <IconPlus className="w-3.5 h-3.5" />
        Add card
      </button>
    </div>
  );
}
