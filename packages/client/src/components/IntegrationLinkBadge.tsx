import { useState } from "react";
import type { IntegrationLink } from "../types";
import {
  useDeleteIntegrationLinkMutation,
  useRefreshIntegrationLinkMutation,
} from "../store/redux/api";

interface IntegrationLinkBadgeProps {
  link: IntegrationLink;
  onRefresh?: () => void;
}

export default function IntegrationLinkBadge({ link, onRefresh }: IntegrationLinkBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [deleteLink] = useDeleteIntegrationLinkMutation();
  const [refreshLink] = useRefreshIntegrationLinkMutation();

  let meta: Record<string, string> = {};
  try {
    meta = link.metaJson ? JSON.parse(link.metaJson) : {};
  } catch {
    // ignore
  }

  const isJira = link.integrationType === "jira";

  const handleRefresh = async () => {
    try {
      await refreshLink({
        id: link.id,
        entityType: link.entityType,
        entityId: link.entityId,
      }).unwrap();
      onRefresh?.();
    } catch {
      // ignore
    }
  };

  const handleDelete = async () => {
    if (confirm(`Remove link to ${link.title ?? link.externalId}?`)) {
      try {
        await deleteLink({
          id: link.id,
          entityType: link.entityType,
          entityId: link.entityId,
        }).unwrap();
      } catch {
        // ignore
      }
    }
  };

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <a
        href={link.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 px-1.5 py-px text-xs font-medium rounded-full transition-colors border group ${
          isJira
            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-800/30"
            : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-800/30"
        }`}
      >
        {isJira ? (
          <>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              <circle cx="12" cy="12" r="4" fill="currentColor"/>
            </svg>
            <span className="font-mono">{link.externalId}</span>
            {meta.status && (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: meta.statusColor || "#8993a4" }}
              />
            )}
          </>
        ) : (
          <>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
            </svg>
            <span className="max-w-[120px] truncate">{link.title ?? link.externalId}</span>
          </>
        )}
        <svg className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-40 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs">
          <div className="space-y-1.5">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {link.title ?? link.externalId}
            </p>
            {isJira && (
              <>
                {meta.status && (
                  <p className="text-gray-600 dark:text-gray-400">
                    Status:{" "}
                    <span style={{ color: meta.statusColor }}>{meta.status}</span>
                  </p>
                )}
                {meta.assignee && (
                  <p className="text-gray-600 dark:text-gray-400">
                    Assignee: {meta.assignee}
                  </p>
                )}
                {meta.priority && (
                  <p className="text-gray-600 dark:text-gray-400">
                    Priority: {meta.priority}
                  </p>
                )}
              </>
            )}
            {!isJira && meta.spaceName && (
              <p className="text-gray-600 dark:text-gray-400">
                Space: {meta.spaceName}
              </p>
            )}
            <div className="flex gap-2 pt-1 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={(e) => { e.preventDefault(); handleRefresh(); }}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Refresh
              </button>
              <button
                onClick={(e) => { e.preventDefault(); handleDelete(); }}
                className="text-red-600 dark:text-red-400 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
