import { useState } from "react";
import { IconX } from "@tabler/icons-react";
import type { ProjectArtifact } from "../types";
import { useUpdateArtifactMutation } from "../store/redux/api";

interface ArtifactEditModalProps {
  artifact: ProjectArtifact;
  projectId: string;
  onClose: () => void;
}

const ARTIFACT_TYPES = [
  { value: "note", label: "Note" },
  { value: "canvas", label: "Canvas" },
  { value: "canvas_item", label: "Canvas Item" },
  { value: "image", label: "Image" },
  { value: "kanban_card", label: "Kanban Card" },
  { value: "external_link", label: "External Link" },
];

export default function ArtifactEditModal({
  artifact,
  projectId,
  onClose,
}: ArtifactEditModalProps) {
  const [title, setTitle] = useState(artifact.title);
  const [description, setDescription] = useState(artifact.description);
  const [artifactType, setArtifactType] = useState(artifact.artifactType);
  const [referenceUrl, setReferenceUrl] = useState(artifact.referenceUrl ?? "");
  const [updateArtifact, { isLoading }] = useUpdateArtifactMutation();

  const handleSave = async () => {
    await updateArtifact({
      projectId,
      artifactId: artifact.id,
      title: title.trim() || artifact.title,
      description,
      artifactType,
      referenceUrl: referenceUrl.trim() || null,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-5 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Edit Artifact
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
          />

          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
          />

          <select
            value={artifactType}
            onChange={(e) => setArtifactType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
          >
            {ARTIFACT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {(artifactType === "external_link" || artifactType === "image") && (
            <input
              type="url"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              placeholder={artifactType === "image" ? "Image URL..." : "https://..."}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
            />
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !title.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
