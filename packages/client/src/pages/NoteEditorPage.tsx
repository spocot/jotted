import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import {
  useGetNoteQuery,
  useUpdateNoteMutation,
  useAddNoteTagMutation,
  useRemoveNoteTagMutation,
  useUploadFileMutation,
} from "../store/redux/api";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import { Wikilink, Tag } from "../extensions";
import { markdownToHtml } from "../lib/markdown";
import { serializer } from "../lib/serializer";
import AttachmentsPanel from "../components/AttachmentsPanel";
import EditorSidePanel from "../components/EditorSidePanel";
import { EditorSkeleton } from "../components/Skeleton";

// Give TaskList higher parse priority than BulletList so that
// <ul data-type="taskList"> parses as taskList, not bulletList.
const CustomTaskList = TaskList.extend({
  parseHTML() {
    return [
      {
        tag: 'ul[data-type="taskList"]',
        priority: 100,
      },
    ];
  },
});

const DEBOUNCE_MS = 2000;
type SaveStatus = "saved" | "saving" | "unsaved";

export default function NoteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    data: selectedNote,
    error,
  } = useGetNoteQuery(id ?? "", { skip: !id });
  const [updateNote] = useUpdateNoteMutation();
  const [addNoteTag] = useAddNoteTagMutation();
  const [removeNoteTag] = useRemoveNoteTagMutation();
  const [uploadFile] = useUploadFileMutation();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const loadedNoteIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(false);
  const [title, setTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [newTag, setNewTag] = useState("");

  // Sync local title state when navigating to a different note
  useEffect(() => {
    setTitle(selectedNote?.title ?? "");
  }, [selectedNote?.id]);

  const dispatch = useAppDispatch();
  const uploadImageRef = useRef<(file: File) => Promise<void>>(async () => {});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        listItem: false,
        undoRedo: {
          depth: 100,
        },
      }),
      CustomTaskList,
      TaskItem.configure({ nested: true }),
      BulletList,
      ListItem,
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Wikilink,
      Tag,
    ],
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[60vh]",
      },
      handleDOMEvents: {
        drop: (view, event) => {
          const hasFiles = event.dataTransfer?.files?.length;
          if (!hasFiles) return false;
          const file = event.dataTransfer!.files[0];
          if (!file.type.startsWith("image/")) return false;
          event.preventDefault();
          const pos = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });
          if (pos) {
            view.dispatch(view.state.tr.setSelection(view.state.selection));
          }
          uploadImageRef.current(file);
          return true;
        },
        paste: (_view, event) => {
          const items = event.clipboardData?.items;
          if (!items) return false;
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) uploadImageRef.current(file);
              return true;
            }
          }
          return false;
        },
      },
    },
    onUpdate: () => {
      if (isInitialLoadRef.current) return;
      setSaveStatus("unsaved");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (editor && id) {
          setSaveStatus("saving");
          const md = serializer.serialize(editor.state.doc);
          updateNote({ id, payload: { content: md } })
            .unwrap()
            .then(() => setSaveStatus("saved"))
            .catch(() => setSaveStatus("unsaved"));
        }
      }, DEBOUNCE_MS);
    },
  });

  // Set up the upload image function that editorProps handlers use via ref
  useEffect(() => {
    uploadImageRef.current = async (file: File) => {
      if (!id || !editor) return;
      try {
        const upload = await uploadFile({ noteId: id, file }).unwrap();
        editor.chain().focus().setImage({ src: upload.url }).run();
      } catch {
        dispatch(addToast("Failed to upload image", "error"));
      }
    };
  }, [id, editor, addToast, uploadFile]);

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

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    };
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id) return;
    const value = e.target.value;
    setTitle(value);
    setSaveStatus("unsaved");
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    titleTimerRef.current = setTimeout(() => {
      setSaveStatus("saving");
      updateNote({ id, payload: { title: value } })
        .unwrap()
        .then(() => setSaveStatus("saved"))
        .catch((err) => {
          setSaveStatus("unsaved");
          const status = (err as { status?: number })?.status;
          const data = (err as { data?: string })?.data;
          if (status === 409) {
            dispatch(addToast(data ?? "A note with this title already exists", "error"));
          }
        });
    }, DEBOUNCE_MS);
  };

  const handleAddTag = async (e: React.KeyboardEvent | React.FormEvent) => {
    e.preventDefault();
    if (!id || !newTag.trim()) return;
    try {
      await addNoteTag({ noteId: id, name: newTag.trim() }).unwrap();
      setNewTag("");
    } catch {
      // ignore
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    if (!id) return;
    try {
      await removeNoteTag({ noteId: id, tagName }).unwrap();
    } catch {
      // ignore
    }
  };

  // Save immediately before navigation
  const titleRef = useRef(title);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
      if (titleTimerRef.current) {
        clearTimeout(titleTimerRef.current);
        titleTimerRef.current = undefined;
      }
      if (editor && id) {
        const md = serializer.serialize(editor.state.doc);
        navigator.sendBeacon(
          `/api/notes/${id}`,
          JSON.stringify({ content: md, title: titleRef.current }),
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editor, id]);

  if (!id) {
    return <div className="text-gray-400 dark:text-gray-500">Select a note</div>;
  }

  const dataReady = selectedNote && selectedNote.id === id;
  const errorMessage = error
    ? typeof error === "object" && "data" in error
      ? (error.data as string)
      : "An error occurred"
    : null;

  if (dataReady) {
    // Render note below
  } else if (errorMessage) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 dark:text-gray-500 mb-4">{errorMessage}</p>
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
    <div className="flex flex-1 h-full">
      {/* Editor column */}
      <div className="flex-1 overflow-y-auto p-6">
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

              <div className="flex-1" />
              {saveStatus === "unsaved" && (
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  Unsaved
                </span>
              )}
              {saveStatus === "saving" && (
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 shrink-0">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-xs text-green-500 dark:text-green-400 flex items-center gap-1 shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
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

          {/* Attachments */}
          <AttachmentsPanel noteId={id} />
        </div>
      </div>

      {/* Side panel */}
      <EditorSidePanel
        noteId={id}
        noteTitle={selectedNote?.title ?? ""}
      />
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
