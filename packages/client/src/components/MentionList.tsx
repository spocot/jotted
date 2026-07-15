import { useState, useEffect, useImperativeHandle, forwardRef, type KeyboardEvent } from "react";
import { IconUser, IconLoader2 } from "@tabler/icons-react";

interface MentionItem {
  id: string;
  name: string;
  email: string | null;
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: MentionItem) => void;
  query: string;
  isLoading?: boolean;
}

export interface MentionListRef {
  onKeyDown: (e: KeyboardEvent) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  function MentionList({ items, command, isLoading }, _ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const handleKeyDown = (e: KeyboardEvent): boolean => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        return true;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (items[selectedIndex]) {
          command(items[selectedIndex]);
        }
        return true;
      }
      return false;
    };

    useImperativeHandle(_ref, () => ({
      onKeyDown: handleKeyDown,
    }));

    if (isLoading && items.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2">
          <div className="flex items-center justify-center py-3">
            <IconLoader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2">
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
            No people found
          </div>
        </div>
      );
    }

    return (
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => command(item)}
            className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
              index === selectedIndex
                ? "bg-indigo-50 dark:bg-indigo-900/30"
                : "hover:bg-gray-50 dark:hover:bg-gray-750"
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
              <IconUser className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {item.name}
              </div>
              {item.email && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {item.email}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  },
);

export default MentionList;
