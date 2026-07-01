import { useState, useRef, useCallback } from "react";
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
} from "../store/redux/api";
import {
  IconArrowLeft,
  IconPlus,
  IconLayoutKanban,
  IconFileText,
} from "@tabler/icons-react";
import KanbanColumn from "../components/KanbanColumn";
import CardEditor from "../components/CardEditor";
import ArtifactCard from "../components/ArtifactCard";
import ArtifactPickerModal from "../components/ArtifactPickerModal";
import type { ProjectCard, ProjectColumn } from "../types";
import { useConfirm } from "../hooks/useConfirm";

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

  const [activeTab, setActiveTab] = useState<"board" | "artifacts">("board");
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [showNewColumn, setShowNewColumn] = useState(false);
  const [cardEditorOpen, setCardEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ProjectCard | null>(null);
  const [newCardColumnId, setNewCardColumnId] = useState<string | null>(null);
  const [showArtifactPicker, setShowArtifactPicker] = useState(false);

  // Drag state
  const dragState = useRef<{
    cardId: string;
    fromColumnId: string;
    element: HTMLElement;
  } | null>(null);

  const group = project?.groups?.find((g) => g.id === groupId);

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
        // Silently fail — the API will reject if something's wrong
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
    const ok = await confirm(
      "Delete this column and all its cards?",
    );
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

      {/* Board tab */}
      {activeTab === "board" && (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {group.columns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col as ProjectColumn}
              cards={col.cards}
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
            />
          ))}

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
                  onEdit={() => {}}
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
    </div>
  );
}
