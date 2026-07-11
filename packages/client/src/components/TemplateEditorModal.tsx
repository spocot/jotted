import { useState, useEffect } from "react";
import { IconPlus, IconX, IconGripVertical } from "@tabler/icons-react";
import type { Template } from "../types";

interface TemplateColumn {
  name: string;
  color: string;
}

interface TemplateArtifact {
  name: string;
  type: string;
}

interface TemplateGroup {
  name: string;
  columns: TemplateColumn[];
  artifacts: TemplateArtifact[];
}

interface TemplateEditorModalProps {
  template?: Template | null;
  onSave: (params: { type: "note" | "project"; name: string; description: string; content: string }) => void;
  onClose: () => void;
}

export default function TemplateEditorModal({ template, onSave, onClose }: TemplateEditorModalProps) {
  const [type, setType] = useState<"note" | "project">(template?.type ?? "note");
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");

  // Note template fields
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteTags, setNoteTags] = useState("");
  const [noteFolder, setNoteFolder] = useState("/Unsorted");

  // Project template fields
  const [groups, setGroups] = useState<TemplateGroup[]>([]);

  useEffect(() => {
    if (template) {
      setType(template.type);
      setName(template.name);
      setDescription(template.description);
      try {
        const content = JSON.parse(template.content);
        if (template.type === "note") {
          setNoteTitle(content.title ?? "");
          setNoteBody(content.body ?? "");
          setNoteTags((content.tags ?? []).join(", "));
          setNoteFolder(content.folder ?? "/Unsorted");
        } else {
          const parsed = content.groups ?? [];
          setGroups(parsed.map((g: any) => ({
            name: g.name ?? "",
            columns: (g.columns ?? []).map((c: any) => ({ name: c.name ?? "", color: c.color ?? "" })),
            artifacts: (g.artifacts ?? []).map((a: any) => ({ name: a.name ?? "", type: a.type ?? "note" })),
          })));
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [template]);

  const handleSave = () => {
    let contentStr: string;
    if (type === "note") {
      contentStr = JSON.stringify({
        title: noteTitle,
        body: noteBody,
        tags: noteTags.split(",").map((t) => t.trim()).filter(Boolean),
        folder: noteFolder,
      });
    } else {
      contentStr = JSON.stringify({ groups });
    }
    onSave({ type, name, description, content: contentStr });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-5 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-4 text-gray-900 dark:text-gray-100">
          {template ? "Edit Template" : "New Template"}
        </h2>

        <div className="space-y-3">
          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setType("note")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                type === "note"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}
            >
              Note Template
            </button>
            <button
              onClick={() => setType("project")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                type === "project"
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}
            >
              Project Template
            </button>
          </div>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
          />

          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
          />

          {type === "note" ? (
            <>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title (e.g. Meeting: {{title}}, {{date}})"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
              />
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Note body (TipTap JSON or Markdown)"
                rows={6}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400 resize-y font-mono"
              />
              <input
                type="text"
                value={noteTags}
                onChange={(e) => setNoteTags(e.target.value)}
                placeholder="Tags (comma-separated, e.g. daily, journal)"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
              />
              <input
                type="text"
                value={noteFolder}
                onChange={(e) => setNoteFolder(e.target.value)}
                placeholder="Folder path (e.g. /Journal)"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
              />
            </>
          ) : (
            <>
              {groups.map((group, gi) => (
                <div
                  key={gi}
                  className="border border-gray-300 dark:border-gray-700 rounded p-3 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <IconGripVertical size={14} className="text-gray-400" />
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => {
                        const next = [...groups];
                        next[gi] = { ...next[gi], name: e.target.value };
                        setGroups(next);
                      }}
                      placeholder="Group name"
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={() => setGroups(groups.filter((_, i) => i !== gi))}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <IconX size={14} />
                    </button>
                  </div>

                  {/* Columns */}
                  <div className="ml-6 space-y-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Columns
                    </label>
                    {group.columns.map((col, ci) => (
                      <div key={ci} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={col.color || "#3b82f6"}
                          onChange={(e) => {
                            const next = [...groups];
                            const cols = [...next[gi].columns];
                            cols[ci] = { ...cols[ci], color: e.target.value };
                            next[gi] = { ...next[gi], columns: cols };
                            setGroups(next);
                          }}
                          className="h-6 w-6 cursor-pointer rounded border border-gray-300 dark:border-gray-700"
                        />
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => {
                            const next = [...groups];
                            const cols = [...next[gi].columns];
                            cols[ci] = { ...cols[ci], name: e.target.value };
                            next[gi] = { ...next[gi], columns: cols };
                            setGroups(next);
                          }}
                          placeholder="Column name"
                          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
                        />
                        <button
                          onClick={() => {
                            const next = [...groups];
                            next[gi] = { ...next[gi], columns: group.columns.filter((_, i) => i !== ci) };
                            setGroups(next);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <IconX size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const next = [...groups];
                        next[gi] = { ...next[gi], columns: [...group.columns, { name: "", color: "#3b82f6" }] };
                        setGroups(next);
                      }}
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <IconPlus size={12} /> Add column
                    </button>
                  </div>

                  {/* Artifacts */}
                  <div className="ml-6 space-y-2">
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Artifacts
                    </label>
                    {group.artifacts.map((art, ai) => (
                      <div key={ai} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={art.name}
                          onChange={(e) => {
                            const next = [...groups];
                            const arts = [...next[gi].artifacts];
                            arts[ai] = { ...arts[ai], name: e.target.value };
                            next[gi] = { ...next[gi], artifacts: arts };
                            setGroups(next);
                          }}
                          placeholder="Artifact name"
                          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400"
                        />
                        <select
                          value={art.type}
                          onChange={(e) => {
                            const next = [...groups];
                            const arts = [...next[gi].artifacts];
                            arts[ai] = { ...arts[ai], type: e.target.value };
                            next[gi] = { ...next[gi], artifacts: arts };
                            setGroups(next);
                          }}
                          className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400"
                        >
                          <option value="note">note</option>
                          <option value="canvas">canvas</option>
                          <option value="image">image</option>
                          <option value="external_link">external_link</option>
                        </select>
                        <button
                          onClick={() => {
                            const next = [...groups];
                            next[gi] = { ...next[gi], artifacts: group.artifacts.filter((_, i) => i !== ai) };
                            setGroups(next);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <IconX size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const next = [...groups];
                        next[gi] = { ...next[gi], artifacts: [...group.artifacts, { name: "", type: "note" }] };
                        setGroups(next);
                      }}
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <IconPlus size={12} /> Add artifact
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setGroups([...groups, { name: "", columns: [], artifacts: [] }])}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                <IconPlus size={14} /> Add group
              </button>
            </>
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
            disabled={!name.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50"
          >
            {template ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
