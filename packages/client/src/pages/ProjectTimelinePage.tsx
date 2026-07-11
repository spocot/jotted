import { useParams, useNavigate } from "react-router-dom";
import { useGetProjectQuery, useGetMilestonesQuery } from "../store/redux/api";
import { IconArrowLeft, IconCalendarEvent, IconFlag } from "@tabler/icons-react";

interface TimelineCard {
  id: string;
  title: string;
  columnTitle: string;
  dueDate: string;
  labels: { name: string; color: string }[];
}

function parseDate(dateStr: string): Date | null {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dayDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ProjectTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project } = useGetProjectQuery(id ?? "", { skip: !id });
  const { data: milestones = [] } = useGetMilestonesQuery(
    { projectId: id ?? "" },
    { skip: !id },
  );

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  // Collect all cards with due dates
  const timelineCards: TimelineCard[] = [];
  for (const group of project.groups) {
    for (const col of group.columns) {
      for (const card of col.cards) {
        if (card.dueDate) {
          timelineCards.push({
            id: card.id,
            title: card.title,
            columnTitle: col.title,
            dueDate: card.dueDate,
            labels: (card.labels ?? []).map((l) => ({
              name: l.name,
              color: l.color,
            })),
          });
        }
      }
    }
  }

  // Sort by due date
  timelineCards.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Compute timeline range — include both cards and milestones
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let minDate: Date;
  let maxDate: Date;

  const allDates: Date[] = [];
  for (const card of timelineCards) {
    const d = parseDate(card.dueDate);
    if (d) allDates.push(d);
  }
  for (const ms of milestones) {
    if (ms.dueDate) {
      const d = parseDate(ms.dueDate);
      if (d) allDates.push(d);
    }
  }

  if (allDates.length > 0) {
    const timestamps = allDates.map((d) => d.getTime());
    minDate = new Date(Math.min(...timestamps));
    maxDate = new Date(Math.max(...timestamps));
    minDate = addDays(minDate, -7);
    maxDate = addDays(maxDate, 7);
  } else {
    minDate = addDays(today, -14);
    maxDate = addDays(today, 30);
  }

  const totalDays = dayDiff(minDate, maxDate) + 1;
  const DAY_WIDTH = 40;
  const chartWidth = totalDays * DAY_WIDTH;

  // Generate week markers
  const weeks: { date: Date; x: number }[] = [];
  let cursor = new Date(minDate);
  while (cursor <= maxDate) {
    if (cursor.getDay() === 1 || cursor.getDate() === 1) {
      weeks.push({
        date: new Date(cursor),
        x: dayDiff(minDate, cursor) * DAY_WIDTH,
      });
    }
    cursor = addDays(cursor, 1);
  }

  // Today line
  const todayOffset = dayDiff(minDate, today);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/project/${id}`)}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <IconArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <IconCalendarEvent className="w-5 h-5 text-blue-500" />
          <h1 className="text-lg font-bold">Timeline — {project.title}</h1>
        </div>
      </div>

      {timelineCards.length === 0 && milestones.length === 0 ? (
        <div className="text-center py-16">
          <IconCalendarEvent className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            No cards with due dates or milestones yet. Add due dates to cards or
            milestones to see them on the timeline.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
          <div style={{ minWidth: chartWidth + 200 }}>
            {/* Header: week/month labels */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              <div className="w-[200px] shrink-0 px-3 py-2 text-xs font-semibold text-gray-500 border-r border-gray-200 dark:border-gray-700">
                Item
              </div>
              <div className="relative flex-1" style={{ height: 32 }}>
                {weeks.map((w, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full flex items-center px-1 text-[10px] text-gray-400 border-l border-gray-100 dark:border-gray-800"
                    style={{ left: w.x }}
                  >
                    {formatDateShort(w.date)}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              {/* Today line */}
              {todayOffset >= 0 && todayOffset <= totalDays && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-400 dark:bg-red-500 z-10"
                  style={{ left: 200 + todayOffset * DAY_WIDTH }}
                >
                  <div className="absolute -top-0 -left-3 px-1 py-0.5 text-[9px] text-white bg-red-500 rounded">
                    Today
                  </div>
                </div>
              )}

              {/* Card rows */}
              {timelineCards.map((card, rowIdx) => {
                const dueDate = parseDate(card.dueDate);
                if (!dueDate) return null;
                const offset = dayDiff(minDate, dueDate);
                const isOverdue = dueDate < today;

                return (
                  <div
                    key={card.id}
                    className={`flex items-center border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 ${
                      rowIdx % 2 === 0
                        ? "bg-white dark:bg-gray-900"
                        : "bg-gray-50/50 dark:bg-gray-900/30"
                    }`}
                    style={{ height: 36 }}
                  >
                    <div className="w-[200px] shrink-0 px-3 py-2 border-r border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {card.title}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {card.columnTitle}
                      </p>
                    </div>
                    <div className="relative flex-1" style={{ height: 36 }}>
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${
                          isOverdue ? "bg-red-500" : "bg-blue-500"
                        }`}
                        style={{
                          left: offset * DAY_WIDTH + DAY_WIDTH / 2 - 6,
                        }}
                        title={`${card.title} — Due ${formatDateShort(dueDate)}`}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Milestone rows */}
              {milestones.length > 0 && timelineCards.length > 0 && (
                <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" style={{ height: 24 }}>
                  <div className="w-[200px] shrink-0 px-3 py-0.5 border-r border-gray-200 dark:border-gray-700 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Milestones
                  </div>
                  <div className="flex-1" />
                </div>
              )}
              {milestones.map((m) => {
                if (!m.dueDate) return null;
                const dueDate = parseDate(m.dueDate);
                if (!dueDate) return null;
                const offset = dayDiff(minDate, dueDate);
                const isOverdue = !m.completed && dueDate < today;

                return (
                  <div
                    key={m.id}
                    className="flex items-center border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                    style={{ height: 36 }}
                  >
                    <div className="w-[200px] shrink-0 px-3 py-2 border-r border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1.5">
                        <IconFlag className="w-3 h-3 text-blue-500 shrink-0" />
                        <span
                          className={`text-xs font-medium truncate ${
                            m.completed
                              ? "line-through text-gray-400"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {m.title}
                        </span>
                      </div>
                    </div>
                    <div className="relative flex-1" style={{ height: 36 }}>
                      {/* Diamond marker */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 ${
                          m.completed
                            ? "bg-green-500"
                            : isOverdue
                              ? "bg-red-500"
                              : "bg-blue-500"
                        }`}
                        style={{
                          left: offset * DAY_WIDTH + DAY_WIDTH / 2 - 6,
                        }}
                        title={`${m.title} — ${
                          m.completed ? "Completed" : "Due"
                        } ${formatDateShort(dueDate)}${
                          isOverdue ? " (Overdue)" : ""
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
