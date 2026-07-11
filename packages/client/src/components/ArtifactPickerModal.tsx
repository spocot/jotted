import { useState } from "react";
import {
  IconFileText,
  IconLayoutKanban,
  IconPhoto,
  IconLink,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useLazySearchNotesQuery } from "../store/redux/api";

interface ArtifactPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selection: {
    title: string;
    artifactType: string;
    referenceId?: string;
    referenceUrl?: string;
  }) => void;
}

const TABS = [
  { id: "note", label: "Note", icon: IconFileText },
  { id: "canvas", label: "Canvas", icon: IconLayoutKanban },
  { id: "image", label: "Image", icon: IconPhoto },
  { id: "external_link", label: "External Link", icon: IconLink },
] as const;

export default function ArtifactPickerModal({
  open,
  onClose,
  onSelect,
}: ArtifactPickerModalProps) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("note");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; title: string; path?: string }>>([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [searchNotes] = useLazySearchNotesQuery();

  if (!open) return null;

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (tab === "note") {
      const result = await searchNotes({ q: searchQuery, limit: 10 }).unwrap();
      setSearchResults(result.items);
      return;
    }
    setSearchResults([]);
  };

  const handleSubmitUrl = () => {
    if (!url.trim()) return;
    onSelect({
      title: title.trim() || url.trim(),
      artifactType: tab === "image" ? "image" : "external_link",
      referenceUrl: url.trim(),
      referenceId: undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold">Add Artifact</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setSearchResults([]);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {/* Title & Description (shared) */}
          <div className="space-y-2 mb-4">
            <input
              type="text"
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Note search */}
          {tab === "note" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value) setSearchResults([]);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  className="flex-1 px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  <IconSearch className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Search will return matching notes to link
              </p>
              {searchResults.length > 0 && (
                <div className="space-y-1 mt-2">
                  {searchResults.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => {
                        onSelect({
                          title: title.trim() || note.title,
                          artifactType: "note",
                          referenceId: note.id,
                        });
                        onClose();
                      }}
                      className="w-full text-left px-3 py-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {note.title}
                      </div>
                      {note.path && (
                        <div className="text-xs text-gray-400 truncate">{note.path}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Canvas placeholder */}
          {tab === "canvas" && (
            <p className="text-xs text-gray-400">
              Canvas picker coming soon. Select "Note" to link a canvas by name.
            </p>
          )}

          {/* Image / URL */}
          {(tab === "image" || tab === "external_link") && (
            <div className="space-y-2">
              <input
                type="url"
                placeholder={
                  tab === "image" ? "Image URL..." : "https://..."
                }
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSubmitUrl}
                disabled={!url.trim()}
                className="w-full px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 rounded transition-colors"
              >
                Add Link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
