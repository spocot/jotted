import { useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetProjectQuery,
  useCreateColumnMutation,
  useUpdateColumnMutation,
  useDeleteColumnMutation,
  useCreateCardMutation,
  useUpdateCardMutation,
  useDeleteCardMutation,
  useMoveCardMutation,
  useCreateArtifactMutation,
  useDeleteArtifactMutation,
  useGetLabelsQuery,
  useAddLabelToCardMutation,
  useGetCardTemplatesQuery,
  useGetCardMilestonesQuery,
} from "../store/redux/api";
import {
  IconArrowLeft,
  IconPlus,
  IconLayoutKanban,
  IconFileText,
  IconSearch,
  IconFilter,
  IconX,
  IconTrash,
} from "@tabler/icons-react";
import KanbanColumn from "../components/KanbanColumn";
import CardEditor from "../components/CardEditor";
import ArtifactCard from "../components/ArtifactCard";
import ArtifactPickerModal from "../components/ArtifactPickerModal";
import ArtifactEditModal from "../components/ArtifactEditModal";
import IntegrationLinksPanel from "../components/IntegrationLinksPanel";
import type {
  ProjectCard,
  ProjectColumn,
  ProjectArtifact,
  ProjectLabel,
} from "../types";
import { useConfirm } from "../hooks/useConfirm";

type SortField = "position" | "title" | "dueDate" | "createdAt" | "updatedAt";

function cardMatchesFilter(
  card: ProjectCard & { labels: ProjectLabel[] },
  filter: { search: string; labelIds: string[]; dueDateFrom: string; dueDateTo: string },
): boolean {
  if (filter.search) {
    const q = filter.search.toLowerCase();
    if (
      !card.title.toLowerCase().includes(q) &&
      !card.description.toLowerCase().includes(q)
    )
      return false;
  }
  if (filter.labelIds.length > 0) {
    const cardLabelIds = card.labels.map((l) => l.id);
    if (!filter.labelIds.some((id) => cardLabelIds.includes(id))) return false;
  }
  if (filter.dueDateFrom && card.dueDate) {
    if (card.dueDate < filter.dueDateFrom) return false;
  }
  if (filter.dueDateTo && card.dueDate) {
    if (card.dueDate > filter.dueDateTo) return false;
  }
  if (filter.dueDateFrom && !card.dueDate) return false;
  return true;
}

