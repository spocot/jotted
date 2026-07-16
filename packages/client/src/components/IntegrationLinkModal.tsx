import { useState } from "react";
import {
  useLazyGetJiraIssueQuery,
  useLazyResolveConfluencePageQuery,
  useCreateIntegrationLinkMutation,
} from "../store/redux/api";
import type { JiraIssueInfo, ConfluencePageInfo } from "../types";

interface IntegrationLinkModalProps {
  open: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  onLinkCreated: () => void;
}

export default function IntegrationLinkModal({
  open,
  onClose,
  entityType,
  entityId,
  onLinkCreated,
}: IntegrationLinkModalProps) {
  const [type, setType] = useState<"jira" | "confluence">("jira");
  const [input, setInput] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [found, setFound] = useState<JiraIssueInfo | ConfluencePageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [lookupJira] = useLazyGetJiraIssueQuery();
  const [lookupConfluence] = useLazyResolveConfluencePageQuery();
  const [createLink] = useCreateIntegrationLinkMutation();

  const reset = () => {
    setInput("");
    setFound(null);
    setError(null);
    setLookingUp(false);
    setCreating(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleLookup = async () => {
    setError(null);
    setFound(null);
    setLookingUp(true);
    try {
      if (type === "jira") {
        const result = await lookupJira(input.trim()).unwrap();
        setFound(result);
      } else {
        const result = await lookupConfluence(input.trim()).unwrap();
        setFound(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLookingUp(false);
    }
  };

  const handleConfirm = async () => {
    if (!found) return;
    setCreating(true);
    try {
      const externalId = type === "jira"
        ? (found as JiraIssueInfo).key
        : (found as ConfluencePageInfo).pageId;

      await createLink({
        entityType,
        entityId,
        integrationType: type,
        externalId,
      }).unwrap();
      onLinkCreated();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create link");
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") handleClose();
    if (e.key === "Enter" && input.trim() && !found) handleLookup();
  };

  if (!open) return null;

  const isJiraFound = found && "key" in found;
  const isConfluenceFound = found && "pageId" in found;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Link External Resource
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              Type
            </label>
            <div className="flex gap-1">
              <button
                onClick={() => { setType("jira"); reset(); }}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  type === "jira"
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Jira Issue
              </button>
              <button
                onClick={() => { setType("confluence"); reset(); }}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  type === "confluence"
                    ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Confluence Page
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
              {type === "jira" ? "Jira Issue Key" : "Confluence Page URL or ID"}
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setFound(null); setError(null); }}
              placeholder={type === "jira" ? "e.g. PROJ-123" : "https://... or page ID"}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim() && !found) {
                  e.preventDefault();
                  handleLookup();
                }
              }}
            />
          </div>

          {!found && (
            <button
              onClick={handleLookup}
              disabled={!input.trim() || lookingUp}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {lookingUp && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {lookingUp ? "Looking up..." : "Look Up"}
            </button>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {found && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                {isJiraFound ? (
                  <>
                    <span className="inline-flex items-center gap-1 px-1.5 py-px text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {(found as JiraIssueInfo).issueTypeIcon} {(found as JiraIssueInfo).key}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-px text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: `${(found as JiraIssueInfo).statusColor}22`,
                        color: (found as JiraIssueInfo).statusColor,
                      }}
                    >
                      {(found as JiraIssueInfo).status}
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-px text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                    Confluence
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {isJiraFound ? (found as JiraIssueInfo).summary : (found as ConfluencePageInfo).title}
              </p>
              <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                {isJiraFound && (
                  <>
                    <span>Assignee: {(found as JiraIssueInfo).assignee}</span>
                    <span>Priority: {(found as JiraIssueInfo).priorityIcon} {(found as JiraIssueInfo).priority}</span>
                  </>
                )}
                {isConfluenceFound && (
                  <span>Space: {(found as ConfluencePageInfo).spaceName}</span>
                )}
              </div>
              <button
                onClick={handleConfirm}
                disabled={creating}
                className="w-full mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {creating ? "Linking..." : "Confirm Link"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
