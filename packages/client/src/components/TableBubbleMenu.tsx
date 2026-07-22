import { useState, useEffect, useCallback, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { useConfirm } from "../hooks/useConfirm";
import {
  IconTrash,
  IconRowInsertTop,
  IconRowInsertBottom,
  IconColumnInsertLeft,
  IconColumnInsertRight,
  IconTableRow,
  IconTableColumn,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
} from "@tabler/icons-react";

interface TableBubbleMenuProps {
  editor: Editor;
}

export default function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
  const confirm = useConfirm();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!editor.isActive("table")) {
      setPos(null);
      return;
    }

    const { state, view } = editor;
    const { from } = state.selection;

    let tableStart = -1;
    state.doc.nodesBetween(from, Math.min(from + 1, state.doc.content.size), (node, pos) => {
      if (node.type.name === "table") {
        tableStart = pos;
        return false;
      }
      return true;
    });
    if (tableStart === -1) return;

    const node = view.nodeDOM(tableStart);
    if (!(node instanceof HTMLElement)) return;
    const rect = node.getBoundingClientRect();
    if (rect.height === 0) return;

    const vw = window.innerWidth;
    const menuWidth = 360;

    let top = rect.top - 44;
    if (top < 8) top = rect.bottom + 8;

    let left = rect.left + rect.width / 2 - menuWidth / 2;
    if (left < 8) left = 8;
    if (left + menuWidth > vw - 8) left = vw - menuWidth - 8;

    setPos({ top, left });
  }, [editor]);

  useEffect(() => {
    const handleSelectionUpdate = () => updatePosition();
    editor.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, updatePosition]);

  useEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useEffect(() => {
    if (!colorPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setColorPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [colorPickerOpen]);

  if (!pos || !editor.isActive("table")) return null;

  const btnClass = (active?: boolean) =>
    `p-1 rounded transition-colors ${
      active
        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
    }`;

  const COLORS = [
    { bg: "bg-red-100 dark:bg-red-900/30", border: "border-red-300 dark:border-red-700", label: "Red" },
    { bg: "bg-orange-100 dark:bg-orange-900/30", border: "border-orange-300 dark:border-orange-700", label: "Orange" },
    { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-300 dark:border-amber-700", label: "Amber" },
    { bg: "bg-green-100 dark:bg-green-900/30", border: "border-green-300 dark:border-green-700", label: "Green" },
    { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-300 dark:border-blue-700", label: "Blue" },
    { bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-300 dark:border-purple-700", label: "Purple" },
  ];

  const currentBg = editor.getAttributes("tableCell").backgroundColor;

  return (
    <div
      ref={menuRef}
      className="fixed z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-1 py-1 flex items-center gap-0.5"
      style={{ top: pos.top, left: pos.left }}
    >
      <button
        className={btnClass()}
        title="Add row above"
        onClick={() => editor.chain().focus().addRowBefore().run()}
      >
        <IconRowInsertTop size={16} stroke={1.5} />
      </button>
      <button
        className={btnClass()}
        title="Add row below"
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        <IconRowInsertBottom size={16} stroke={1.5} />
      </button>
      <button
        className={btnClass()}
        title="Delete row"
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        <IconTrash size={16} stroke={1.5} />
      </button>

      <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

      <button
        className={btnClass()}
        title="Add column left"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
      >
        <IconColumnInsertLeft size={16} stroke={1.5} />
      </button>
      <button
        className={btnClass()}
        title="Add column right"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        <IconColumnInsertRight size={16} stroke={1.5} />
      </button>
      <button
        className={btnClass()}
        title="Delete column"
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        <IconTrash size={16} stroke={1.5} />
      </button>

      <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

      <button
        className={btnClass(editor.isActive("tableHeader"))}
        title="Toggle header row"
        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
      >
        <IconTableRow size={16} stroke={1.5} />
      </button>
      <button
        className={btnClass(editor.isActive("tableHeaderColumn"))}
        title="Toggle header column"
        onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
      >
        <IconTableColumn size={16} stroke={1.5} />
      </button>

      <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

      <button
        className={btnClass()}
        title="Align left"
        onClick={() => editor.chain().focus().setCellAttribute("textAlign", "left").run()}
      >
        <IconAlignLeft size={16} stroke={1.5} />
      </button>
      <button
        className={btnClass()}
        title="Align center"
        onClick={() => editor.chain().focus().setCellAttribute("textAlign", "center").run()}
      >
        <IconAlignCenter size={16} stroke={1.5} />
      </button>
      <button
        className={btnClass()}
        title="Align right"
        onClick={() => editor.chain().focus().setCellAttribute("textAlign", "right").run()}
      >
        <IconAlignRight size={16} stroke={1.5} />
      </button>

      <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

      <div className="relative">
        <button
          className={`p-1 rounded transition-colors ${
            currentBg
              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
          title="Cell background color"
          onClick={() => setColorPickerOpen(!colorPickerOpen)}
        >
          <span
            className="block w-4 h-4 rounded border border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: currentBg || "transparent" }}
          />
        </button>
        {colorPickerOpen && (
          <div
            ref={colorPickerRef}
            className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 flex gap-1"
          >
            {COLORS.map((c) => (
              <button
                key={c.label}
                className={`w-6 h-6 rounded border ${c.bg} ${c.border}`}
                title={c.label}
                onClick={() => {
                  const hexColor = c.bg.includes("red") ? "#fecaca"
                    : c.bg.includes("orange") ? "#fed7aa"
                    : c.bg.includes("amber") ? "#fde68a"
                    : c.bg.includes("green") ? "#bbf7d0"
                    : c.bg.includes("blue") ? "#bfdbfe"
                    : c.bg.includes("purple") ? "#e9d5ff"
                    : undefined;
                  editor.chain().focus().setCellAttribute("backgroundColor", hexColor).run();
                  setColorPickerOpen(false);
                }}
              />
            ))}
            <button
              className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 bg-transparent flex items-center justify-center text-xs text-gray-400"
              title="No color"
              onClick={() => {
                editor.chain().focus().setCellAttribute("backgroundColor", null).run();
                setColorPickerOpen(false);
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <span className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />

      <button
        className={btnClass()}
        title="Delete table"
        onClick={async () => {
          if (await confirm("Delete this table?", { title: "Delete Table", confirmLabel: "Delete", variant: "danger" })) {
            editor.chain().focus().deleteTable().run();
          }
        }}
      >
        <IconTrash size={16} stroke={1.5} className="text-red-500" />
      </button>
    </div>
  );
}
