import { useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetProjectQuery,
  useGetMilestonesQuery,
  useCreateMilestoneMutation,
  useUpdateMilestoneMutation,
  useDeleteMilestoneMutation,
  useToggleMilestoneMutation,
  useGetCardMilestonesQuery,
} from "../store/redux/api";
import {
  IconArrowLeft,
  IconFlag,
  IconPlus,
  IconPencil,
  IconTrash,
  IconCalendarDue,
  IconChevronDown,
  IconLayoutKanban,
  IconList,
  IconGripVertical,
} from "@tabler/icons-react";
import type { ProjectMilestone, ProjectCard } from "../types";
import { useConfirm } from "../hooks/useConfirm";
import IntegrationLinksPanel from "../components/IntegrationLinksPanel";

type FilterTab = "all" | "pending" | "completed";
type SortField = "position" | "dueDate" | "title";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(m: ProjectMilestone): boolean {
  return !m.completed && !!m.dueDate && new Date(m.dueDate) < new Date();
}

export default function ProjectMilestonesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const { data: project } = useGetProjectQuery(id ?? "", { skip: !id });
  const { data: milestones = [] } = useGetMilestonesQuery(
    { projectId: id ?? "" },
    { skip: !id },
  );
  const [createMilestone] = useCreateMilestoneMutation();
  const [updateMilestone] = useUpdateMilestoneMutation();
  const [deleteMilestone] = useDeleteMilestoneMutation();
  const [toggleMilestone] = useToggleMilestoneMutation();
  const { data: cardMilestones = [] } = useGetCardMilestonesQuery(
    id ?? "",
    { skip: !id },
  );

  const [activeTab, setActiveTab] = useState<"list" | "board">("list");

  const [filter, setFilter] = useState<FilterTab>("all");
  const [sort, setSort] = useState<SortField>("position");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const dragItemRef = useRef<string | null>(null);
  const dragOverRef = useRef<string | null>(null);

  const handleCreate = async () => {
    if (!newTitle.trim() || !id) return;
    await createMilestone({
      projectId: id,
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      dueDate: newDueDate || undefined,
    });
    setNewTitle("");
    setNewDescription("");
    setNewDueDate("");
    setShowNewForm(false);
  };

  const handleToggle = async (milestoneId: string, completed: boolean) => {
    if (!id) return;
    await toggleMilestone({ projectId: id, milestoneId, completed });
  };

  const handleUpdate = async () => {
    if (!editingId || !editTitle.trim() || !id) return;
    await updateMilestone({
      projectId: id,
      milestoneId: editingId,
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      dueDate: editDueDate || null,
    });
    setEditingId(null);
  };

  const handleDelete = async (milestoneId: string) => {
    if (!(await confirm("Delete this milestone?"))) return;
    if (!id) return;
    await deleteMilestone({ projectId: id, milestoneId });
  };

  const handleDragStart = useCallback((milestoneId: string) => {
    dragItemRef.current = milestoneId;
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, milestoneId: string) => {
      e.preventDefault();
      dragOverRef.current = milestoneId;
    },
    [],
  );

  const handleDrop = useCallback(
    async (milestoneId: string) => {
      const dragged = dragItemRef.current;
      dragItemRef.current = null;
      dragOverRef.current = null;
      if (!dragged || dragged === milestoneId || !id) return;

      const items = [...milestones];
      const fromIdx = items.findIndex((m) => m.id === dragged);
      const toIdx = items.findIndex((m) => m.id === milestoneId);
      if (fromIdx === -1 || toIdx === -1) return;

      const reordered = [...items];
      reordered.splice(toIdx, 0, reordered.splice(fromIdx, 1)[0]);

      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].position !== i) {
          await updateMilestone({
            projectId: id,
            milestoneId: reordered[i].id,
            position: i,
          });
        }
      }
    },
    [milestones, id, updateMilestone],
  );

  const filtered = milestones
    .filter((m) => {
      if (filter === "completed") return m.completed;
      if (filter === "pending") return !m.completed;
      return true;
    })
    .sort((a, b) => {
      if (sort === "dueDate") {
        if (!a.dueDate && !b.dueDate) return a.position - b.position;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sort === "title") {
        return a.title.localeCompare(b.title);
      }
      return a.position - b.position;
    });

  const completed = milestones.filter((m) => m.completed).length;
  const pending = milestones.length - completed;
  const completionRate =
    milestones.length > 0
      ? Math.round((completed / milestones.length) * 100)
      : 0;

  // Board data: milestone columns with their linked cards
  const boardData = useMemo(() => {
    const allCards: ProjectCard[] = [];
    for (const g of project?.groups ?? []) {
      for (const c of g.columns) {
        allCards.push(...c.cards);
      }
    }
    const cardMap = new Map<string, ProjectCard>();
    for (const c of allCards) {
      cardMap.set(c.id, c);
    }

    const milestoneCards = new Map<string, ProjectCard[]>();
    const assignedCardIds = new Set<string>();
    for (const link of cardMilestones) {
      const card = cardMap.get(link.cardId);
      if (!card) continue;
      assignedCardIds.add(link.cardId);
      const existing = milestoneCards.get(link.milestoneId);
      if (existing) {
        existing.push(card);
      } else {
        milestoneCards.set(link.milestoneId, [card]);
      }
    }

    const unassignedCards = allCards.filter((c) => !assignedCardIds.has(c.id));

    return { milestoneCards, unassignedCards };
  }, [project, cardMilestones]);

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/project/${id}`)}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
        >
          <IconArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <IconFlag className="w-5 h-5 text-blue-500" />
          <h1 className="text-lg font-bold">Milestones — {project.title}</h1>
        </div>
      </div>

      {/* Progress bar */}
      {milestones.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {completed} of {milestones.length} completed
            </span>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {completionRate}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2">
            <span className="text-xs text-gray-500">
              <span className="font-medium text-green-600">{completed}</span>{" "}
              done
            </span>
            <span className="text-xs text-gray-500">
              <span className="font-medium text-gray-600">{pending}</span>{" "}
              pending
            </span>
          </div>
        </div>
      )}

      {/* Linked Resources */}
      <div className="mb-4">
        <IntegrationLinksPanel entityType="project" entityId={id!} />
      </div>

      {/* Tab bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "list"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <IconList className="w-3.5 h-3.5" />
            List
          </button>
          <button
            onClick={() => setActiveTab("board")}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "board"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <IconLayoutKanban className="w-3.5 h-3.5" />
            Board
          </button>
        </div>
        <button
          onClick={() => {
            setShowNewForm(true);
            setEditingId(null);
          }}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <IconPlus className="w-4 h-4" />
          Add milestone
        </button>
      </div>

      {/* Board view */}
      {activeTab === "board" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Unassigned column */}
          <div className="shrink-0 w-64 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Unassigned
              <span className="ml-1 text-gray-400 font-normal normal-case">
                ({boardData.unassignedCards.length})
              </span>
            </h3>
            <div className="space-y-2">
              {boardData.unassignedCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => {
                    const g = project?.groups.find((g2) =>
                      g2.columns.some((c2) => c2.id === card.columnId),
                    );
                    if (g) navigate(`/project/${id}/group/${g.id}`);
                  }}
                  className="p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer hover:shadow-sm transition-shadow text-sm text-gray-900 dark:text-gray-100 truncate"
                  title={card.title}
                >
                  {card.title}
                </div>
              ))}
              {boardData.unassignedCards.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">
                  No unassigned cards
                </p>
              )}
            </div>
          </div>

          {/* Milestone columns */}
          {milestones.map((ms) => {
            const cards = boardData.milestoneCards.get(ms.id) ?? [];
            return (
              <div
                key={ms.id}
                className={`shrink-0 w-64 rounded-xl p-3 border ${
                  ms.completed
                    ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10"
                    : isOverdue(ms)
                      ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"
                      : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <label className="shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ms.completed}
                      onChange={() =>
                        toggleMilestone({
                          projectId: id!,
                          milestoneId: ms.id,
                          completed: !ms.completed,
                        })
                      }
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`text-xs font-semibold truncate ${
                        ms.completed
                          ? "line-through text-gray-400"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                      title={ms.title}
                    >
                      {ms.title}
                    </h3>
                    {ms.dueDate && (
                      <span
                        className={`text-[10px] ${
                          ms.completed
                            ? "text-green-500"
                            : isOverdue(ms)
                              ? "text-red-500"
                              : "text-gray-400"
                        }`}
                      >
                        {isOverdue(ms) ? "Overdue — " : ""}
                        {formatDate(ms.dueDate)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {cards.length}
                  </span>
                </div>

                {/* Mini progress bar */}
                {cards.length > 0 && (
                  <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-2 overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{
                        width: `${
                          ms.completed
                            ? 100
                            : Math.round(
                                (cards.filter((c) =>
                                  (c.checklist ?? []).every((i) => i.done),
                                ).length /
                                  cards.length) *
                                  100,
                              )
                        }%`,
                      }}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  {cards.map((card) => {
                    const checklist = card.checklist ?? [];
                    const doneCount = checklist.filter((i) => i.done).length;
                    const totalCount = checklist.length;
                    return (
                      <div
                        key={card.id}
                        onClick={() => {
                          const g = project?.groups.find((g2) =>
                            g2.columns.some((c2) => c2.id === card.columnId),
                          );
                          if (g)
                            navigate(`/project/${id}/group/${g.id}`);
                        }}
                        className="p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer hover:shadow-sm transition-shadow group"
                      >
                        <div className="flex items-center gap-1.5">
                          <IconGripVertical className="w-3 h-3 text-gray-400 shrink-0 opacity-0 group-hover:opacity-100" />
                          <span className="text-xs text-gray-900 dark:text-gray-100 truncate flex-1">
                            {card.title}
                          </span>
                        </div>
                        {card.labels && card.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 ml-4.5">
                            {card.labels.slice(0, 3).map((l) => (
                              <span
                                key={l.id}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: l.color }}
                              />
                            ))}
                          </div>
                        )}
                        {totalCount > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                            <span>
                              {doneCount}/{totalCount} done
                            </span>
                            <div className="h-1 w-12 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{
                                  width: `${Math.round(
                                    (doneCount / totalCount) * 100,
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {cards.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">
                      No cards linked
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {milestones.length === 0 && (
            <div className="shrink-0 w-64 text-center py-12">
              <IconFlag className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-400">No milestones yet</p>
            </div>
          )}
        </div>
      ) : (
        <>
      {/* Filters + Add */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {(["all", "pending", "completed"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filter === tab
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === "pending" && pending > 0 && (
                  <span className="ml-1 text-[10px]">({pending})</span>
                )}
                {tab === "completed" && completed > 0 && (
                  <span className="ml-1 text-[10px]">({completed})</span>
                )}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => {
                const next: SortField =
                  sort === "position"
                    ? "dueDate"
                    : sort === "dueDate"
                      ? "title"
                      : "position";
                setSort(next);
              }}
            >
              Sort: {sort === "position" ? "order" : sort === "dueDate" ? "due date" : "title"}
              <IconChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* New milestone form */}
      {showNewForm && (
        <div className="mb-4 p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Milestone name..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTitle.trim()) handleCreate();
                if (e.key === "Escape") setShowNewForm(false);
              }}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <input
              type="text"
              placeholder="Description (optional)..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3">
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 rounded-lg transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <IconFlag className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            {milestones.length === 0
              ? "No milestones yet. Milestones help track key deadlines and deliverables."
              : filter === "completed"
                ? "No completed milestones yet."
                : filter === "pending"
                  ? "All milestones are completed."
                  : "No milestones found."}
          </p>
          {milestones.length === 0 && (
            <button
              onClick={() => setShowNewForm(true)}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Create your first milestone
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((milestone) => (
            <div
              key={milestone.id}
              draggable
              onDragStart={() => handleDragStart(milestone.id)}
              onDragOver={(e) => handleDragOver(e, milestone.id)}
              onDrop={() => handleDrop(milestone.id)}
              className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 group cursor-default transition-colors"
            >
              {editingId === milestone.id ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 text-sm bg-transparent border-b border-blue-500 outline-none text-gray-900 dark:text-gray-100"
                      autoFocus
                    />
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    />
                    <button
                      onClick={handleUpdate}
                      className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Description..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <label className="shrink-0 mt-0.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={milestone.completed}
                      onChange={() =>
                        handleToggle(milestone.id, !milestone.completed)
                      }
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-medium ${
                          milestone.completed
                            ? "line-through text-gray-400 dark:text-gray-500"
                            : "text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        {milestone.title}
                      </span>
                      {milestone.dueDate && (
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded ${
                            milestone.completed
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : isOverdue(milestone)
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                        >
                          <IconCalendarDue className="w-3 h-3" />
                          {formatDate(milestone.dueDate)}
                        </span>
                      )}
                      {isOverdue(milestone) && (
                        <span className="text-[10px] text-red-500 font-medium">
                          Overdue
                        </span>
                      )}
                      {milestone.completed && milestone.completedAt && (
                        <span className="text-[10px] text-green-500">
                          Completed{" "}
                          {formatDate(milestone.completedAt)}
                        </span>
                      )}
                    </div>
                    {milestone.description && (
                      <div className="mt-1">
                        <div
                          className={`text-xs text-gray-500 dark:text-gray-400 ${
                            expandedId !== milestone.id &&
                            milestone.description.length > 80
                              ? "line-clamp-1"
                              : ""
                          }`}
                        >
                          {milestone.description}
                        </div>
                        {milestone.description.length > 80 && (
                          <button
                            onClick={() =>
                              setExpandedId(
                                expandedId === milestone.id
                                  ? null
                                  : milestone.id,
                              )
                            }
                            className="text-[10px] text-blue-500 hover:text-blue-600 mt-0.5"
                          >
                            {expandedId === milestone.id
                              ? "Show less"
                              : "Show more"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(milestone.id);
                        setEditTitle(milestone.title);
                        setEditDescription(milestone.description);
                        setEditDueDate(milestone.dueDate ?? "");
                        setShowNewForm(false);
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <IconPencil className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(milestone.id)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <IconTrash className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
}
