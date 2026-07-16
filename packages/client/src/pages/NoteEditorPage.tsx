import { useEffect, useRef, useState, useCallback } from "react";
import { IconFolder, IconAlertCircle, IconLoader2, IconCheck, IconUserPlus, IconX, IconClipboardList } from "@tabler/icons-react";
import { useParams, useNavigate } from "react-router-dom";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
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
  useCreateTemplateMutation,
  useLazyGetPeopleQuery,
  useSyncNoteFromIcsMutation,
  useUnlinkPersonFromNoteMutation,
  useLinkPeopleToNoteMutation,
} from "../store/redux/api";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import { Wikilink, Tag, Mention, CodeBlockHighlight, Callout, CALLOUT_TYPES } from "../extensions";
import { markdownToHtml } from "../lib/markdown";
import { serializer } from "../lib/serializer";
import { getServerUrl } from "../lib/server-config";
import AttachmentsPanel from "../components/AttachmentsPanel";
import EditorSidePanel from "../components/EditorSidePanel";
import MentionList from "../components/MentionList";
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
  const [triggerGetPeople] = useLazyGetPeopleQuery();
  const [linkPeopleToNote] = useLinkPeopleToNoteMutation();
  const [unlinkPerson] = useUnlinkPersonFromNoteMutation();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isInitialLoadRef = useRef(false);
  const [title, setTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [newTag, setNewTag] = useState("");
  const editorRef = useRef<any>(null);
  const idRef = useRef(id);
  const [peoplePickerOpen, setPeoplePickerOpen] = useState<"organizer" | "attendee" | null>(null);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [peopleResults, setPeopleResults] = useState<{ personId: string; name: string; email: string | null }[]>([]);
  const [peopleSearchLoading, setPeopleSearchLoading] = useState(false);
  const peopleSearchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handlePeopleSearch = useCallback(
    (query: string) => {
      setPeopleSearch(query);
      if (peopleSearchTimerRef.current) clearTimeout(peopleSearchTimerRef.current);
      if (!query.trim()) {
        setPeopleResults([]);
        setPeopleSearchLoading(false);
        return;
      }
      setPeopleSearchLoading(true);
      peopleSearchTimerRef.current = setTimeout(async () => {
        try {
          const result = await triggerGetPeople({ q: query.trim() }).unwrap();
          setPeopleResults((result ?? []).map((p) => ({
            personId: p.id,
            name: p.name,
            email: p.email,
          })));
        } catch {
          setPeopleResults([]);
        } finally {
          setPeopleSearchLoading(false);
        }
      }, 200);
    },
    [triggerGetPeople],
  );

  const [meetingDate, setMeetingDate] = useState("");
  const [meetingStartTime, setMeetingStartTime] = useState("");
  const [meetingEndTime, setMeetingEndTime] = useState("");
  const [meetingLocationValue, setMeetingLocationValue] = useState("");
  const [editingMeta, setEditingMeta] = useState(false);
  const [calloutDropdownOpen, setCalloutDropdownOpen] = useState(false);
  const calloutDropdownRef = useRef<HTMLDivElement>(null);

  const toDateInput = (iso: string | null | undefined) => {
    if (!iso) return "";
    try { return new Date(iso).toISOString().slice(0, 10); } catch { return ""; }
  };
  const toTimeInput = (iso: string | null | undefined) => {
    if (!iso) return "";
    try { return new Date(iso).toTimeString().slice(0, 5); } catch { return ""; }
  };

  useEffect(() => {
    if (selectedNote) {
      setMeetingDate(toDateInput(selectedNote.meetingStart));
      setMeetingStartTime(toTimeInput(selectedNote.meetingStart));
      setMeetingEndTime(toTimeInput(selectedNote.meetingEnd));
      setMeetingLocationValue(selectedNote.meetingLocation ?? "");
      setEditingMeta(false);
    }
  }, [selectedNote?.id]);

  const handleSaveMeta = useCallback(() => {
    if (!id) return;
    const payload: Record<string, string | undefined> = {};
    payload.meetingLocation = meetingLocationValue || undefined;
    if (meetingDate && meetingStartTime) {
      payload.meetingStart = `${meetingDate}T${meetingStartTime}:00`;
    }
    if (meetingDate && meetingEndTime) {
      payload.meetingEnd = `${meetingDate}T${meetingEndTime}:00`;
    }
    updateNote({ id, payload });
    setEditingMeta(false);
  }, [id, meetingDate, meetingStartTime, meetingEndTime, meetingLocationValue, updateNote]);

  const formatMeetingDateTime = (iso: string | null | undefined): string | null => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        weekday: "short", year: "numeric", month: "short", day: "numeric",
      });
    } catch { return null; }
  };

  const formatMeetingTime = (start: string | null | undefined, end: string | null | undefined): string | null => {
    if (!start || !end) return null;
    try {
      const s = new Date(start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const e = new Date(end).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      return `${s}–${e}`;
    } catch { return null; }
  };

  // Sync local title state when navigating to a different note
  useEffect(() => {
    setTitle(selectedNote?.title ?? "");
  }, [selectedNote?.id]);

  const dispatch = useAppDispatch();
  const uploadImageRef = useRef<(file: File) => Promise<void>>(async () => {});
  const triggerGetPeopleRef = useRef(triggerGetPeople);
  triggerGetPeopleRef.current = triggerGetPeople;

  const mentionSuggestion = {
    items: async ({ query }: { query: string }) => {
      const result = await triggerGetPeopleRef.current({ q: query }).unwrap();
      return (result ?? []).map((p) => ({
        personId: p.id,
        name: p.name,
        email: p.email,
      }));
    },
    command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setMention({ personId: props.personId, name: props.name })
        .run();
    },
    render: () => {
      let component: ReactRenderer | null = null;
      let popup: HTMLElement | null = null;

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(MentionList, {
            props: { ...props, isLoading: false },
            editor: props.editor,
          });
          if (!props.clientRect) return;
          popup = document.createElement("div");
          popup.style.position = "absolute";
          popup.style.zIndex = "50";
          const rect = props.clientRect();
          if (rect) {
            popup.style.left = `${rect.left + window.scrollX}px`;
            popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
          }
          document.body.appendChild(popup);
          popup.appendChild(component.element);
        },
        onUpdate: (props: any) => {
          component?.updateProps(props);
          if (!props.clientRect || !popup) return;
          const rect = props.clientRect();
          if (rect) {
            popup.style.left = `${rect.left + window.scrollX}px`;
            popup.style.top = `${rect.bottom + window.scrollY + 4}px`;
          }
        },
        onKeyDown: (props: any) => {
          if (props.event.key === "Escape") {
            popup?.remove();
            popup = null;
            return true;
          }
          if (component?.ref) {
            const listEl = (component.ref as any)?.handleKeyDown?.(props.event);
            if (listEl) return true;
          }
          return false;
        },
        onExit: () => {
          component?.destroy();
          component = null;
          popup?.remove();
          popup = null;
        },
      };
    },
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        listItem: false,
        codeBlock: false,
        undoRedo: {
          depth: 100,
        },
      }),
      CodeBlockHighlight,
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
      Callout,
      Mention.configure({ suggestion: mentionSuggestion }),
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
        const ed = editorRef.current;
        const nId = idRef.current;
        if (ed && nId) {
          setSaveStatus("saving");
          const md = serializer.serialize(ed.state.doc);
          updateNote({ id: nId, payload: { content: md } })
            .unwrap()
            .then(() => setSaveStatus("saved"))
            .catch(() => setSaveStatus("unsaved"));
        }
      }, DEBOUNCE_MS);
    },
  });

  editorRef.current = editor;
  idRef.current = id;

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

  // Load content into editor when navigating to a note or when content changes externally (restore)
  useEffect(() => {
    if (!editor || !selectedNote || selectedNote.id !== id) return;

    const currentMd = serializer.serialize(editor.state.doc);
    if (currentMd === selectedNote.content) return;

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

  const handleRemoveTag = async (tagName: string, source?: string) => {
    if (!id) return;
    try {
      await removeNoteTag({ noteId: id, tagName }).unwrap();
      if (source === "content" && editor) {
        const serialized = serializer.serialize(editor.state.doc);
        const cleaned = serialized
          .replace(new RegExp(`#${tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), "")
          .replace(/  +/g, " ")
          .trim();
        const html = markdownToHtml(cleaned);
        editor.commands.setContent(html);
      }
    } catch {
      // ignore
    }
  };

  const [createTemplate] = useCreateTemplateMutation();
  const [syncNoteFromIcs] = useSyncNoteFromIcsMutation();

  const handleSaveAsTemplate = async () => {
    if (!selectedNote) return;
    const tagNames = selectedNote.tags.map((t) => t.name);
    const bodyContent = editor ? JSON.stringify(editor.getJSON()) : selectedNote.content;
    try {
      await createTemplate({
        type: "note",
        name: `Note: ${selectedNote.title}`,
        description: `Template from "${selectedNote.title}"`,
        content: JSON.stringify({
          title: selectedNote.title,
          body: bodyContent,
          tags: tagNames,
          folder: selectedNote.path,
        }),
      }).unwrap();
      dispatch(addToast("Template saved", "success"));
    } catch {
      dispatch(addToast("Failed to save template", "error"));
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
          `${getServerUrl()}/api/notes/${id}`,
          JSON.stringify({ content: md, title: titleRef.current }),
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editor, id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calloutDropdownRef.current && !calloutDropdownRef.current.contains(e.target as Node)) {
        setCalloutDropdownOpen(false);
      }
    };
    if (calloutDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [calloutDropdownOpen]);

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
              <IconFolder className="w-3 h-3" />
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
                  onClick={() => handleRemoveTag(tag.name, tag.source)}
                  className="hover:text-red-500 transition-colors"
                  title={tag.source === "content" ? `Remove #${tag.name} from content` : `Remove #${tag.name} tag`}
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

          {/* Meeting metadata */}
          {selectedNote?.noteType === "meeting" && (
            <div className="mb-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              {/* ICS Sync Banner */}
              {selectedNote.icsUid && (
                <div className="mb-3 flex items-center justify-between text-xs">
                  {selectedNote.icsOutOfDate ? (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      Changes pending — calendar event has updated
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      Up to date
                    </span>
                  )}
                  {selectedNote.icsOutOfDate && (
                    <button
                      onClick={async () => {
                        try {
                          await syncNoteFromIcs({ id: id!, payload: {} as any }).unwrap();
                          dispatch(addToast("Synced with calendar", "success"));
                        } catch {
                          dispatch(addToast("Sync failed", "error"));
                        }
                      }}
                      className="px-2 py-0.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors"
                    >
                      Sync
                    </button>
                  )}
                  {!selectedNote.icsOutOfDate && selectedNote.icsLastSynced && (
                    <span className="text-gray-400 dark:text-gray-500">
                      Last synced: {new Date(selectedNote.icsLastSynced).toLocaleString()}
                    </span>
                  )}
                  {!selectedNote.icsOutOfDate && !selectedNote.icsLastSynced && (
                    <span className="text-gray-400 dark:text-gray-500">
                      Linked to calendar · synced on creation
                    </span>
                  )}
                </div>
              )}

              {/* Meeting details — compact */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {selectedNote.meetingStart || selectedNote.meetingLocation ? (
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedNote.meetingStart && (
                        <span>
                          {formatMeetingDateTime(selectedNote.meetingStart)}
                          {selectedNote.meetingEnd && (
                            <span>
                              {" · "}
                              {formatMeetingTime(selectedNote.meetingStart, selectedNote.meetingEnd)}
                            </span>
                          )}
                        </span>
                      )}
                      {selectedNote.meetingLocation && (
                        <span>
                          {selectedNote.meetingStart ? " · " : ""}
                          {selectedNote.meetingLocation}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">No meeting details set</p>
                  )}
                </div>
                {!selectedNote.icsUid && (
                  <button
                    onClick={() => setEditingMeta(true)}
                    className="shrink-0 text-xs text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>

              {/* Organizer — inline */}
              <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-800 flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Organizer:</span>
                {selectedNote.people?.filter((p) => p.role === "organizer").map((p) => (
                  <span key={p.personId} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full">
                    {p.name}
                    {!selectedNote.icsUid && (
                      <button
                        onClick={() => {
                          if (id) unlinkPerson({ noteId: id, personId: p.personId, role: "organizer" });
                        }}
                        className="ml-0.5 hover:text-red-500 transition-colors"
                        title="Remove organizer"
                      >
                        <IconX size={10} />
                      </button>
                    )}
                  </span>
                ))}
                {(selectedNote.people?.filter((p) => p.role === "organizer").length ?? 0) === 0 && (
                  peoplePickerOpen === "organizer" ? (
                    <div className="relative">
                      <input
                        autoFocus
                        type="text"
                        value={peopleSearch}
                        onChange={(e) => handlePeopleSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setPeoplePickerOpen(null);
                            setPeopleSearch("");
                          }
                        }}
                        placeholder="Search people..."
                        className="text-xs px-2 py-1 rounded border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400 w-36"
                      />
                      {(peopleSearchLoading || peopleResults.length > 0) && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                          {peopleSearchLoading ? (
                            <div className="flex items-center justify-center py-2">
                              <IconLoader2 className="w-3 h-3 animate-spin text-gray-400" />
                            </div>
                          ) : (
                            peopleResults.map((person) => (
                              <button
                                key={person.personId}
                                onClick={() => {
                                  if (id) {
                                    linkPeopleToNote({
                                      noteId: id,
                                      personIds: [person.personId],
                                      role: "organizer",
                                    });
                                    setPeoplePickerOpen(null);
                                    setPeopleSearch("");
                                    setPeopleResults([]);
                                  }
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                              >
                                <span className="font-medium">{person.name}</span>
                                {person.email && (
                                  <span className="text-xs text-gray-400 ml-2">{person.email}</span>
                                )}
                              </button>
                            ))
                          )}
                          {!peopleSearchLoading && peopleResults.length === 0 && peopleSearch.trim() && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                              No people found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setPeoplePickerOpen("organizer")}
                      className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      <IconUserPlus size={12} />
                      Add
                    </button>
                  )
                )}
              </div>

              {/* Attendees — inline */}
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Attendees:</span>
                {selectedNote.people?.filter((p) => p.role === "attendee").map((p) => {
                  const statusColors: Record<string, string> = {
                    accepted: "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200",
                    tentative: "bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200",
                    declined: "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200",
                    "needs-action": "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
                  };
                  const colorClass = statusColors[p.status ?? ""] ?? "bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200";
                  return (
                    <span key={p.personId} className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${colorClass}`}>
                      {p.name}
                      {p.status && (
                        <span className="opacity-70">
                          {p.status === "accepted" ? "✓" : p.status === "tentative" ? "~" : p.status === "declined" ? "✗" : ""}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          if (id) {
                            unlinkPerson({ noteId: id, personId: p.personId, role: "attendee" });
                          }
                        }}
                        className="ml-0.5 hover:text-red-500 transition-colors"
                        title="Remove attendee"
                      >
                        <IconX size={10} />
                      </button>
                    </span>
                  );
                })}
                {peoplePickerOpen === "attendee" ? (
                  <div className="relative">
                    <input
                      autoFocus
                      type="text"
                      value={peopleSearch}
                      onChange={(e) => handlePeopleSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setPeoplePickerOpen(null);
                          setPeopleSearch("");
                        }
                      }}
                      placeholder="Search people..."
                      className="text-xs px-2 py-1 rounded border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400 w-36"
                    />
                    {(peopleSearchLoading || peopleResults.length > 0) && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                        {peopleSearchLoading ? (
                          <div className="flex items-center justify-center py-2">
                            <IconLoader2 className="w-3 h-3 animate-spin text-gray-400" />
                          </div>
                        ) : (
                          peopleResults.map((person) => (
                            <button
                              key={person.personId}
                              onClick={() => {
                                if (id) {
                                  linkPeopleToNote({
                                    noteId: id,
                                    personIds: [person.personId],
                                    role: "attendee",
                                    status: "needs-action",
                                  });
                                  setPeoplePickerOpen(null);
                                  setPeopleSearch("");
                                  setPeopleResults([]);
                                }
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                            >
                              <span className="font-medium">{person.name}</span>
                              {person.email && (
                                <span className="text-xs text-gray-400 ml-2">{person.email}</span>
                              )}
                            </button>
                          ))
                        )}
                        {!peopleSearchLoading && peopleResults.length === 0 && peopleSearch.trim() && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                            No people found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setPeoplePickerOpen("attendee");
                      setPeopleSearch("");
                      setPeopleResults([]);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    <IconUserPlus size={12} />
                    Add
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Edit meeting metadata modal */}
          {editingMeta && selectedNote?.noteType === "meeting" && !selectedNote.icsUid && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setEditingMeta(false);
                  setMeetingDate(toDateInput(selectedNote?.meetingStart));
                  setMeetingStartTime(toTimeInput(selectedNote?.meetingStart));
                  setMeetingEndTime(toTimeInput(selectedNote?.meetingEnd));
                  setMeetingLocationValue(selectedNote?.meetingLocation ?? "");
                }
              }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-5 w-full max-w-sm mx-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Edit meeting details
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Date</label>
                    <input
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="block w-full text-sm px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Time</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={meetingStartTime}
                        onChange={(e) => setMeetingStartTime(e.target.value)}
                        className="text-sm px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400 w-32"
                      />
                      <span className="text-gray-400 dark:text-gray-500 text-sm">–</span>
                      <input
                        type="time"
                        value={meetingEndTime}
                        onChange={(e) => setMeetingEndTime(e.target.value)}
                        className="text-sm px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400 w-32"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Location</label>
                    <input
                      type="text"
                      value={meetingLocationValue}
                      onChange={(e) => setMeetingLocationValue(e.target.value)}
                      placeholder="Add location..."
                      className="block w-full text-sm px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-400"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => {
                      setEditingMeta(false);
                      setMeetingDate(toDateInput(selectedNote?.meetingStart));
                      setMeetingStartTime(toTimeInput(selectedNote?.meetingStart));
                      setMeetingEndTime(toTimeInput(selectedNote?.meetingEnd));
                      setMeetingLocationValue(selectedNote?.meetingLocation ?? "");
                    }}
                    className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMeta}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

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

              <div className="relative" ref={calloutDropdownRef}>
                <button
                  onClick={() => setCalloutDropdownOpen(!calloutDropdownOpen)}
                  title="Callout"
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    editor.isActive("callout")
                      ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <IconClipboardList size={12} stroke={2} />
                    Callout
                  </span>
                </button>
                {calloutDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto py-1">
                    {CALLOUT_TYPES.map((ct) => {
                      const dotColor = ct.color === "blue" ? "bg-blue-500" : ct.color === "amber" ? "bg-amber-500" : ct.color === "emerald" ? "bg-emerald-500" : ct.color === "red" ? "bg-red-500" : ct.color === "sky" ? "bg-sky-500" : ct.color === "purple" ? "bg-purple-500" : ct.color === "teal" ? "bg-teal-500" : ct.color === "green" ? "bg-green-500" : ct.color === "rose" ? "bg-rose-500" : ct.color === "violet" ? "bg-violet-500" : "bg-slate-500";
                      return (
                        <button
                          key={ct.type}
                          onClick={() => {
                            editor.chain().focus().setCallout({ type: ct.type }).run();
                            setCalloutDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2.5"
                        >
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
                          {ct.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <span className="w-px h-5 bg-gray-300 dark:bg-gray-700 mx-1" />

              <ToolbarButton
                onClick={handleSaveAsTemplate}
                active={false}
                label="Save as template"
              >
                📋
              </ToolbarButton>

              <div className="flex-1" />
              {saveStatus === "unsaved" && (
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 shrink-0">
                  <IconAlertCircle className="w-3.5 h-3.5" />
                  Unsaved
                </span>
              )}
              {saveStatus === "saving" && (
                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 shrink-0">
                  <IconLoader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-xs text-green-500 dark:text-green-400 flex items-center gap-1 shrink-0">
                  <IconCheck className="w-3.5 h-3.5" />
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
