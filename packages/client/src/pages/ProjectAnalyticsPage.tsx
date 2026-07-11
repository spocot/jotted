import { useParams, useNavigate } from "react-router-dom";
import { useGetProjectQuery, useGetMilestonesQuery } from "../store/redux/api";
import { IconArrowLeft, IconChartBar, IconFlag } from "@tabler/icons-react";
import type { ProjectWithDetails, ProjectMilestone } from "../types";

function getCardStats(project: ProjectWithDetails) {
  let total = 0;
  let done = 0;
  let overdue = 0;
  let withDueDate = 0;
  const labelCounts: Record<string, { name: string; color: string; count: number }> = {};
  const columnCounts: Record<string, number> = {};
  const now = new Date();

  for (const group of project.groups) {
    for (const col of group.columns) {
      for (const card of col.cards) {
        total++;
        columnCounts[col.title] = (columnCounts[col.title] ?? 0) + 1;

        if (card.dueDate) {
          withDueDate++;
          if (new Date(card.dueDate) < now) overdue++;
        }

        const cl = card.checklist;
        if (cl && cl.length > 0 && cl.every((c) => c.done)) done++;

        for (const label of card.labels ?? []) {
          if (!labelCounts[label.id]) {
            labelCounts[label.id] = { name: label.name, color: label.color, count: 0 };
          }
          labelCounts[label.id].count++;
        }
      }
    }
  }

  return { total, done, overdue, withDueDate, labelCounts, columnCounts };
}

function BarChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 dark:text-gray-400 w-32 truncate text-right">
            {d.label}
          </span>
          <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{
                width: `${(d.value / max) * 100}%`,
                backgroundColor: d.color,
                minWidth: d.value > 0 ? "4px" : "0",
              }}
            />
          </div>
          <span className="text-xs text-gray-500 w-8 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function getMilestoneStats(milestones: ProjectMilestone[]) {
  const total = milestones.length;
  const completed = milestones.filter((m) => m.completed).length;
  const now = new Date();
  const overdue = milestones.filter(
    (m) => !m.completed && m.dueDate && new Date(m.dueDate) < now,
  ).length;
  const upcoming = milestones.filter(
    (m) =>
      !m.completed &&
      m.dueDate &&
      new Date(m.dueDate) >= now &&
      new Date(m.dueDate) <=
        new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
  ).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, overdue, upcoming, completionRate };
}

export default function ProjectAnalyticsPage() {
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

  const stats = getCardStats(project);
  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const msStats = getMilestoneStats(milestones);

  const labelData = Object.values(stats.labelCounts)
    .sort((a, b) => b.count - a.count)
    .map((l) => ({ label: l.name, value: l.count, color: l.color }));

  const columnData = Object.entries(stats.columnCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({
      label: name,
      value: count,
      color: "#3b82f6",
    }));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/project/${id}`)}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <IconArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <IconChartBar className="w-5 h-5 text-blue-500" />
          <h1 className="text-lg font-bold">Analytics — {project.title}</h1>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.total}
          </p>
          <p className="text-xs text-gray-500 mt-1">Total cards</p>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {completionRate}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Completed ({stats.done}/{stats.total})
          </p>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-2xl font-bold text-red-500 dark:text-red-400">
            {stats.overdue}
          </p>
          <p className="text-xs text-gray-500 mt-1">Overdue</p>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">
            {stats.withDueDate}
          </p>
          <p className="text-xs text-gray-500 mt-1">With due date</p>
        </div>
      </div>

      {/* Completion bar */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Completion Progress
        </h2>
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">
            {stats.done} completed
          </span>
          <span className="text-xs text-gray-400">
            {stats.total - stats.done} remaining
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Cards by column */}
        {columnData.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Cards by Column
            </h2>
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <BarChart data={columnData} />
            </div>
          </div>
        )}

        {/* Cards by label */}
        {labelData.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Cards by Label
            </h2>
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <BarChart data={labelData} />
            </div>
          </div>
        )}
      </div>

      {msStats.total > 0 && (
        <>
          {/* Milestone summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {msStats.total}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total milestones</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {msStats.completionRate}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Completed ({msStats.completed}/{msStats.total})
              </p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <p className="text-2xl font-bold text-red-500 dark:text-red-400">
                {msStats.overdue}
              </p>
              <p className="text-xs text-gray-500 mt-1">Overdue</p>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">
                {msStats.upcoming}
              </p>
              <p className="text-xs text-gray-500 mt-1">Due this week</p>
            </div>
          </div>

          {/* Milestone completion bar */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <IconFlag className="w-4 h-4" />
              Milestone Progress
            </h2>
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${msStats.completionRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">
                {msStats.completed} completed
              </span>
              <span className="text-xs text-gray-400">
                {msStats.total - msStats.completed} remaining
              </span>
            </div>
          </div>
        </>
      )}

      {stats.total === 0 && msStats.total === 0 && (
        <div className="text-center py-12">
          <IconChartBar className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            No cards or milestones to analyze. Add cards to your board or milestones to see analytics.
          </p>
        </div>
      )}
    </div>
  );
}
