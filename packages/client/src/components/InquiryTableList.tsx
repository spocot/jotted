import { useState } from "react";
import { IconSearch } from "@tabler/icons-react";

interface InquiryTableListProps {
  tables: string[];
  selectedTable: string | null;
  onSelectTable: (table: string) => void;
  isLoading: boolean;
}

export default function InquiryTableList({
  tables,
  selectedTable,
  onSelectTable,
  isLoading,
}: InquiryTableListProps) {
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? tables.filter((t) => t.toLowerCase().includes(filter.toLowerCase()))
    : tables;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter tables..."
            className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="px-3 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">
            Loading...
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="px-3 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">
            {filter ? "No tables match" : "No tables found"}
          </div>
        )}
        {filtered.map((table) => (
          <button
            key={table}
            onClick={() => onSelectTable(table)}
            className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
              selectedTable === table
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {table}
          </button>
        ))}
      </div>
    </div>
  );
}
