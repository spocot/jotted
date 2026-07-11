import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useGetProjectQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useCreateArtifactMutation,
  useDeleteArtifactMutation,
  useCreateTemplateMutation,
  useGetLabelsQuery,
  useCreateLabelMutation,
  useUpdateLabelMutation,
  useDeleteLabelMutation,
  useGetMilestonesQuery,
  useCreateMilestoneMutation,
  useUpdateMilestoneMutation,
  useDeleteMilestoneMutation,
} from "../store/redux/api";
import {
  IconArrowLeft,
  IconSettings,
  IconTrash,
  IconPlus,
  IconPencil,
  IconLayoutKanban,
  IconCopy,
  IconFlag,
  IconCalendarDue,
  IconChartBar,
  IconCalendarEvent,
} from "@tabler/icons-react";
import ArtifactCard from "../components/ArtifactCard";
import ArtifactPickerModal from "../components/ArtifactPickerModal";
import ArtifactEditModal from "../components/ArtifactEditModal";
import { useConfirm } from "../hooks/useConfirm";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";

const STATUS_OPTIONS = ["planning", "active", "completed", "archived"];
const STATUS_COLORS: Record<string, string> = {
  planning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  archived: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};
const STATUS_LABELS: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export default function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const { data: project, isLoading } = useGetProjectQuery(id ?? "", {
    skip: !id,
  });
  const [updateProject] = useUpdateProjectMutation();
  const [deleteProject] = useDeleteProjectMutation();
  const [createGroup] = useCreateGroupMutation();
  const [updateGroup] = useUpdateGroupMutation();
  const [deleteGroup] = useDeleteGroupMutation();
  const [createArtifact] = useCreateArtifactMutation();
  const [deleteArtifact] = useDeleteArtifactMutation();
  const [createTemplate] = useCreateTemplateMutation();
  const dispatch = useAppDispatch();

  // Label management
  const { data: labels = [] } = useGetLabelsQuery(
    { projectId: id ?? "" },
    { skip: !id },
  );
  const [createLabel] = useCreateLabelMutation();
  const [updateLabel] = useUpdateLabelMutation();
  const [deleteLabel] = useDeleteLabelMutation();
  const [showNewLabel, setShowNewLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6");
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelName, setEditingLabelName] = useState("");
  const [editingLabelColor, setEditingLabelColor] = useState("");

  // Milestone management
  const { data: milestones = [] } = useGetMilestonesQuery(
    { projectId: id ?? "" },
    { skip: !id },
  );
  const [createMilestone] = useCreateMilestoneMutation();
  const [updateMilestone] = useUpdateMilestoneMutation();
  const [deleteMilestone] = useDeleteMilestoneMutation();
  const [showNewMilestone, setShowNewMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState("");
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editingMilestoneTitle, setEditingMilestoneTitle] = useState("");
  const [editingMilestoneDueDate, setEditingMilestoneDueDate] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupTitle, setEditingGroupTitle] = useState("");
  const [showArtifactPicker, setShowArtifactPicker] = useState(false);
  const [artifactGroupId, setArtifactGroupId] = useState<string | null>(null);
  const [editingArtifact, setEditingArtifact] = useState<import("../types").ProjectArtifact | null>(null);

  if (isLoading || !project) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
        </div>
      </div>
    );
  }

  const handleStartEdit = () => {
    setEditTitle(project.title);
    setEditDesc(project.description);
    setEditStatus(project.status);
    setEditStartDate(project.startDate ?? "");
    setEditEndDate(project.endDate ?? "");
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    await updateProject({
      id: project.id,
      payload: {
        title: editTitle.trim(),
        description: editDesc,
        status: editStatus,
        startDate: editStartDate || null,
        endDate: editEndDate || null,
      },
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    const ok = await confirm("Delete this project and all its data?");
    if (!ok) return;
    await deleteProject(project.id);
    navigate("/projects");
  };

  const handleCreateGroup = async () => {
    if (!newGroupTitle.trim()) return;
    await createGroup({
      projectId: project.id,
      title: newGroupTitle.trim(),
    });
    setNewGroupTitle("");
    setShowNewGroup(false);
  };

  const handleUpdateGroup = async (groupId: string, title: string) => {
    await updateGroup({ projectId: project.id, groupId, title });
    setEditingGroupId(null);
  };

  const handleDeleteGroup = async (groupId: string) => {
    const ok = await confirm("Delete this group and all its cards?");
    if (!ok) return;
    await deleteGroup({ projectId: project.id, groupId });
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    await createLabel({
      projectId: project.id,
      name: newLabelName.trim(),
      color: newLabelColor,
    });
    setNewLabelName("");
    setNewLabelColor("#3b82f6");
    setShowNewLabel(false);
  };

  const handleUpdateLabel = async (labelId: string) => {
    if (!editingLabelName.trim()) return;
    await updateLabel({
      projectId: project.id,
      labelId,
      name: editingLabelName.trim(),
      color: editingLabelColor,
    });
    setEditingLabelId(null);
  };

  const handleDeleteLabel = async (labelId: string) => {
    const ok = await confirm("Delete this label from all cards?");
    if (!ok) return;
    await deleteLabel({ projectId: project.id, labelId });
  };

  const handleCreateMilestone = async () => {
    if (!newMilestoneTitle.trim()) return;
    await createMilestone({
      projectId: project.id,
      title: newMilestoneTitle.trim(),
      dueDate: newMilestoneDueDate || undefined,
    });
    setNewMilestoneTitle("");
    setNewMilestoneDueDate("");
    setShowNewMilestone(false);
  };

  const handleUpdateMilestone = async (milestoneId: string) => {
    if (!editingMilestoneTitle.trim()) return;
    await updateMilestone({
      projectId: project.id,
      milestoneId,
      title: editingMilestoneTitle.trim(),
      dueDate: editingMilestoneDueDate || null,
    });
    setEditingMilestoneId(null);
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    const ok = await confirm("Delete this milestone?");
    if (!ok) return;
    await deleteMilestone({ projectId: project.id, milestoneId });
  };

  const handleAddArtifact = async (selection: {
    title: string;
    artifactType: string;
    referenceId?: string;
    referenceUrl?: string;
  }) => {
    await createArtifact({
      projectId: project.id,
      groupId: artifactGroupId,
      ...selection,
    });
  };

  const handleDeleteArtifact = async (artifactId: string) => {
    const ok = await confirm("Remove this artifact?");
    if (!ok) return;
    await deleteArtifact({ projectId: project.id, artifactId });
  };

  const handleSaveProjectAsTemplate = async () => {
    if (!project) return;
    const groups = project.groups?.map((g) => ({
      title: g.title,
      columns: g.columns?.map((c) => ({
        name: c.title,
        color: c.color ?? "",
      })) ?? [],
      artifacts: g.artifacts?.map((a) => ({
        name: a.title,
        type: a.artifactType,
      })) ?? [],
    })) ?? [];
    try {
      await createTemplate({
        type: "project",
        name: `Project: ${project.title}`,
        description: `Template from "${project.title}"`,
        content: JSON.stringify({
          groups,
        }),
      }).unwrap();
      dispatch(addToast("Template saved", "success"));
    } catch {
      dispatch(addToast("Failed to save template", "error"));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate("/projects")}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-4 transition-colors"
      >
        <IconArrowLeft className="w-4 h-4" />
        Back to projects
      </button>

      {/* Project header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-lg font-bold bg-transparent border-b border-blue-500 outline-none text-gray-900 dark:text-gray-100"
                autoFocus
              />
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Description..."
                rows={2}
                className="w-full text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded p-2 text-gray-600 dark:text-gray-400 resize-none focus:outline-none"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
                  title="Start date"
                />
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
                  title="End date"
                />
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold">{project.title}</h1>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    STATUS_COLORS[project.status] ?? ""
                  }`}
                >
                  {STATUS_LABELS[project.status] ?? project.status}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {project.description}
                </p>
              )}
              <div className="flex gap-4 mt-1 text-xs text-gray-400">
                {project.startDate && (
                  <span>Start: {project.startDate}</span>
                )}
                {project.endDate && <span>End: {project.endDate}</span>}
                <span>Groups: {project.groups.length}</span>
                <span>
                  Artifacts: {project.globalArtifacts.length} global,{" "}
                  {project.groups.reduce(
                    (sum, g) => sum + g.artifacts.length,
                    0,
                  )}{" "}
                  in groups
                </span>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => navigate(`/project/${id}/analytics`)}
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                >
                  <IconChartBar className="w-3.5 h-3.5" />
                  Analytics
                </button>
                <button
                  onClick={() => navigate(`/project/${id}/timeline`)}
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
                >
                  <IconCalendarEvent className="w-3.5 h-3.5" />
                  Timeline
                </button>
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2 shrink-0 ml-4">
          <button
            onClick={handleSaveProjectAsTemplate}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Save as template"
          >
            <IconCopy className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={handleStartEdit}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Edit project"
          >
            <IconSettings className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            title="Delete project"
          >
            <IconTrash className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Groups section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Groups
          </h2>
          <button
            onClick={() => setShowNewGroup(true)}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
          >
            <IconPlus className="w-3 h-3" />
            Add group
          </button>
        </div>

        {showNewGroup && (
          <div className="flex gap-2 mb-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <input
              type="text"
              placeholder="Group title..."
              value={newGroupTitle}
              onChange={(e) => setNewGroupTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateGroup();
                if (e.key === "Escape") setShowNewGroup(false);
              }}
              className="flex-1 px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleCreateGroup}
              disabled={!newGroupTitle.trim()}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 rounded transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setShowNewGroup(false)}
              className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {project.groups.length === 0 && !showNewGroup && (
          <p className="text-sm text-gray-400 py-4 text-center">
            No groups yet. Groups let you organize kanban boards and artifacts
            by workstream.
          </p>
        )}

        <div className="grid gap-3">
          {project.groups.map((group) => (
            <div
              key={group.id}
              className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Group header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <IconLayoutKanban className="w-4 h-4 text-blue-500 shrink-0" />
                  {editingGroupId === group.id ? (
                    <input
                      type="text"
                      value={editingGroupTitle}
                      onChange={(e) => setEditingGroupTitle(e.target.value)}
                      onBlur={() =>
                        handleUpdateGroup(group.id, editingGroupTitle)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          handleUpdateGroup(group.id, editingGroupTitle);
                        if (e.key === "Escape") setEditingGroupId(null);
                      }}
                      className="text-sm font-semibold bg-transparent border-b border-blue-500 outline-none text-gray-900 dark:text-gray-100"
                      autoFocus
                    />
                  ) : (
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() =>
                          navigate(`/project/${project.id}/group/${group.id}`)
                        }
                        className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate"
                      >
                        {group.title}
                      </button>
                      {group.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {group.description}
                        </p>
                      )}
                    </div>
                  )}
                  <span className="text-xs text-gray-400 shrink-0">
                    {group.columns.length} cols /{" "}
                    {group.columns.reduce(
                      (sum, c) => sum + c.cards.length,
                      0,
                    )}{" "}
                    cards / {group.artifacts.length} artifacts
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      navigate(`/project/${project.id}/group/${group.id}`)
                    }
                    className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                  >
                    Open Board
                  </button>
                  <button
                    onClick={() => {
                      setEditingGroupId(group.id);
                      setEditingGroupTitle(group.title);
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <IconPencil className="w-3 h-3 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <IconTrash className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Group artifacts preview */}
              {group.artifacts.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="space-y-1">
                    {group.artifacts.slice(0, 3).map((art) => (
                      <ArtifactCard
                        key={art.id}
                        artifact={art}
                        onEdit={(a) => setEditingArtifact(a)}
                        onDelete={(id) =>
                          deleteArtifact({
                            projectId: project.id,
                            artifactId: id,
                          })
                        }
                      />
                    ))}
                    {group.artifacts.length > 3 && (
                      <p className="text-xs text-gray-400 pl-2">
                        +{group.artifacts.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Add artifact to group */}
              <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => {
                    setArtifactGroupId(group.id);
                    setShowArtifactPicker(true);
                  }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <IconPlus className="w-3 h-3" />
                  Add artifact to group
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Labels section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Labels
          </h2>
          <button
            onClick={() => setShowNewLabel(true)}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
          >
            <IconPlus className="w-3 h-3" />
            Add label
          </button>
        </div>

        {showNewLabel && (
          <div className="flex gap-2 mb-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <input
              type="color"
              value={newLabelColor}
              onChange={(e) => setNewLabelColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
            />
            <input
              type="text"
              placeholder="Label name..."
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateLabel();
                if (e.key === "Escape") setShowNewLabel(false);
              }}
              className="flex-1 px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleCreateLabel}
              disabled={!newLabelName.trim()}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 rounded transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setShowNewLabel(false)}
              className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {labels.length === 0 && !showNewLabel && (
          <p className="text-sm text-gray-400 py-4 text-center">
            No labels yet. Labels help organize and filter cards.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 group"
            >
              {editingLabelId === label.id ? (
                <>
                  <input
                    type="color"
                    value={editingLabelColor}
                    onChange={(e) => setEditingLabelColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                  />
                  <input
                    type="text"
                    value={editingLabelName}
                    onChange={(e) => setEditingLabelName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateLabel(label.id);
                      if (e.key === "Escape") setEditingLabelId(null);
                    }}
                    onBlur={() => handleUpdateLabel(label.id)}
                    className="w-24 text-sm bg-transparent border-b border-blue-500 outline-none text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                </>
              ) : (
                <>
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {label.name}
                  </span>
                </>
              )}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingLabelId(label.id);
                    setEditingLabelName(label.name);
                    setEditingLabelColor(label.color);
                  }}
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <IconPencil className="w-3 h-3 text-gray-400" />
                </button>
                <button
                  onClick={() => handleDeleteLabel(label.id)}
                  className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <IconTrash className="w-3 h-3 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Milestones section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <IconFlag className="w-4 h-4" />
            Milestones
          </h2>
          <button
            onClick={() => setShowNewMilestone(true)}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
          >
            <IconPlus className="w-3 h-3" />
            Add milestone
          </button>
        </div>

        {showNewMilestone && (
          <div className="flex gap-2 mb-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <input
              type="text"
              placeholder="Milestone name..."
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateMilestone();
                if (e.key === "Escape") setShowNewMilestone(false);
              }}
              className="flex-1 px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <input
              type="date"
              value={newMilestoneDueDate}
              onChange={(e) => setNewMilestoneDueDate(e.target.value)}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleCreateMilestone}
              disabled={!newMilestoneTitle.trim()}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 rounded transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => setShowNewMilestone(false)}
              className="px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {milestones.length === 0 && !showNewMilestone && (
          <p className="text-sm text-gray-400 py-4 text-center">
            No milestones yet. Milestones help track important deadlines.
          </p>
        )}

        <div className="space-y-2">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 group"
            >
              {editingMilestoneId === milestone.id ? (
                <>
                  <IconFlag className="w-4 h-4 text-blue-500 shrink-0" />
                  <input
                    type="text"
                    value={editingMilestoneTitle}
                    onChange={(e) => setEditingMilestoneTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateMilestone(milestone.id);
                      if (e.key === "Escape") setEditingMilestoneId(null);
                    }}
                    className="flex-1 text-sm bg-transparent border-b border-blue-500 outline-none text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                  <input
                    type="date"
                    value={editingMilestoneDueDate}
                    onChange={(e) => setEditingMilestoneDueDate(e.target.value)}
                    className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  />
                </>
              ) : (
                <>
                  <IconFlag className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                    {milestone.title}
                  </span>
                  {milestone.dueDate && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <IconCalendarDue className="w-3 h-3" />
                      {new Date(milestone.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </>
              )}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingMilestoneId(milestone.id);
                    setEditingMilestoneTitle(milestone.title);
                    setEditingMilestoneDueDate(milestone.dueDate ?? "");
                  }}
                  className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <IconPencil className="w-3 h-3 text-gray-400" />
                </button>
                <button
                  onClick={() => handleDeleteMilestone(milestone.id)}
                  className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <IconTrash className="w-3 h-3 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Global artifacts section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Global Artifacts
          </h2>
          <button
            onClick={() => {
              setArtifactGroupId(null);
              setShowArtifactPicker(true);
            }}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
          >
            <IconPlus className="w-3 h-3" />
            Add artifact
          </button>
        </div>

        {project.globalArtifacts.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">
            No global artifacts yet. These apply to the whole project.
          </p>
        ) : (
          <div className="space-y-2">
            {project.globalArtifacts.map((art) => (
              <ArtifactCard
                key={art.id}
                artifact={art}
                onEdit={(a) => setEditingArtifact(a)}
                onDelete={handleDeleteArtifact}
              />
            ))}
          </div>
        )}
      </section>

      {/* Artifact picker modal */}
      <ArtifactPickerModal
        open={showArtifactPicker}
        onClose={() => setShowArtifactPicker(false)}
        onSelect={handleAddArtifact}
      />

      {/* Artifact edit modal */}
      {editingArtifact && (
        <ArtifactEditModal
          artifact={editingArtifact}
          projectId={project.id}
          onClose={() => setEditingArtifact(null)}
        />
      )}
    </div>
  );
}
