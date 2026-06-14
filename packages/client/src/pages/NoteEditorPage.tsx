import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { useNoteStore } from "../store/useNoteStore";
import { api } from "../api/client";
import { Wikilink, Tag } from "../extensions";
import { markdownToHtml } from "../lib/markdown";
import { serializer } from "../lib/serializer";
import BacklinksPanel from "../components/BacklinksPanel";
import SubgraphView from "../components/SubgraphView";
import { EditorSkeleton } from "../components/Skeleton";

const DEBOUNCE_MS = 500;

export default function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedNote, selectNote, updateNote, error } = useNoteStore();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const loadedNoteIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(false);
  const [title, setTitle] = useState("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (id) {
      selectNote(id);
    }
  }, [id, selectNote]);

  // Sync local title state when navigating to a different note
  useEffect(() => {
    setTitle(selectedNote?.title ?? "");
  }, [selectedNote?.id]);

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
      if (isInitialLoadRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (editor && id) {
          const md = serializer.serialize(editor.state.doc);
          updateNote(id, { content: md });
        }
      }, DEBOUNCE_MS);
    },
  });

  // Load content into editor when navigating to a note (skip on autosave updates)
  useEffect(() => {
    if (!editor || !selectedNote || selectedNote.id !== id) return;
    if (loadedNoteIdRef.current === id) return;
    loadedNoteIdRef.current = id;

    const html = markdownToHtml(selectedNote.content);
    isInitialLoadRef.current = true;
    editor.commands.setContent(html);
    isInitialLoadRef.current = false;
  }, [editor, selectedNote, id]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      selectNote(null);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id) return;
    setTitle(e.target.value);
    updateNote(id, { title: e.target.value });
  };

  const handleAddTag = async (e: React.KeyboardEvent | React.FormEvent) => {
    e.preventDefault();
    if (!id || !newTag.trim()) return;
    try {
      const enriched = await api.addNoteTag(id, newTag.trim());
      useNoteStore.setState({ selectedNote: enriched });
      setNewTag("");
    } catch {
      // ignore
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    if (!id) return;
    try {
      const enriched = await api.removeNoteTag(id, tagName);
      useNoteStore.setState({ selectedNote: enriched });
    } catch {
      // ignore
    }
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

  const dataReady = selectedNote && selectedNote.id === id;

  if (dataReady) {
    // Render note below
  } else if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 dark:text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => navigate("/")}
          className="text-blue-600 hover:underline"
        >
          Back to notes
        </button>
      </div>
    );
  } else {
    return <EditorSkeleton />;
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      {selectedNote?.path && selectedNote.path !== "/" && (
        <div className="text-xs text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          {selectedNote.path.split("/").filter(Boolean).map((segment, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-300 dark:text-gray-600">/</span>}
              <span>{segment}</span>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="Note title"
        className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder-gray-300 dark:placeholder-gray-600 mb-4 text-gray-900 dark:text-gray-100"
      />

      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {selectedNote?.tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full group"
          >
            #{tag.name}
            <button
              onClick={() => handleRemoveTag(tag.name)}
              className="hover:text-red-500 transition-colors"
              title={`Remove #${tag.name}`}
            >
              ×
            </button>
          </span>
        ))}
        <form onSubmit={handleAddTag} className="inline-flex">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add tag..."
            className="w-24 px-2 py-0.5 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddTag(e);
            }}
          />
        </form>
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

      <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
        Last updated:{" "}
        {selectedNote?.updatedAt
          ? new Date(selectedNote.updatedAt).toLocaleString()
          : "—"}
      </div>

      {/* Backlinks & Unlinked Mentions */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Connections
        </h3>
        <BacklinksPanel
          noteId={id}
          noteTitle={selectedNote?.title ?? ""}
        />
      </div>

      {/* Subgraph */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Local Graph
          </h3>
          <Link
            to={`/graph?note=${id}`}
            className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Open full graph
          </Link>
        </div>
        <SubgraphView noteId={id} />
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
