import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useNoteStore } from "../store/useNoteStore";
import { useUIStore } from "../store/useUIStore";

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { notes } = useNoteStore();
  const { toggleDarkMode } = useUIStore();

  const commands: Command[] = [
    {
      id: "new-note",
      label: "New Note",
      shortcut: "N",
      action: () => navigate("/"),
    },
    {
      id: "search",
      label: "Search Notes",
      shortcut: "Ctrl+Shift+F",
      action: () => navigate("/search"),
    },
    {
      id: "graph",
      label: "Graph View",
      shortcut: "G",
      action: () => navigate("/graph"),
    },
    {
      id: "tags",
      label: "Tags",
      shortcut: "T",
      action: () => navigate("/tags"),
    },
    {
      id: "home",
      label: "All Notes",
      shortcut: "H",
      action: () => navigate("/"),
    },
    {
      id: "dark-mode",
      label: "Toggle Dark Mode",
      shortcut: "",
      action: () => toggleDarkMode(),
    },
    ...notes.slice(0, 10).map((note) => ({
      id: `note-${note.id}`,
      label: `Open: ${note.title || "Untitled"}`,
      shortcut: "",
      action: () => navigate(`/note/${note.id}`),
    })),
  ];

  const filtered = query.trim()
    ? commands.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()),
      )
    : commands;

  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const execute = useCallback(
    (cmd: Command) => {
      cmd.action();
      setOpen(false);
    },
    [],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIdx]) {
      e.preventDefault();
      execute(filtered[selectedIdx]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          className="w-full px-4 py-3 text-sm bg-transparent border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
        />
        <div className="max-h-72 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">
              No matching commands
            </div>
          )}
          {filtered.map((cmd, idx) => (
            <button
              key={cmd.id}
              onClick={() => execute(cmd)}
              onMouseEnter={() => setSelectedIdx(idx)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between gap-4 transition-colors ${
                idx === selectedIdx
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <span className="truncate">{cmd.label}</span>
              {cmd.shortcut && (
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {cmd.shortcut}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
