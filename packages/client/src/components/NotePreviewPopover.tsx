import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLazyGetNoteByTitleQuery } from "../store/redux/api";
import type { Note } from "../types";

const POPOVER_DELAY = 400;

export default function NotePreviewPopover() {
  const [note, setNote] = useState<Note | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const currentTitleRef = useRef<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [getNoteByTitle] = useLazyGetNoteByTitleQuery();

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-wikilink]");
      if (!target) {
        clearTimer();
        setVisible(false);
        return;
      }

      const title = target.getAttribute("data-title") ?? "";
      if (!title) return;

      currentTitleRef.current = title;
      setPos({ x: e.clientX, y: e.clientY });

      clearTimer();
      timerRef.current = setTimeout(async () => {
        if (currentTitleRef.current !== title) return;
        try {
          const data = await getNoteByTitle(title).unwrap();
          if (currentTitleRef.current === title && data) {
            setNote(data);
            setVisible(true);
          }
        } catch {
          // Note not found, ignore
        }
      }, POPOVER_DELAY);
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-wikilink]");
      const popover = popoverRef.current;
      if (!target && !popover?.contains(e.relatedTarget as Node)) {
        clearTimer();
        setVisible(false);
      }
    };

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      clearTimer();
    };
  }, []);

  // Hide popover when clicking away
  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setVisible(false);
      }
    };
    setTimeout(() => document.addEventListener("click", handler), 0);
    return () => document.removeEventListener("click", handler);
  }, [visible]);

  if (!visible || !note) return null;

  const snippet = note.content
    ? note.content.length > 200
      ? note.content.slice(0, 200) + "..."
      : note.content
    : "No content";

  return (
    <div
      ref={popoverRef}
      className="fixed z-[150] w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3"
      style={{
        left: Math.min(pos.x, window.innerWidth - 300),
        top: Math.min(pos.y + 12, window.innerHeight - 200),
      }}
    >
      <button
        onClick={() => {
          navigate(`/note/${note.id}`);
          setVisible(false);
        }}
        className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-1 text-left"
      >
        {note.title || "Untitled"}
      </button>
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-4">
        {snippet}
      </p>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
        {new Date(note.updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
}
