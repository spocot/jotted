import { useState, useEffect } from "react";
import { IconX, IconCopy, IconCheck } from "@tabler/icons-react";
import type { InquiryRow } from "../types";

interface InquiryJsonPanelProps {
  row: InquiryRow | null;
  isLoading: boolean;
  onClose: () => void;
}

export default function InquiryJsonPanel({
  row,
  isLoading,
  onClose,
}: InquiryJsonPanelProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [row]);

  const handleCopy = async () => {
    if (!row) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(row, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may not be available
    }
  };

  return (
    <div className="w-96 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col shrink-0 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Row Detail
        </h3>
        <div className="flex items-center gap-1">
          {row && (
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={copied ? "Copied" : "Copy JSON"}
            >
              {copied ? (
                <IconCheck className="w-4 h-4 text-green-500" />
              ) : (
                <IconCopy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Close"
          >
            <IconX className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-4 text-sm text-gray-400 dark:text-gray-500 text-center">
            Loading...
          </div>
        )}
        {!isLoading && !row && (
          <div className="p-4 text-sm text-gray-400 dark:text-gray-500 text-center">
            Click a row to view details.
          </div>
        )}
        {!isLoading && row && (
          <pre className="p-4 text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
            {JSON.stringify(row, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
