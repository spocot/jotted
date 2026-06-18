import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateNoteMutation } from "../store/redux/api";
import type { CalendarDayItem, OutlookEvent } from "../types";

interface CalendarDayPanelProps {
  dateStr: string;
  created: CalendarDayItem[];
  modified: CalendarDayItem[];
  outlookEvents: OutlookEvent[];
  dailyNoteId: string | null;
  onClose: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CalendarDayPanel({
  dateStr,
  created,
  modified,
  outlookEvents,
  dailyNoteId,
  onClose,
}: CalendarDayPanelProps) {
  const navigate = useNavigate();
  const [createNote] = useCreateNoteMutation();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleCreateDailyNote = async () => {
    setCreating(true);
    try {
      const d = new Date(dateStr + "T12:00:00");
      const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "long" });
      const content = `# ${dateStr} (${dayOfWeek})\n\n## Tasks\n\n- [ ]\n\n## Notes\n\n`;
      const note = await createNote({ title: dateStr, content }).unwrap();
      navigate(`/note/${note.id}`);
    } catch {
      setCreating(false);
    }
  };

  const dateDisplay = new Date(dateStr + "T00:00:00").toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between z-10">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {dateDisplay}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {created.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
                Created
              </h4>
              <div className="space-y-1">
                {created.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/note/${item.id}`)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.title || "Untitled"}
                    </div>
                    {item.path && item.path !== "/" && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                        {item.path}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {modified.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
                Modified
              </h4>
              <div className="space-y-1">
                {modified.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/note/${item.id}`)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.title || "Untitled"}
                    </div>
                    {item.path && item.path !== "/" && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                        {item.path}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {outlookEvents.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
                Events
              </h4>
              <div className="space-y-2">
                {outlookEvents.map((event) => (
                  <div
                    key={event.id}
                    className="px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-900/20"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {event.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {event.isAllDay
                        ? "All day"
                        : `${formatTime(event.start)} – ${formatTime(event.end)}`}
                      {event.location && ` · ${event.location}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {created.length === 0 &&
            modified.length === 0 &&
            outlookEvents.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                No activity on this day
              </p>
            )}

          <div className="pt-2">
            {dailyNoteId ? (
              <button
                onClick={() => navigate(`/note/${dailyNoteId}`)}
                className="w-full px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-colors"
              >
                Open daily journal note
              </button>
            ) : (
              <button
                onClick={handleCreateDailyNote}
                disabled={creating}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
              >
                {creating ? "Creating..." : "Create daily note"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
