import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { useNoteStore } from "../store/useNoteStore";
import { Wikilink, Tag } from "../extensions";
import { markdownToHtml } from "../lib/markdown";
import { serializer } from "../lib/serializer";

const DEBOUNCE_MS = 500;

export default function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedNote, selectNote, updateNote, loading } = useNoteStore();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (id) {
      selectNote(id);
    }
  }, [id, selectNote]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        undoRedo: {
          depth: 100,
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
      Wikilink,
      Tag,
    ],
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[60vh]",
      },
    },
    onUpdate: () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (editor && id) {
          const md = serializer.serialize(editor.state.doc);
          updateNote(id, { content: md });
        }
      }, DEBOUNCE_MS);
    },
  });

  // Load content into editor when note is selected
  useEffect(() => {
    if (!editor || !selectedNote || selectedNote.id !== id) return;
    if (editor.getText() === selectedNote.content) return;

    const html = markdownToHtml(selectedNote.content);
    editor.commands.setContent(html);
  }, [editor, selectedNote, id]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id) return;
    updateNote(id, { title: e.target.value });
  };

  // Save immediately before navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
      if (editor && id) {
        const md = serializer.serialize(editor.state.doc);
        navigator.sendBeacon(`/api/notes/${id}`, JSON.stringify({ content: md }));
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editor, id]);

  if (!id) {
    return <div className="text-gray-400 dark:text-gray-500">Select a note</div>;
  }

  if (loading && !selectedNote) {
    return <div className="text-gray-400 dark:text-gray-500">Loading note...</div>;
  }

  if (!loading && !selectedNote) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 dark:text-gray-500 mb-4">Note not found</p>
        <button
          onClick={() => navigate("/")}
          className="text-blue-600 hover:underline"
        >
          Back to notes
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <input
        type="text"
        defaultValue={selectedNote?.title ?? ""}
        onChange={handleTitleChange}
        placeholder="Note title"
        className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder-gray-300 dark:placeholder-gray-600 mb-4 text-gray-900 dark:text-gray-100"
      />

      <div className="flex items-center gap-2 mb-4 text-xs text-gray-400 dark:text-gray-500">
        {selectedNote?.tags.map((tag) => (
          <span
            key={tag.id}
            className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
          >
            #{tag.name}
          </span>
        ))}
      </div>

      {/* Toolbar */}
      {editor && (
        <div className="flex flex-wrap items-center gap-1 mb-3 pb-3 border-b border-gray-200 dark:border-gray-800">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            label="Bold"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            label="Italic"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            label="Strikethrough"
          >
            <s>S</s>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive("code")}
            label="Code"
          >
            <span className="font-mono">&lt;/&gt;</span>
          </ToolbarButton>

          <span className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })}
            label="Heading 1"
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            label="Heading 2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
            label="Heading 3"
          >
            H3
          </ToolbarButton>

          <span className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            label="Bullet list"
          >
            • List
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            label="Ordered list"
          >
            1. List
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive("taskList")}
            label="Task list"
          >
            ☑
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            label="Blockquote"
          >
            &ldquo;
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive("codeBlock")}
            label="Code block"
          >
            {`{ }`}
          </ToolbarButton>
        </div>
      )}

      {/* Editor */}
      {editor && <EditorContent editor={editor} />}

      {!editor && (
        <div className="text-gray-400 dark:text-gray-500">Loading editor...</div>
      )}

      <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 flex items-center justify-between">
        <span>
          Last updated:{" "}
          {selectedNote?.updatedAt
            ? new Date(selectedNote.updatedAt).toLocaleString()
            : "—"}
        </span>
        {selectedNote && selectedNote.backlinks.length > 0 && (
          <span>
            {selectedNote.backlinks.length} backlink
            {selectedNote.backlinks.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  active: boolean;
  label: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, label, children }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        active
          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      {children}
    </button>
  );
}
