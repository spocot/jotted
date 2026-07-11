import {
  IconArrowUp,
  IconArrowDown,
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
} from "@tabler/icons-react";
import type { InquiryRow, InquiryColumnInfo, InquiryForeignKey } from "../types";

interface InquiryRowTableProps {
  rows: InquiryRow[];
  columns: InquiryColumnInfo[];
  foreignKeys: InquiryForeignKey[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  isLoading: boolean;
  sortColumn: string | null;
  sortOrder: "ASC" | "DESC";
  onSortColumn: (column: string) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onRowClick: (rowKey: string) => void;
  onForeignKeyClick: (table: string, column: string, value: string) => void;
  selectedRowKey: string | null;
}

export default function InquiryRowTable({
  rows,
  columns,
  foreignKeys,
  total,
  offset,
  limit,
  hasMore,
  isLoading,
  sortColumn,
  sortOrder,
  onSortColumn,
  onPrevPage,
  onNextPage,
  onRowClick,
  onForeignKeyClick,
  selectedRowKey,
}: InquiryRowTableProps) {
  const colNames = columns.map((c) => c.name);
  const pkColumn = columns.find((c) => c.pk > 0);
  const hasPk = pkColumn != null;

  const fkByColumn = new Map<string, InquiryForeignKey>();
  for (const fk of foreignKeys) {
    for (const fromCol of fk.from) {
      if (!fkByColumn.has(fromCol)) {
        fkByColumn.set(fromCol, fk);
      }
    }
  }

  const getRowKey = (row: InquiryRow): string => {
    if (hasPk) {
      return String(row[pkColumn!.name] ?? String(row.rowid));
    }
    return String(row.rowid);
  };

  const start = offset + 1;
  const end = Math.min(offset + rows.length, total);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {total > 0
            ? `Rows ${start}-${end} of ${total}`
            : "No rows"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevPage}
            disabled={offset === 0}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-default transition-colors"
            title="Previous page"
          >
            <IconChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {Math.floor(offset / limit) + 1}
          </span>
          <button
            onClick={onNextPage}
            disabled={!hasMore}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-default transition-colors"
            title="Next page"
          >
            <IconChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded">
        {isLoading && (
          <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">
            Loading...
          </div>
        )}
        {!isLoading && rows.length === 0 && (
          <div className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">
            No rows in this table.
          </div>
        )}
        {!isLoading && rows.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  rowid
                </th>
                {colNames.map((name) => (
                  <th
                    key={name}
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 select-none"
                    onClick={() => onSortColumn(name)}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {name}
                      {sortColumn === name &&
                        (sortOrder === "ASC" ? (
                          <IconArrowUp className="w-3 h-3" />
                        ) : (
                          <IconArrowDown className="w-3 h-3" />
                        ))}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowKey = getRowKey(row);
                const isSelected = rowKey === selectedRowKey;
                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick(rowKey)}
                    className={`border-t border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <td className="px-3 py-1.5 font-mono text-xs text-gray-400 dark:text-gray-500">
                      {String(row.rowid)}
                    </td>
                    {colNames.map((name) => {
                      const val = row[name];
                      const display =
                        val === null
                          ? "NULL"
                          : typeof val === "object"
                            ? JSON.stringify(val)
                            : String(val);
                      const fk = fkByColumn.get(name);
                      const isFk = fk != null && val !== null && val !== undefined;
                      return (
                        <td
                          key={name}
                          className="px-3 py-1.5 max-w-xs truncate text-gray-700 dark:text-gray-300"
                          title={display}
                        >
                          {val === null ? (
                            <span className="text-gray-400 dark:text-gray-500 italic">
                              NULL
                            </span>
                          ) : isFk ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onForeignKeyClick(fk.table, fk.to[0], String(val));
                              }}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-0.5 max-w-full truncate"
                              title={`Navigate to ${fk.table}.${fk.to[0]} = ${val}`}
                            >
                              <span className="truncate">{display}</span>
                              <IconExternalLink className="w-3 h-3 shrink-0" />
                            </button>
                          ) : (
                            display
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
