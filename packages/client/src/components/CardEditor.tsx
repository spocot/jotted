import { useState, useEffect } from "react";
import type {
  ProjectCard,
  ProjectChecklistItem,
  ProjectCardTemplate,
} from "../types";
import {
  IconX,
  IconCalendarDue,
  IconLink,
  IconCheck,
  IconPlus,
  IconFlag,
} from "@tabler/icons-react";
import {
  useLazySearchNotesQuery,
  useGetLabelsQuery,
  useAddLabelToCardMutation,
  useRemoveLabelFromCardMutation,
  useAddChecklistItemMutation,
  useUpdateChecklistItemMutation,
  useDeleteChecklistItemMutation,
  useGetCommentsQuery,
  useAddCommentMutation,
  useDeleteCommentMutation,
  useGetMilestonesQuery,
  useGetCardMilestonesQuery,
  useLinkCardsToMilestoneMutation,
  useUnlinkCardFromMilestoneMutation,
} from "../store/redux/api";

interface CardEditorProps {
  card?: ProjectCard;
  projectId: string;
  cardTemplates?: ProjectCardTemplate[];
  onSave: (data: {
    title: string;
    description: string;
    noteId?: string | null;
    dueDate?: string | null;
  }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function CardEditor({
  card,
  projectId,
  cardTemplates,
  onSave,
  onDelete,
  onClose,
}: CardEditorProps) {
  const [title, setTitle] = useState(card?.title ?? "");
  const [description, setDescription] = useState(card?.description ?? "");
  const [dueDate, setDueDate] = useState(card?.dueDate ?? "");
  const [noteId, setNoteId] = useState<string | null>(card?.noteId ?? null);
  const [noteTitle, setNoteTitle] = useState("");
  const [showNoteSearch, setShowNoteSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchNotes] = useLazySearchNotesQuery();
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; title: string }>
  >([]);

  useEffect(() => {
    if (card?.noteId) {
      setNoteId(card.noteId);
    }
  }, [card?.noteId]);

  // Labels
  const { data: projectLabels = [] } = useGetLabelsQuery(
    { projectId },
    { skip: !projectId }
  );
  const [addLabelToCard] = useAddLabelToCardMutation();
  const [removeLabelFromCard] = useRemoveLabelFromCardMutation();

  // Checklists
  const [newChecklistText, setNewChecklistText] = useState("");
  const [addChecklistItem] = useAddChecklistItemMutation();
  const [updateChecklistItem] = useUpdateChecklistItemMutation();
  const [deleteChecklistItem] = useDeleteChecklistItemMutation();

  // Comments
  const { data: comments = [] } = useGetCommentsQuery(
    { projectId, cardId: card?.id ?? "" },
    { skip: !projectId || !card?.id }
  );
  const [newComment, setNewComment] = useState("");
  const [addComment] = useAddCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();

  // Milestones
  const { data: milestones = [] } = useGetMilestonesQuery(
    { projectId },
    { skip: !projectId },
  );
  const { data: cardMilestoneLinks = [] } = useGetCardMilestonesQuery(
    projectId,
    { skip: !projectId },
  );
  const [linkCardsToMilestone] = useLinkCardsToMilestoneMutation();
  const [unlinkCardFromMilestone] = useUnlinkCardFromMilestoneMutation();

  const linkedMilestoneIds = new Set(
    card
      ? cardMilestoneLinks
          .filter((l) => l.cardId === card.id)
          .map((l) => l.milestoneId)
      : [],
  );

  const handleToggleMilestone = async (milestoneId: string) => {
    if (!card) return;
    if (linkedMilestoneIds.has(milestoneId)) {
      await unlinkCardFromMilestone({ projectId, milestoneId, cardId: card.id });
    } else {
      await linkCardsToMilestone({ projectId, milestoneId, cardIds: [card.id] });
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const result = await searchNotes({ q: searchQuery, limit: 10 }).unwrap();
    setSearchResults(result.items);
  };

  const handleSelectNote = (note: { id: string; title: string }) => {
    setNoteId(note.id);
    setNoteTitle(note.title);
    setShowNoteSearch(false);
    setSearchQuery("");
  };

  const handleRemoveNote = () => {
    setNoteId(null);
    setNoteTitle("");
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description,
      noteId,
      dueDate: dueDate || null,
    });
    onClose();
  };

  const handleToggleLabel = async (labelId: string) => {
    if (!card) return;
    const hasLabel = card.labels?.some((l) => l.id === labelId);
    if (hasLabel) {
      await removeLabelFromCard({ projectId, cardId: card.id, labelId });
    } else {
      await addLabelToCard({ projectId, cardId: card.id, labelId });
    }
  };

  const handleAddChecklistItem = async () => {
    if (!card || !newChecklistText.trim()) return;
    await addChecklistItem({ projectId, cardId: card.id, text: newChecklistText.trim() });
    setNewChecklistText("");
  };

