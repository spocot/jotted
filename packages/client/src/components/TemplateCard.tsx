import { IconFileDescription, IconFolder, IconTrash, IconEdit, IconCopy } from "@tabler/icons-react";
import type { Template } from "../types";

interface TemplateCardProps {
  template: Template;
  onEdit: (tpl: Template) => void;
  onDelete: (id: string) => void;
  onApply: (tpl: Template) => void;
}

export default function TemplateCard({ template, onEdit, onDelete, onApply }: TemplateCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {template.type === "note" ? (
            <IconFileDescription className="w-4 h-4 text-blue-500 shrink-0" />
          ) : (
            <IconFolder className="w-4 h-4 text-green-500 shrink-0" />
          )}
          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {template.type}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(template)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Edit template"
          >
            <IconEdit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(template.id)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete template"
          >
            <IconTrash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
        {template.name}
      </h3>

      {template.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {template.description}
        </p>
      )}

      <button
        onClick={() => onApply(template)}
        className="mt-auto flex items-center justify-center gap-1.5 w-full px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
      >
        <IconCopy className="w-3.5 h-3.5" />
        Apply
      </button>
    </div>
  );
}