function sortCards(
  cards: ProjectCard[],
  sortField: SortField,
  ascending: boolean,
): ProjectCard[] {
  const sorted = [...cards].sort((a, b) => {
    let cmp = 0;
    switch (sortField) {
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
      case "dueDate":
        cmp = (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
        break;
      case "createdAt":
        cmp = a.createdAt.localeCompare(b.createdAt);
        break;
      case "updatedAt":
        cmp = a.updatedAt.localeCompare(b.updatedAt);
        break;
      default:
        cmp = a.position - b.position;
    }
    return ascending ? cmp : -cmp;
  });
  return sorted;
}

export default function ProjectGroupPage() {
  const { id, groupId } = useParams<{ id: string; groupId: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const { data: project } = useGetProjectQuery(id ?? "", { skip: !id });
  const [createColumn] = useCreateColumnMutation();
  const [updateColumn] = useUpdateColumnMutation();
  const [deleteColumn] = useDeleteColumnMutation();
  const [createCard] = useCreateCardMutation();
  const [updateCard] = useUpdateCardMutation();
  const [deleteCard] = useDeleteCardMutation();
  const [moveCard] = useMoveCardMutation();
  const [createArtifact] = useCreateArtifactMutation();
  const [deleteArtifact] = useDeleteArtifactMutation();
  const [addLabelToCard] = useAddLabelToCardMutation();

  const { data: labels = [] } = useGetLabelsQuery(
    { projectId: id ?? "" },
    { skip: !id },
  );
  const { data: cardTemplates = [] } = useGetCardTemplatesQuery(
    { projectId: id ?? "" },
    { skip: !id },
  );
  const { data: cardMilestones = [] } = useGetCardMilestonesQuery(
    id ?? "",
    { skip: !id },
  );

  const [activeTab, setActiveTab] = useState<"board" | "artifacts">("board");
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [showNewColumn, setShowNewColumn] = useState(false);
  const [cardEditorOpen, setCardEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ProjectCard | null>(null);
  const [newCardColumnId, setNewCardColumnId] = useState<string | null>(null);
  const [showArtifactPicker, setShowArtifactPicker] = useState(false);
  const [editingArtifact, setEditingArtifact] =
    useState<ProjectArtifact | null>(null);

  // Filter state
  const [filterSearch, setFilterSearch] = useState("");
  const [filterLabelIds, setFilterLabelIds] = useState<string[]>([]);
  const [filterDueDateFrom, setFilterDueDateFrom] = useState("");
  const [filterDueDateTo, setFilterDueDateTo] = useState("");
  const [showFilterBar, setShowFilterBar] = useState(false);

  // Sort state
  const [sortField, setSortField] = useState<SortField>("position");
  const [sortAscending, setSortAscending] = useState(true);

  // Bulk selection state
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkMoveColumnId, setBulkMoveColumnId] = useState("");
  const [bulkLabelId, setBulkLabelId] = useState("");

  // Drag state
  const dragState = useRef<{
    cardId: string;
    fromColumnId: string;
    element: HTMLElement;
  } | null>(null);

  const group = project?.groups?.find((g) => g.id === groupId);

  const filter = useMemo(
    () => ({
      search: filterSearch,
      labelIds: filterLabelIds,
      dueDateFrom: filterDueDateFrom,
      dueDateTo: filterDueDateTo,
    }),
    [filterSearch, filterLabelIds, filterDueDateFrom, filterDueDateTo],
  );

  const isFiltering =
    filter.search ||
    filter.labelIds.length > 0 ||
    filter.dueDateFrom ||
    filter.dueDateTo;

  const handleCardDragStart = useCallback(
    (cardId: string, fromColumnId: string, element: HTMLElement) => {
      dragState.current = { cardId, fromColumnId, element };
    },
    [],
  );

  const handleColumnDrop = useCallback(
    async (cardId: string, targetColumnId: string) => {
      const ds = dragState.current;
      if (!ds || ds.fromColumnId === targetColumnId) return;
      if (!id || !groupId) return;
      try {
        await moveCard({
          projectId: id,
          groupId,
          cardId,
          targetColumnId,
        }).unwrap();
      } catch {
        // Silently fail
      }
      dragState.current = null;
    },
    [id, groupId, moveCard],
  );

  const handleAddCard = useCallback(
    async (data: {
      title: string;
      description: string;
      noteId?: string | null;
      dueDate?: string | null;
    }) => {
      if (!id || !groupId || !newCardColumnId) return;
      await createCard({
        projectId: id,
        groupId,
        columnId: newCardColumnId,
        title: data.title,
        description: data.description,
        noteId: data.noteId ?? undefined,
        dueDate: data.dueDate ?? undefined,
      });
    },
    [id, groupId, newCardColumnId, createCard],
  );

  const handleEditCard = useCallback(
    async (data: {
      title: string;
      description: string;
      noteId?: string | null;
      dueDate?: string | null;
    }) => {
      if (!id || !groupId || !editingCard) return;
      await updateCard({
        projectId: id,
        groupId,
        cardId: editingCard.id,
        ...data,
      });
    },
    [id, groupId, editingCard, updateCard],
  );

  const handleDeleteCard = useCallback(async () => {
    if (!id || !groupId || !editingCard) return;
    const ok = await confirm("Delete this card?");
    if (!ok) return;
    await deleteCard({
      projectId: id,
      groupId,
      cardId: editingCard.id,
    });
    setCardEditorOpen(false);
    setEditingCard(null);
  }, [id, groupId, editingCard, deleteCard, confirm]);

  const handleAddColumn = async () => {
    if (!newColumnTitle.trim() || !id || !groupId) return;
    await createColumn({
      projectId: id,
      groupId,
      title: newColumnTitle.trim(),
    });
    setNewColumnTitle("");
    setShowNewColumn(false);
  };

  const handleRenameColumn = async (columnId: string, title: string) => {
    if (!id || !groupId) return;
    await updateColumn({ projectId: id, groupId, columnId, title });
  };

  const handleDeleteColumnAction = async (columnId: string) => {
    if (!id || !groupId) return;
    const ok = await confirm("Delete this column and all its cards?");
    if (!ok) return;
    await deleteColumn({ projectId: id, groupId, columnId });
  };

  const handleAddArtifact = async (selection: {
    title: string;
    artifactType: string;
    referenceId?: string;
    referenceUrl?: string;
  }) => {
    if (!id) return;
    await createArtifact({
      projectId: id,
      groupId,
      ...selection,
    });
  };

  const handleDeleteArtifact = async (artifactId: string) => {
    if (!id) return;
    const ok = await confirm("Remove this artifact?");
    if (!ok) return;
    await deleteArtifact({ projectId: id, artifactId });
  };

  // Bulk selection
  const toggleCardSelection = (cardId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const selectAllCards = () => {
    if (!group) return;
    const allIds = new Set<string>();
    for (const col of group.columns) {
      for (const card of col.cards) {
        if (cardMatchesFilter(card, filter)) {
          allIds.add(card.id);
        }
      }
    }
    setSelectedCardIds(allIds);
  };

  const clearSelection = () => setSelectedCardIds(new Set());

  const handleBulkMove = async () => {
    if (!id || !groupId || !bulkMoveColumnId) return;
    for (const cardId of selectedCardIds) {
      try {
        await moveCard({
          projectId: id,
          groupId,
          cardId,
          targetColumnId: bulkMoveColumnId,
        }).unwrap();
      } catch {
        // continue
      }
    }
    setSelectedCardIds(new Set());
    setBulkMoveColumnId("");
  };

  const handleBulkDelete = async () => {
    if (!id || !groupId) return;
    const ok = await confirm(
      `Delete ${selectedCardIds.size} card${selectedCardIds.size !== 1 ? "s" : ""}?`,
    );
    if (!ok) return;
    for (const cardId of selectedCardIds) {
      try {
        await deleteCard({
          projectId: id,
          groupId,
          cardId,
        }).unwrap();
      } catch {
        // continue
      }
    }
    setSelectedCardIds(new Set());
  };

  const handleBulkLabel = async () => {
    if (!id || !bulkLabelId) return;
    for (const cardId of selectedCardIds) {
      try {
        await addLabelToCard({
          projectId: id,
          cardId,
          labelId: bulkLabelId,
        }).unwrap();
      } catch {
        // continue
      }
    }
    setSelectedCardIds(new Set());
    setBulkLabelId("");
  };

  const allColumns = group?.columns ?? [];

  if (!group) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-sm text-gray-400">Group not found.</p>
        <button
          onClick={() => navigate(`/project/${id}`)}
          className="text-sm text-blue-500 hover:underline mt-2"
        >
          Back to project
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/project/${id}`)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <IconArrowLeft className="w-4 h-4 text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold">{group.title}</h1>
            {group.description && (
              <p className="text-xs text-gray-500">{group.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedCardIds.size > 0 && (
            <span className="text-xs text-blue-500 font-medium">
              {selectedCardIds.size} selected
            </span>
          )}
          <button
            onClick={() => {
              setShowFilterBar(!showFilterBar);
              if (showFilterBar) {
                setFilterSearch("");
                setFilterLabelIds([]);
                setFilterDueDateFrom("");
                setFilterDueDateTo("");
              }
            }}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              isFiltering
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <IconFilter className="w-3.5 h-3.5" />
            Filter
            {isFiltering && (
              <span className="bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                {[
                  filter.search ? 1 : 0,
                  filter.labelIds.length > 0 ? 1 : 0,
                  filter.dueDateFrom ? 1 : 0,
                  filter.dueDateTo ? 1 : 0,
                ].reduce((a, b) => a + b, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      {showFilterBar && (
        <div className="flex flex-wrap gap-3 mb-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search cards..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {labels.map((label) => (
              <button
                key={label.id}
                onClick={() => {
                  setFilterLabelIds((prev) =>
                    prev.includes(label.id)
                      ? prev.filter((id) => id !== label.id)
                      : [...prev, label.id],
                  );
                }}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full border transition-colors ${
                  filterLabelIds.includes(label.id)
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                {label.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterDueDateFrom}
              onChange={(e) => setFilterDueDateFrom(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={filterDueDateTo}
              onChange={(e) => setFilterDueDateTo(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          {isFiltering && (
            <button
              onClick={() => {
                setFilterSearch("");
                setFilterLabelIds([]);
                setFilterDueDateFrom("");
                setFilterDueDateTo("");
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-600 transition-colors"
            >
              <IconX className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      )}

      {/* Linked Resources */}
      <div className="mb-3 shrink-0">
        <IntegrationLinksPanel entityType="group" entityId={groupId!} />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800 mb-4 shrink-0">
        <button
          onClick={() => setActiveTab("board")}
          className={`flex items-center gap-1.5 pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "board"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <IconLayoutKanban className="w-4 h-4" />
          Board
        </button>
        <button
          onClick={() => setActiveTab("artifacts")}
          className={`flex items-center gap-1.5 pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "artifacts"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <IconFileText className="w-4 h-4" />
          Artifacts
        </button>
      </div>

      {/* Bulk actions bar */}
      {selectedCardIds.size > 0 && activeTab === "board" && (
        <div className="flex items-center gap-3 mb-3 p-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 shrink-0">
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            {selectedCardIds.size} card{selectedCardIds.size !== 1 ? "s" : ""}
          </span>

          <select
            value={bulkMoveColumnId}
            onChange={(e) => setBulkMoveColumnId(e.target.value)}
            className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          >
            <option value="">Move to...</option>
            {allColumns.map((col) => (
              <option key={col.id} value={col.id}>
                {col.title}
              </option>
            ))}
          </select>
          {bulkMoveColumnId && (
            <button
              onClick={handleBulkMove}
              className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              Move
            </button>
          )}

          <select
            value={bulkLabelId}
            onChange={(e) => setBulkLabelId(e.target.value)}
            className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          >
            <option value="">Apply label...</option>
            {labels.map((label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
          </select>
          {bulkLabelId && (
            <button
              onClick={handleBulkLabel}
              className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              Apply
            </button>
          )}

          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
          >
            <IconTrash className="w-3 h-3" />
            Delete
          </button>

          <div className="flex-1" />

          <button
            onClick={() => selectAllCards()}
            className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
          >
            Select all
          </button>
          <button
            onClick={clearSelection}
            className="text-xs text-gray-500 hover:text-gray-600 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Board tab */}
      {activeTab === "board" && (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {group.columns.map((col) => {
            const filteredCards = col.cards.filter((card) =>
              cardMatchesFilter(card, filter),
            );
            const sortedCards = sortCards(filteredCards, sortField, sortAscending);

            return (
              <KanbanColumn
                key={col.id}
                column={col as ProjectColumn}
                cards={sortedCards}
                totalCount={col.cards.length}
                sortField={sortField}
                sortAscending={sortAscending}
                selectedCardIds={selectedCardIds}
                onSortChange={(field, ascending) => {
                  setSortField(field);
                  setSortAscending(ascending);
                }}
                onToggleSelect={toggleCardSelection}
                onAddCard={(columnId) => {
                  setNewCardColumnId(columnId);
                  setEditingCard(null);
                  setCardEditorOpen(true);
                }}
                onEditCard={(card) => {
                  setEditingCard(card);
                  setNewCardColumnId(null);
                  setCardEditorOpen(true);
                }}
                onRenameColumn={handleRenameColumn}
                onDeleteColumn={handleDeleteColumnAction}
                onCardDragStart={handleCardDragStart}
                onCardDrop={handleColumnDrop}
                cardMilestones={cardMilestones}
              />
            );
          })}

          {/* Add column */}
          <div className="flex-shrink-0 w-72">
            {showNewColumn ? (
              <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <input
                  type="text"
                  placeholder="Column title..."
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddColumn();
                    if (e.key === "Escape") setShowNewColumn(false);
                  }}
                  className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleAddColumn}
                    disabled={!newColumnTitle.trim()}
                    className="flex-1 px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 rounded transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowNewColumn(false)}
                    className="px-3 py-1 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewColumn(true)}
                className="w-full p-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-400 hover:text-blue-500 hover:border-blue-400 transition-colors flex items-center justify-center gap-1.5"
              >
                <IconPlus className="w-4 h-4" />
                Add column
              </button>
            )}
          </div>
        </div>
      )}

      {/* Artifacts tab */}
      {activeTab === "artifacts" && (
        <div className="flex-1 overflow-y-auto max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Group Artifacts
            </h2>
            <button
              onClick={() => setShowArtifactPicker(true)}
              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
            >
              <IconPlus className="w-3 h-3" />
              Add artifact
            </button>
          </div>

          {group.artifacts.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">
              No artifacts in this group yet.
            </p>
          ) : (
            <div className="space-y-2">
              {group.artifacts.map((art) => (
                <ArtifactCard
                  key={art.id}
                  artifact={art}
                  onEdit={(a) => setEditingArtifact(a)}
                  onDelete={handleDeleteArtifact}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Card editor modal */}
      {cardEditorOpen && (
        <CardEditor
          card={editingCard ?? undefined}
          projectId={id ?? ""}
          cardTemplates={cardTemplates}
          onSave={editingCard ? handleEditCard : handleAddCard}
          onDelete={editingCard ? handleDeleteCard : undefined}
          onClose={() => {
            setCardEditorOpen(false);
            setEditingCard(null);
            setNewCardColumnId(null);
          }}
        />
      )}

      {/* Artifact picker */}
      <ArtifactPickerModal
        open={showArtifactPicker}
        onClose={() => setShowArtifactPicker(false)}
        onSelect={handleAddArtifact}
      />

      {/* Artifact edit modal */}
      {editingArtifact && id && (
        <ArtifactEditModal
          artifact={editingArtifact}
          projectId={id}
          onClose={() => setEditingArtifact(null)}
        />
      )}
    </div>
  );
}
