import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetDailyNotesQuery, useGetDailyStreakQuery } from "../store/redux/api";
import type { Note } from "../types";
import NoteContentPreview from "../components/NoteContentPreview";

const PAGE_SIZE = 50;

function getDayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function groupByMonth(notes: Note[]): Array<{ label: string; notes: Note[] }> {
  const groups = new Map<string, Note[]>();
  for (const note of notes) {
    const key = note.title.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(note);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => {
      const d = new Date(key + "-01T12:00:00");
      const label = d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      return { label, notes: items };
    });
}

export default function DailyJournalPage() {
  const [offset, setOffset] = useState(0);
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetDailyNotesQuery({
    limit: PAGE_SIZE,
    offset,
  });
  const { data: streakData } = useGetDailyStreakQuery();

  const notes = data?.items ?? [];
  const hasMore = data?.hasMore ?? false;
  const total = data?.total ?? 0;
  const streak = streakData?.streak ?? 0;

  const handleLoadMore = () => {
    setOffset((prev) => prev + PAGE_SIZE);
  };

  const handleOpenNote = (id: string) => {
    navigate(`/note/${id}`);
  };

  const fireEmoji = streak >= 7 ? "🔥" : streak >= 3 ? "✨" : "";

  if (isLoading && notes.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-red-500 dark:text-red-400">
          Failed to load journal. Please try again.
        </p>
      </div>
    );
  }

  const groups = groupByMonth(notes);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Journal</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total} {total === 1 ? "daily note" : "daily notes"}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2">
          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {fireEmoji} {streak} day{streak !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No daily notes yet.
          </p>
          <button
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10);
              navigate(`/note/by-date/${today}`);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Create Today's Note
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 sticky top-0 bg-white dark:bg-gray-950 py-2 z-10">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleOpenNote(note.id)}
                    className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {note.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {getDayOfWeek(note.title)}
                        </p>
                        {note.content && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2">
                            <NoteContentPreview content={note.content} />
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mt-0.5">
                        {note.updatedAt.slice(0, 10)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="text-center py-8">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
