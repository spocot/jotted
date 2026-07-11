import { useState } from "react";
import { IconCopy, IconPlus } from "@tabler/icons-react";
import { useGetTemplatesQuery, useApplyTemplateMutation } from "../store/redux/api";
import type { Template } from "../types";

interface TemplatePickerModalProps {
  target: "note" | "project";
  onClose: () => void;
  onApplied: (result: unknown) => void;
}

export default function TemplatePickerModal({ target, onClose, onApplied }: TemplatePickerModalProps) {
  const [tab, setTab] = useState<"blank" | "template">("template");
  const { data: templates = [], isLoading } = useGetTemplatesQuery({ type: target });
  const [applyTemplate] = useApplyTemplateMutation();

  const handleApply = async (tpl: Template) => {
    try {
      const result = await applyTemplate({ id: tpl.id, target }).unwrap();
      onApplied(result);
      onClose();
    } catch {
      // error handled by RTK
    }
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
        <h2 className="text-base font-semibold mb-3 text-gray-900 dark:text-gray-100">
          New {target === "note" ? "Note" : "Project"}
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("blank")}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              tab === "blank"
                ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <IconPlus className="w-3.5 h-3.5 inline mr-1" />
            Blank
          </button>
          <button
            onClick={() => setTab("template")}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              tab === "template"
                ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <IconCopy className="w-3.5 h-3.5 inline mr-1" />
            From Template
          </button>
        </div>

        {tab === "blank" ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
            Create a blank {target === "note" ? "note" : "project"}.
            <br />
            Close this dialog to proceed.
          </p>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
            No {target} templates found.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => handleApply(tpl)}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {tpl.name}
                    </div>
                    {tpl.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {tpl.description}
                      </div>
                    )}
                  </div>
                  <IconCopy className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
