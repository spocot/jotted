import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetCalendarDataQuery,
  useGetOutlookEventsQuery,
  useConfigureOutlookIcsUrlMutation,
  useClearOutlookConfigMutation,
  useGetOutlookStatusQuery,
} from "../store/redux/api";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import type { OutlookResponse, CalendarDayItem } from "../types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isToday(year: number, month: number, day: number): boolean {
  const now = new Date();
  return (
    now.getFullYear() === year &&
    now.getMonth() + 1 === month &&
    now.getDate() === day
  );
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [viewMode, setViewMode] = useState<"all" | "created" | "modified">("all");
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [icsUrl, setIcsUrl] = useState("");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { data: calData, isLoading: loading } = useGetCalendarDataQuery(
    { year, month },
  );
  const outlookStart = formatDate(year, month, 1);
  const outlookEnd = formatDate(year, month, daysInMonth(year, month));
  const { data: outlook } = useGetOutlookEventsQuery(
    { start: outlookStart, end: outlookEnd },
  );
  const { data: outlookStatus } = useGetOutlookStatusQuery();
  const [saveIcsUrl] = useConfigureOutlookIcsUrlMutation();
  const [removeConfig] = useClearOutlookConfigMutation();

  // Load current ICS URL into settings when opened
  useEffect(() => {
    if (showSettings && outlookStatus?.icsUrl) {
      setIcsUrl(outlookStatus.icsUrl);
    }
  }, [showSettings, outlookStatus]);

  const prevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const goToToday = () => {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth() + 1);
  };

  const openNote = (id: string) => {
    navigate(`/note/${id}`);
  };

  const openDailyNote = (dateStr: string) => {
    navigate(`/note/by-date/${dateStr}`);
  };

  const handleConfigureIcsUrl = async () => {
    if (!icsUrl.trim()) {
      dispatch(addToast("Enter a valid ICS URL", "error"));
      return;
    }
    try {
      await saveIcsUrl(icsUrl.trim()).unwrap();
      dispatch(addToast("ICS calendar link configured", "success"));
      setShowSettings(false);
    } catch {
      dispatch(addToast("Failed to configure ICS URL", "error"));
    }
  };

  const handleClearConfig = async () => {
    try {
      await removeConfig().unwrap();
      dispatch(addToast("Calendar config cleared", "info"));
    } catch {
      dispatch(addToast("Failed to clear config", "error"));
    }
  };

  const dayMap = new Map<string, { created: CalendarDayItem[]; modified: CalendarDayItem[] }>();
  if (calData) {
    for (const day of calData.days) {
      if (day.created.length > 0 || day.modified.length > 0) {
        dayMap.set(day.date, { created: day.created, modified: day.modified });
      }
    }
  }

  const outlookEvents = outlook?.events ?? [];
  const outlookMap = new Map<string, OutlookResponse["events"]>();
  for (const event of outlookEvents) {
    const day = event.start.slice(0, 10);
    const existing = outlookMap.get(day) ?? [];
    existing.push(event);
    outlookMap.set(day, existing);
  }

  const numDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  const cells: Array<{ day: number; dateStr: string } | null> = [];

  for (let i = 0; i < startDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= numDays; d++) {
    cells.push({ day: d, dateStr: formatDate(year, month, d) });
  }

  const hasNotesToday = (dateStr: string): boolean => {
    const entry = dayMap.get(dateStr);
    if (!entry) return false;
    if (viewMode === "created") return entry.created.length > 0;
    if (viewMode === "modified") return entry.modified.length > 0;
    return entry.created.length > 0 || entry.modified.length > 0;
  };

  const hasOutlookToday = (dateStr: string): boolean => {
    const events = outlookMap.get(dateStr);
    return events !== undefined && events.length > 0;
  };

  const hoveredEntry = hoveredDay ? dayMap.get(hoveredDay) : null;
  const hoveredOutlook = hoveredDay ? outlookMap.get(hoveredDay) : null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
          {outlook?.available && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ICS
            </span>
          )}
          <button
            onClick={goToToday}
            className="text-sm px-3 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="text-sm px-3 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Calendar settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-semibold">
          {new Date(year, month - 1).toLocaleString("default", { month: "long", year: "numeric" })}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* View mode toggles */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <span className="text-gray-500 dark:text-gray-400">Show:</span>
        {(["all", "created", "modified"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1 rounded-full transition-colors capitalize ${
              viewMode === mode
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="relative">
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="bg-gray-50 dark:bg-gray-900 px-2 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >
              {name}
            </div>
          ))}

          {cells.map((cell, i) => {
            if (!cell) {
              return (
                <div
                  key={`empty-${i}`}
                  className="bg-white dark:bg-gray-950 min-h-[100px]"
                />
              );
            }

            const hasNotes = hasNotesToday(cell.dateStr);
            const hasOutlook = hasOutlookToday(cell.dateStr);
            const today = isToday(year, month, cell.day);

            return (
              <div
                key={cell.dateStr}
                className={`bg-white dark:bg-gray-950 min-h-[100px] p-1.5 relative group cursor-pointer transition-colors ${
                  today ? "ring-2 ring-inset ring-blue-400 dark:ring-blue-500" : ""
                } hover:bg-blue-50 dark:hover:bg-blue-900/10`}
                onMouseEnter={() => setHoveredDay(cell.dateStr)}
                onMouseLeave={() => setHoveredDay(null)}
                onClick={() => openDailyNote(cell.dateStr)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openDailyNote(cell.dateStr);
                  }
                }}
              >
                <span
                  className={`text-xs font-medium ${
                    today
                      ? "bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {cell.day}
                </span>

                <div className="mt-1 flex flex-col gap-0.5">
                  {hasNotes && (
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        viewMode === "created"
                          ? "bg-green-500"
                          : viewMode === "modified"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                      title={`Notes ${
                        viewMode === "created"
                          ? "created"
                          : viewMode === "modified"
                          ? "modified"
                          : "activity"
                      }`}
                    />
                  )}
                  {hasOutlook && (
                    <span
                      className="inline-block w-2 h-2 rounded-full bg-purple-500"
                      title="Outlook events"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hover tooltip */}
        {hoveredDay && (hoveredEntry || (hoveredOutlook && hoveredOutlook.length > 0)) && (
          <div className="absolute left-0 right-0 mt-2 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 max-h-60 overflow-y-auto">
            {hoveredEntry && hoveredEntry.created.length > 0 && (
              <div className="mb-2">
                <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">
                  Created
                </h4>
                <div className="flex flex-wrap gap-1">
                  {hoveredEntry.created.map((item) => (
                    <button
                      key={item.id}
                      onClick={(e) => { e.stopPropagation(); openNote(item.id); }}
                      className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors truncate max-w-[200px]"
                      title={item.title || "Untitled"}
                    >
                      {item.title || "Untitled"}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {hoveredEntry && hoveredEntry.modified.length > 0 && (
              <div className="mb-2">
                <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
                  Modified
                </h4>
                <div className="flex flex-wrap gap-1">
                  {hoveredEntry.modified.map((item) => (
                    <button
                      key={item.id}
                      onClick={(e) => { e.stopPropagation(); openNote(item.id); }}
                      className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/40 transition-colors truncate max-w-[200px]"
                      title={item.title || "Untitled"}
                    >
                      {item.title || "Untitled"}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {hoveredOutlook && hoveredOutlook.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">
                  Outlook Events
                </h4>
                <div className="flex flex-wrap gap-1">
                  {hoveredOutlook.map((event) => (
                    <span
                      key={event.id}
                      className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 truncate max-w-[200px]"
                      title={event.title}
                    >
                      {event.title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outlook status / connect prompt */}
      {outlook && !outlook.available && (
        <div className="mt-6 flex flex-col items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {outlook.message ?? "Calendar integration not available"}
          </p>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Configure ICS Link
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-4 text-sm text-gray-400 dark:text-gray-500 text-center">
          Loading calendar data...
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Calendar Settings</h3>

            <div className="space-y-4">
              {/* Current connection info */}
              {outlook?.available && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    Connected via Outlook Web ICS link
                  </p>
                  <button
                    onClick={handleClearConfig}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* ICS URL config */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Outlook Web Calendar ICS Link
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  In Outlook Web, go to Calendar → Share → Publish Calendar,
                  then copy the ICS link here. The calendar is fetched
                  read-only on each navigation.
                </p>
                <input
                  type="text"
                  value={icsUrl}
                  onChange={(e) => setIcsUrl(e.target.value)}
                  placeholder="https://outlook.live.com/owa/calendar/.../calendar.ics"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                />
                <button
                  onClick={handleConfigureIcsUrl}
                  className="mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  Save ICS Link
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="mt-4 w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
