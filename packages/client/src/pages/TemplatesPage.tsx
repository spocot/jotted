import { useState } from "react";
import { IconPlus, IconFileDescription, IconFolder, IconTemplate } from "@tabler/icons-react";
import { useGetTemplatesQuery, useCreateTemplateMutation, useUpdateTemplateMutation, useDeleteTemplateMutation, useApplyTemplateMutation } from "../store/redux/api";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import TemplateCard from "../components/TemplateCard";
import TemplateEditorModal from "../components/TemplateEditorModal";
import type { Template } from "../types";

export default function TemplatesPage() {
  const dispatch = useAppDispatch();
  const [filterType, setFilterType] = useState<"all" | "note" | "project">("all");
  const { data: allTemplates = [], isLoading } = useGetTemplatesQuery({});
  const [createTemplate] = useCreateTemplateMutation();
  const [updateTemplate] = useUpdateTemplateMutation();
  const [deleteTemplate] = useDeleteTemplateMutation();
  const [applyTemplate] = useApplyTemplateMutation();
  const [editing, setEditing] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const templates = filterType === "all"
    ? allTemplates
    : allTemplates.filter((t) => t.type === filterType);

  const handleSave = async (params: { type: "note" | "project"; name: string; description: string; content: string }) => {
    try {
      if (editing) {
        await updateTemplate({ id: editing.id, ...params }).unwrap();
        dispatch(addToast("Template updated", "success"));
      } else {
        await createTemplate(params).unwrap();
        dispatch(addToast("Template created", "success"));
      }
      setShowEditor(false);
      setEditing(null);
    } catch {
      dispatch(addToast("Failed to save template", "error"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id).unwrap();
      dispatch(addToast("Template deleted", "info"));
    } catch {
      dispatch(addToast("Failed to delete template", "error"));
    }
  };

  const handleApply = async (tpl: Template) => {
    try {
      const target = tpl.type;
      await applyTemplate({ id: tpl.id, target }).unwrap();
      dispatch(addToast(`Applied "${tpl.name}" template`, "success"));
    } catch {
      dispatch(addToast("Failed to apply template", "error"));
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <IconTemplate className="w-5 h-5 text-gray-500" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Templates</h1>
        </div>
        <button
          onClick={() => { setEditing(null); setShowEditor(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
        >
          <IconPlus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-6 py-2 border-b border-gray-100 dark:border-gray-800">
        {(["all", "note", "project"] as const).map((ft) => (
          <button
            key={ft}
            onClick={() => setFilterType(ft)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
              filterType === ft
                ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            {ft === "note" ? <IconFileDescription className="w-3.5 h-3.5" /> : ft === "project" ? <IconFolder className="w-3.5 h-3.5" /> : null}
            {ft === "all" ? "All" : ft === "note" ? "Notes" : "Projects"}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <IconTemplate className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No {filterType !== "all" ? filterType : ""} templates yet</p>
            <button
              onClick={() => { setEditing(null); setShowEditor(true); }}
              className="mt-3 text-sm text-blue-500 hover:text-blue-600"
            >
              Create your first template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templates.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                onEdit={(t) => { setEditing(t); setShowEditor(true); }}
                onDelete={handleDelete}
                onApply={handleApply}
              />
            ))}
          </div>
        )}
      </div>

      {showEditor && (
        <TemplateEditorModal
          template={editing}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditing(null); }}
        />
      )}
    </div>
  );
}
