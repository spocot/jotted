import { useState, useRef, useEffect } from "react";
import type { ProjectCard, ProjectColumn } from "../types";
import {
  IconPlus,
  IconDots,
  IconChevronUp,
  IconChevronDown,
} from "@tabler/icons-react";
import KanbanCard from "./KanbanCard";

type SortField = "position" | "title" | "dueDate" | "createdAt" | "updatedAt";

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "position", label: "Position" },
  { value: "title", label: "Title" },
  { value: "dueDate", label: "Due date" },
  { value: "createdAt", label: "Created" },
  { value: "updatedAt", label: "Updated" },
];

interface KanbanColumnProps {
  column: ProjectColumn;
  cards: ProjectCard[];
  totalCount?: number;
  sortField?: SortField;
  sortAscending?: boolean;
  selectedCardIds?: Set<string>;
  onSortChange?: (field: SortField, ascending: boolean) => void;
  onToggleSelect?: (cardId: string) => void;
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
  totalCount,
  sortField = "position",
  sortAscending = true,
  selectedCardIds,
  onSortChange,
  onToggleSelect,
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
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const columnRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(column.title);
  }, [column.title]);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-column-menu]")) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  useEffect(() => {
    if (!showSortMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-sort-menu]")) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSortMenu]);

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

  const cardCount = totalCount ?? cards.length;

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
            {cardCount}
            {totalCount && totalCount !== cards.length
              ? ` / ${totalCount}`
              : ""}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Sort button */}
          {onSortChange && (
            <div className="relative" data-sort-menu>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Sort cards"
              >
                {sortAscending ? (
                  <IconChevronUp className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <IconChevronDown className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 whitespace-nowrap bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 rounded-lg z-20 py-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (sortField === opt.value) {
                          onSortChange(opt.value, !sortAscending);
                        } else {
                          onSortChange(opt.value, true);
                        }
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1 text-xs transition-colors ${
                        sortField === opt.value
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {opt.label}
                      {sortField === opt.value && (
                        <span className="ml-1 text-gray-400">
                          {sortAscending ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Column menu */}
          <div className="relative" data-column-menu>
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
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[60px]">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            columnId={column.id}
            selected={selectedCardIds?.has(card.id)}
            onSelect={onToggleSelect}
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