  const handleToggleChecklistItem = async (item: ProjectChecklistItem) => {
    await updateChecklistItem({
      projectId,
      cardId: item.cardId,
      itemId: item.id,
      done: !item.done,
    });
  };

  const handleDeleteChecklistItem = async (item: ProjectChecklistItem) => {
    await deleteChecklistItem({ projectId, cardId: item.cardId, itemId: item.id });
  };

  const handleAddComment = async () => {
    if (!card || !newComment.trim()) return;
    await addComment({ projectId, cardId: card.id, body: newComment.trim() });
    setNewComment("");
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!card) return;
    await deleteComment({ projectId, cardId: card.id, commentId });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold">
            {card ? "Edit Card" : "New Card"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <input
            type="text"
            placeholder="Card title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />

          {/* Template picker (only for new cards) */}
          {!card && cardTemplates && cardTemplates.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-gray-400 self-center mr-1">Templates:</span>
              {cardTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    setTitle(tpl.title);
                    setDescription(tpl.description);
                  }}
                  className="px-2 py-0.5 text-xs rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  {tpl.title}
                </button>
              ))}
            </div>
          )}

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          {/* Due Date */}
          <div className="flex items-center gap-2">
            <IconCalendarDue className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Linked Note */}
          <div>
            {noteId ? (
              <div className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <IconLink className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="flex-1 truncate text-blue-700 dark:text-blue-300">
                  {noteTitle || "Linked note"}
                </span>
                <button
                  onClick={handleRemoveNote}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <IconX className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNoteSearch(!showNoteSearch)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full text-gray-500"
              >
                <IconLink className="w-3.5 h-3.5" />
                Link to note...
              </button>
            )}
            {showNoteSearch && (
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    className="flex-1 px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSearch}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                  >
                    Search
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
                    {searchResults.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => handleSelectNote(note)}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        {note.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Labels */}
          {projectId && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Labels</label>
              <div className="flex flex-wrap gap-1.5">
                {projectLabels.map((label) => {
                  const isActive = card?.labels?.some((l) => l.id === label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => handleToggleLabel(label.id)}
                      className={`px-2 py-0.5 text-xs font-medium rounded-full border transition-colors ${
                        isActive
                          ? "text-white border-transparent"
                          : "text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-gray-400"
                      }`}
                      style={isActive ? { backgroundColor: label.color } : undefined}
                    >
                      {label.name}
                    </button>
                  );
                })}
                {projectLabels.length === 0 && (
                  <span className="text-xs text-gray-400">No labels yet</span>
                )}
              </div>
            </div>
          )}

          {/* Milestones */}
          {card && projectId && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <IconFlag className="w-3 h-3" />
                Milestones
              </label>
              <div className="flex flex-wrap gap-1.5">
                {milestones.map((ms) => {
                  const isActive = linkedMilestoneIds.has(ms.id);
                  return (
                    <button
                      key={ms.id}
                      onClick={() => handleToggleMilestone(ms.id)}
                      className={`px-2 py-0.5 text-xs font-medium rounded border transition-colors ${
                        isActive
                          ? ms.completed
                            ? "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                            : ms.dueDate && new Date(ms.dueDate) < new Date()
                              ? "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700"
                              : "text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                          : "text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {ms.title}
                    </button>
                  );
                })}
                {milestones.length === 0 && (
                  <span className="text-xs text-gray-400">No milestones yet</span>
                )}
              </div>
            </div>
          )}

          {/* Checklist */}
          {card && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Checklist
                {card.checklist && card.checklist.length > 0 && (
                  <span className="ml-1 text-gray-400">
                    {card.checklist.filter((i) => i.done).length}/{card.checklist.length}
                  </span>
                )}
              </label>
              {card.checklist && card.checklist.length > 0 && (
                <div className="space-y-1">
                  {card.checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 group">
                      <button
                        onClick={() => handleToggleChecklistItem(item)}
                        className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          item.done
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                        }`}
                      >
                        {item.done && <IconCheck className="w-3 h-3" />}
                      </button>
                      <span className={`flex-1 text-sm ${item.done ? "line-through text-gray-400" : "text-gray-900 dark:text-gray-100"}`}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => handleDeleteChecklistItem(item)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all"
                      >
                        <IconX className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddChecklistItem();
                  }}
                  placeholder="Add item..."
                  className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
                />
                <button
                  onClick={handleAddChecklistItem}
                  disabled={!newChecklistText.trim()}
                  className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 transition-colors"
                >
                  <IconPlus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Comments */}
          {card && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Comments ({comments.length})
              </label>
              {comments.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-2 rounded bg-gray-50 dark:bg-gray-800/50 text-sm group">
                      <p className="text-gray-900 dark:text-gray-100">{comment.body}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-500 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 transition-colors"
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 rounded transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
