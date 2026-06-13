import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Note } from "../types";

interface BacklinksPanelProps {
  noteId: string;
  noteTitle: string;
}

export default function BacklinksPanel({ noteId, noteTitle }: BacklinksPanelProps) {
  const navigate = useNavigate();
  const [backlinks, setBacklinks] = useState<Note[]>([]);
  const [unlinked, setUnlinked] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.getNoteBacklinks(noteId),
      api.getNoteUnlinkedMentions(noteId),
    ]).then(([bl, um]) => {
      if (cancelled) return;
      setBacklinks(bl);
      setUnlinked(um);
    }).catch(() => {
      // ignore
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [noteId]);

  if (loading) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 px-1 py-2">
        Loading connections...
      </div>
    );
  }

  if (backlinks.length === 0 && unlinked.length === 0) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 px-1 py-2">
        No other notes link to this note.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {backlinks.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Linked references ({backlinks.length})
          </h4>
          <ul className="space-y-1">
            {backlinks.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => navigate(`/note/${n.id}`)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline text-left"
                >
                  {n.title || "Untitled"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {unlinked.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1.5">
            Unlinked mentions ({unlinked.length})
          </h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
            These notes mention "{noteTitle}" without a wikilink.
          </p>
          <ul className="space-y-1">
            {unlinked.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => navigate(`/note/${n.id}`)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline text-left"
                >
                  {n.title || "Untitled"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
