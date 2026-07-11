import { useState, useEffect } from "react";
import type { ProjectArtifact } from "../types";
import {
  IconFileText,
  IconLayoutKanban,
  IconPhoto,
  IconLink,
  IconPencil,
  IconGripVertical,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

interface ArtifactCardProps {
  artifact: ProjectArtifact;
  onEdit: (artifact: ProjectArtifact) => void;
  onDelete: (artifactId: string) => void;
}

function ArtifactIcon({ type }: { type: string }) {
  switch (type) {
    case "note":
      return <IconFileText className="w-4 h-4" />;
    case "canvas":
    case "canvas_item":
      return <IconLayoutKanban className="w-4 h-4" />;
    case "image":
      return <IconPhoto className="w-4 h-4" />;
    case "kanban_card":
      return <IconGripVertical className="w-4 h-4" />;
    default:
      return <IconLink className="w-4 h-4" />;
  }
}

const TYPE_LABELS: Record<string, string> = {
  note: "Note",
  canvas: "Canvas",
  canvas_item: "Canvas Item",
  image: "Image",
  kanban_card: "Kanban Card",
  external_link: "External Link",
};

export default function ArtifactCard({ artifact, onEdit, onDelete }: ArtifactCardProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-artifact-menu]")) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleOpen = () => {
    switch (artifact.artifactType) {
      case "note":
        if (artifact.referenceId) navigate(`/note/${artifact.referenceId}`);
        break;
      case "canvas":
        if (artifact.referenceId) navigate(`/canvas/${artifact.referenceId}`);
        break;
      case "canvas_item":
        if (artifact.referenceId) navigate(`/canvas`);
        break;
      case "external_link":
        if (artifact.referenceUrl) window.open(artifact.referenceUrl, "_blank");
        break;
      case "kanban_card":
        // Navigate to the project page — card is within the same project
        break;
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
      <button
        onClick={handleOpen}
        className="mt-0.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors shrink-0"
        title={`Open ${TYPE_LABELS[artifact.artifactType] ?? "Artifact"}`}
      >
        <ArtifactIcon type={artifact.artifactType} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {TYPE_LABELS[artifact.artifactType] ?? artifact.artifactType}
          </span>
        </div>
        <button
          onClick={handleOpen}
          className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate block text-left"
        >
          {artifact.title || "Untitled"}
        </button>
        {artifact.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
            {artifact.description}
          </p>
        )}
        {artifact.referenceUrl && artifact.artifactType === "external_link" && (
          <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5 truncate">
            {artifact.referenceUrl}
          </p>
        )}
      </div>
      <div className="relative shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" data-artifact-menu>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <IconPencil className="w-3.5 h-3.5 text-gray-400" />
        </button>
        {showMenu && (
          <>
            <button
              onClick={() => { onEdit(artifact); setShowMenu(false); }}
              className="absolute right-0 top-full mt-1 whitespace-nowrap px-2 py-1 text-xs rounded bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
            >
              Edit
            </button>
            <button
              onClick={() => { onDelete(artifact.id); setShowMenu(false); }}
              className="absolute right-0 top-full mt-8 whitespace-nowrap px-2 py-1 text-xs rounded bg-white dark:bg-gray-800 shadow-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors z-10"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
