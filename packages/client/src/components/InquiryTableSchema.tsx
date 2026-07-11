import { useState } from "react";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import type { InquiryColumnInfo } from "../types";

interface InquiryTableSchemaProps {
  columns: InquiryColumnInfo[];
  isLoading: boolean;
}

export default function InquiryTableSchema({
  columns,
  isLoading,
}: InquiryTableSchemaProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 mb-2"
      >
        {open ? (
          <IconChevronDown className="w-4 h-4" />
        ) : (
          <IconChevronRight className="w-4 h-4" />
        )}
        Schema ({columns.length} columns)
      </button>
      {open && (
        <div className="overflow-x-auto">
          {isLoading && (
            <div className="text-sm text-gray-400 dark:text-gray-500 py-2">
              Loading...
            </div>
          )}
          {!isLoading && columns.length === 0 && (
            <div className="text-sm text-gray-400 dark:text-gray-500 py-2">
              No schema information.
            </div>
          )}
          {!isLoading && columns.length > 0 && (
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    #
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Column
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Type
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    PK
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Not Null
                  </th>
                  <th className="px-3 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Default
                  </th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col) => (
                  <tr
                    key={col.cid}
                    className="border-t border-gray-200 dark:border-gray-700"
                  >
                    <td className="px-3 py-1 text-gray-400 dark:text-gray-500">
                      {col.cid}
                    </td>
                    <td className="px-3 py-1 font-mono text-gray-800 dark:text-gray-200">
                      {col.name}
                    </td>
                    <td className="px-3 py-1 text-gray-500 dark:text-gray-400">
                      {col.type}
                    </td>
                    <td className="px-3 py-1">
                      {col.pk > 0 && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                          PK
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1">
                      {col.notnull === 1 && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                          NOT NULL
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1 text-gray-400 dark:text-gray-500 font-mono text-xs">
                      {col.dfltValue ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
