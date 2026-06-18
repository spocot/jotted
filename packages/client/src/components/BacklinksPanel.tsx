import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetNoteBacklinksQuery,
  useGetNoteUnlinkedMentionsQuery,
} from "../store/redux/api";
import type { Note } from "../types";

interface BacklinksPanelProps {
  noteId: string;
  noteTitle: string;
}

const BACKLINK_PAGE_SIZE = 20;
const UNLINKED_PAGE_SIZE = 10;

export default function BacklinksPanel({ noteId, noteTitle }: BacklinksPanelProps) {
  const navigate = useNavigate();
  const [backlinkOffset, setBacklinkOffset] = useState(0);
  const [backlinkItems, setBacklinkItems] = useState<Note[]>([]);
  const [backlinkLoaded, setBacklinkLoaded] = useState(false);

  const { data: backlinkPage, isLoading: loadingBacklinks } =
    useGetNoteBacklinksQuery(
      { id: noteId, limit: BACKLINK_PAGE_SIZE, offset: backlinkOffset },
      { skip: backlinkLoaded && backlinkOffset === 0 },
    );

  // Accumulate backlinks
  if (backlinkPage && !backlinkLoaded) {
    setBacklinkItems(backlinkPage.items);
    setBacklinkLoaded(true);
  }

  const { data: unlinkedPage, isLoading: loadingUnlinked } =
    useGetNoteUnlinkedMentionsQuery(
      { id: noteId, limit: UNLINKED_PAGE_SIZE, offset: 0 },
    );

  const loading = (loadingBacklinks && !backlinkLoaded) || loadingUnlinked;

  const loadMoreBacklinks = useCallback(async () => {
    // Handled by RTK Query — next query will update backlinkPage
    setBacklinkOffset((prev) => prev + BACKLINK_PAGE_SIZE);
    setBacklinkLoaded(false);
  }, []);

  const backlinks = backlinkItems;
  const unlinked = unlinkedPage?.items ?? [];
  const hasMoreBacklinks = backlinkPage?.hasMore ?? false;

  if (loading && backlinks.length === 0 && unlinked.length === 0) {
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
            Linked references
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
          {hasMoreBacklinks && (
            <button
              onClick={loadMoreBacklinks}
              className="text-xs text-blue-500 hover:underline mt-1"
            >
              Load more
            </button>
          )}
        </div>
      )}

      {unlinked.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1.5">
            Unlinked mentions
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
