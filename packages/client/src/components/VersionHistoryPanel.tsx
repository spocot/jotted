import { useState } from "react";
import {
  useGetNoteVersionsQuery,
  useGetNoteVersionQuery,
  useRestoreNoteVersionMutation,
} from "../store/redux/api";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import type { NoteVersion } from "../types";

interface VersionHistoryPanelProps {
  noteId: string;
}

type ViewMode = "list" | "detail" | "compare";

export default function VersionHistoryPanel({ noteId }: VersionHistoryPanelProps) {
  const dispatch = useAppDispatch();
  const [offset, setOffset] = useState(0);
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<ViewMode>("list");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareVersionId, setCompareVersionId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const VERSIONS_PAGE_SIZE = 20;

  const { data: page, isLoading } = useGetNoteVersionsQuery(
    { id: noteId, limit: VERSIONS_PAGE_SIZE, offset },
    { skip: loaded && offset === 0 },
  );

  if (page && !loaded) {
    setVersions(page.items);
    setLoaded(true);
  }

  const { data: selectedVersion } = useGetNoteVersionQuery(
    { id: noteId, versionId: selectedVersionId ?? "" },
    { skip: !selectedVersionId },
  );

  const { data: compareVersion } = useGetNoteVersionQuery(
    { id: noteId, versionId: compareVersionId ?? "" },
    { skip: !compareVersionId },
  );

  const [restoreVersion] = useRestoreNoteVersionMutation();

  const loadMore = () => {
    setOffset((prev) => prev + VERSIONS_PAGE_SIZE);
    setLoaded(false);
  };

  const handleSelectVersion = (versionId: string) => {
    setSelectedVersionId(versionId);
    setMode("detail");
  };

  const handleCompare = (versionId: string) => {
    if (compareVersionId === versionId) {
      setCompareVersionId(null);
      return;
    }
    if (!compareVersionId) {
      setCompareVersionId(versionId);
    } else {
      setSelectedVersionId(versionId);
      setCompareVersionId(compareVersionId);
      setMode("compare");
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm("Restore this version? Current content will be saved as a new version.")) return;
    setRestoring(true);
    try {
      await restoreVersion({ id: noteId, versionId }).unwrap();
      dispatch(addToast("Version restored", "success"));
      setMode("list");
      setSelectedVersionId(null);
      setCompareVersionId(null);
      setVersions([]);
      setLoaded(false);
      setOffset(0);
    } catch {
      dispatch(addToast("Failed to restore version", "error"));
    } finally {
      setRestoring(false);
    }
  };

  const backToList = () => {
    setMode("list");
    setSelectedVersionId(null);
    setCompareVersionId(null);
  };

  if (mode === "detail" && selectedVersion) {
    return (
      <div className="space-y-2">
        <button
          onClick={backToList}
          className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to versions
        </button>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {new Date(selectedVersion.createdAt).toLocaleString()}
        </div>
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {selectedVersion.title || "Untitled"} &middot; {selectedVersion.content.length} chars
        </div>
        <div className="max-h-60 overflow-y-auto bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs font-mono whitespace-pre-wrap">
          {selectedVersion.content || "(empty)"}
        </div>
        <button
          onClick={() => handleRestore(selectedVersion.id)}
          disabled={restoring}
          className="w-full text-xs px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white transition-colors"
        >
          {restoring ? "Restoring..." : "Restore this version"}
        </button>
      </div>
    );
  }

  if (mode === "compare" && selectedVersion && compareVersion) {
    const diffLines = computeDiff(compareVersion.content, selectedVersion.content);
    return (
      <div className="space-y-2">
        <button
          onClick={backToList}
          className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to versions
        </button>
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <span>
            {new Date(compareVersion.createdAt).toLocaleString()} ({compareVersion.content.length} chars)
          </span>
          <span className="text-gray-300 dark:text-gray-600">&rarr;</span>
          <span>
            {new Date(selectedVersion.createdAt).toLocaleString()} ({selectedVersion.content.length} chars)
          </span>
        </div>
        <div className="max-h-60 overflow-y-auto bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs font-mono">
          {diffLines.map((line, i) => (
            <div
              key={i}
              className={`${
                line[0] === "+"
                  ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300"
                  : line[0] === "-"
                    ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"
                    : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {line}
            </div>
          ))}
        </div>
        <button
          onClick={() => handleRestore(selectedVersion.id)}
          disabled={restoring}
          className="w-full text-xs px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white transition-colors"
        >
          {restoring ? "Restoring..." : "Restore this version"}
        </button>
      </div>
    );
  }

  const allVersions = versions;
  const hasMore = page?.hasMore ?? false;

  if (isLoading && allVersions.length === 0) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 px-1 py-2">
        Loading versions...
      </div>
    );
  }

  if (allVersions.length === 0 && !hasMore) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 px-1 py-2">
        No version history yet. Versions are saved automatically when you edit.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {allVersions.map((version) => (
        <div
          key={version.id}
          className={`group flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
            selectedVersionId === version.id
              ? "bg-blue-50 dark:bg-blue-900/20"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          onClick={() => handleSelectVersion(version.id)}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-gray-700 dark:text-gray-300 truncate">
              {new Date(version.createdAt).toLocaleString()}
            </div>
            <div className="text-gray-400 dark:text-gray-500">
              {version.content.length} chars
              {version.title && <> &middot; {version.title}</>}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCompare(version.id);
            }}
            className={`opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded text-gray-400 hover:text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity ${
              compareVersionId === version.id ? "text-blue-500 !opacity-100" : ""
            }`}
            title={compareVersionId === version.id ? "Remove from comparison" : "Select for comparison"}
          >
            {compareVersionId === version.id ? "✓" : "⇄"}
          </button>
        </div>
      ))}
      {hasMore && (
        <button
          onClick={loadMore}
          className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 px-2 py-1"
        >
          Load more
        </button>
      )}
    </div>
  );
}

function computeDiff(a: string, b: string): string[] {
  const linesA = a.split("\n");
  const linesB = b.split("\n");
  const result: string[] = [];
  let i = 0;
  let j = 0;

  while (i < linesA.length && j < linesB.length) {
    if (linesA[i] === linesB[j]) {
      result.push(" " + linesA[i]);
      i++;
      j++;
    } else if (j + 1 < linesB.length && linesA[i] === linesB[j + 1]) {
      result.push("+" + linesB[j]);
      j++;
    } else {
      result.push("-" + linesA[i]);
      i++;
    }
  }

  while (i < linesA.length) {
    result.push("-" + linesA[i]);
    i++;
  }

  while (j < linesB.length) {
    result.push("+" + linesB[j]);
    j++;
  }

  return result;
}
