import { useState, useEffect, useCallback, useRef } from "react";
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
  const [backlinkHasMore, setBacklinkHasMore] = useState(false);
  const prevNoteId = useRef(noteId);

  const [unlinkedOffset, setUnlinkedOffset] = useState(0);
  const [unlinkedItems, setUnlinkedItems] = useState<Note[]>([]);
  const [unlinkedHasMore, setUnlinkedHasMore] = useState(false);

  useEffect(() => {
    if (prevNoteId.current !== noteId) {
      prevNoteId.current = noteId;
      setBacklinkOffset(0);
      setBacklinkItems([]);
      setBacklinkHasMore(false);
      setUnlinkedOffset(0);
      setUnlinkedItems([]);
      setUnlinkedHasMore(false);
    }
  }, [noteId]);

  const { data: backlinkPage, isLoading: loadingBacklinks } =
    useGetNoteBacklinksQuery(
      { id: noteId, limit: BACKLINK_PAGE_SIZE, offset: backlinkOffset },
    );

  useEffect(() => {
    if (backlinkPage) {
      if (backlinkOffset === 0) {
        setBacklinkItems(backlinkPage.items);
      } else {
        setBacklinkItems((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newItems = backlinkPage.items.filter((n) => !existingIds.has(n.id));
          return [...prev, ...newItems];
        });
      }
      setBacklinkHasMore(backlinkPage.hasMore);
    }
  }, [backlinkPage, backlinkOffset]);

  const { data: unlinkedPage, isLoading: loadingUnlinked } =
    useGetNoteUnlinkedMentionsQuery(
      { id: noteId, limit: UNLINKED_PAGE_SIZE, offset: unlinkedOffset },
    );

  useEffect(() => {
    if (unlinkedPage) {
      if (unlinkedOffset === 0) {
        setUnlinkedItems(unlinkedPage.items);
      } else {
        setUnlinkedItems((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newItems = unlinkedPage.items.filter((n) => !existingIds.has(n.id));
          return [...prev, ...newItems];
        });
      }
      setUnlinkedHasMore(unlinkedPage.hasMore);
    }
  }, [unlinkedPage, unlinkedOffset]);

  const loading = loadingBacklinks || loadingUnlinked;

  const loadMoreBacklinks = useCallback(() => {
    setBacklinkOffset((prev) => prev + BACKLINK_PAGE_SIZE);
  }, []);

  const loadMoreUnlinked = useCallback(() => {
    setUnlinkedOffset((prev) => prev + UNLINKED_PAGE_SIZE);
  }, []);

  const backlinks = backlinkItems;
  const unlinked = unlinkedItems;
  const hasMoreBacklinks = backlinkHasMore;
  const hasMoreUnlinked = unlinkedHasMore;

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
          {hasMoreUnlinked && (
            <button
              onClick={loadMoreUnlinked}
              className="text-xs text-blue-500 hover:underline mt-1"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
