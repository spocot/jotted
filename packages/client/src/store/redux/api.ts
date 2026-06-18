import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  Note,
  NoteCreatePayload,
  NoteUpdatePayload,
  EnrichedNote,
  Tag,
  GraphData,
  SearchSuggestion,
  SortField,
  SortOrder,
  FolderNode,
  Upload,
  CalendarData,
  OutlookResponse,
  OutlookStatus,
} from "../../types";
import { getApiBaseUrl, absoluteUrl } from "../../lib/server-config";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: async (args, api, extraOptions) => {
    const baseQuery = fetchBaseQuery({ baseUrl: getApiBaseUrl() });
    const fetchArgs =
      typeof args === "string"
        ? { url: args, headers: {} as Record<string, string> }
        : { ...args, headers: (args.headers ?? {}) as Record<string, string> };

    if (!(fetchArgs.body instanceof FormData)) {
      (fetchArgs.headers as Record<string, string>)["Content-Type"] =
        "application/json";
    }

    const result = await baseQuery(fetchArgs, api, extraOptions);

    if (result.error) {
      const errData = result.error.data as { error?: string } | undefined;
      const message =
        errData?.error ?? `Request failed (${result.error.status})`;
      return {
        error: {
          status: result.error.status,
          data: message,
        } as import("@reduxjs/toolkit/query").FetchBaseQueryError,
      };
    }

    return result;
  },
  tagTypes: [
    "Note",
    "NoteList",
    "Tag",
    "TagList",
    "Folder",
    "Upload",
    "Calendar",
    "Graph",
  ],
  endpoints: (builder) => ({
    // ---- Notes ----
    getNotes: builder.query<Note[], { folder?: string; tag?: string } | void>({
      query: (params) => {
        const sp = new URLSearchParams();
        if (params?.folder) sp.set("folder", params.folder);
        if (params?.tag) sp.set("tag", params.tag);
        const qs = sp.toString();
        return `/notes${qs ? `?${qs}` : ""}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Note" as const, id })),
              "NoteList",
            ]
          : ["NoteList"],
    }),

    getNote: builder.query<EnrichedNote, string>({
      query: (id) => `/notes/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Note", id }],
    }),

    createNote: builder.mutation<EnrichedNote, NoteCreatePayload | void>({
      query: (payload) => ({
        url: "/notes",
        method: "POST",
        body: payload ?? { title: "Untitled" },
      }),
      invalidatesTags: ["NoteList", "Folder", "Graph"],
    }),

    updateNote: builder.mutation<
      EnrichedNote,
      { id: string; payload: NoteUpdatePayload }
    >({
      query: ({ id, payload }) => ({
        url: `/notes/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Note", id },
        "NoteList",
        "Graph",
      ],
    }),

    deleteNote: builder.mutation<void, string>({
      query: (id) => ({ url: `/notes/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Note", id },
        "NoteList",
        "Folder",
        "Graph",
      ],
    }),

    getBacklinkCounts: builder.query<Record<string, number>, void>({
      query: () => "/notes/backlink-counts",
    }),

    getNoteBacklinks: builder.query<Note[], string>({
      query: (id) => `/notes/${id}/backlinks`,
    }),

    getNoteUnlinkedMentions: builder.query<Note[], string>({
      query: (id) => `/notes/${id}/unlinked-mentions`,
    }),

    getNoteByTitle: builder.query<Note, string>({
      query: (title) => `/notes/by-title/${encodeURIComponent(title)}`,
    }),

    // ---- Search ----
    searchNotes: builder.query<
      Note[],
      { q: string; tag?: string; sort?: SortField; order?: SortOrder }
    >({
      query: ({ q, tag, sort, order }) => {
        const params = new URLSearchParams({ q });
        if (tag) params.set("tag", tag);
        if (sort) params.set("sort", sort);
        if (order) params.set("order", order);
        return `/search?${params.toString()}`;
      },
    }),

    searchSuggest: builder.query<SearchSuggestion[], string>({
      query: (q) => `/search/suggest?q=${encodeURIComponent(q)}`,
    }),

    // ---- Tags ----
    getTags: builder.query<Tag[], void>({
      query: () => "/tags",
      providesTags: ["TagList"],
    }),

    getTagNotes: builder.query<Note[], string>({
      query: (name) => `/tags/${encodeURIComponent(name)}/notes`,
    }),

    renameTag: builder.mutation<Tag, { oldName: string; newName: string }>({
      query: ({ oldName, newName }) => ({
        url: `/tags/${encodeURIComponent(oldName)}`,
        method: "PUT",
        body: { name: newName },
      }),
      invalidatesTags: ["TagList", "NoteList"],
    }),

    deleteTag: builder.mutation<void, string>({
      query: (name) => ({
        url: `/tags/${encodeURIComponent(name)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TagList", "NoteList"],
    }),

    addNoteTag: builder.mutation<
      EnrichedNote,
      { noteId: string; name: string }
    >({
      query: ({ noteId, name }) => ({
        url: `/notes/${noteId}/tags`,
        method: "POST",
        body: { name },
      }),
      invalidatesTags: (_result, _error, { noteId }) => [
        { type: "Note", id: noteId },
        "Graph",
      ],
    }),

    removeNoteTag: builder.mutation<
      EnrichedNote,
      { noteId: string; tagName: string }
    >({
      query: ({ noteId, tagName }) => ({
        url: `/notes/${noteId}/tags/${encodeURIComponent(tagName)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { noteId }) => [
        { type: "Note", id: noteId },
        "Graph",
      ],
    }),

    // ---- Graph ----
    getGraph: builder.query<GraphData, void>({
      query: () => "/graph",
      providesTags: ["Graph"],
    }),

    getGraphSub: builder.query<GraphData, string>({
      query: (id) => `/graph/${id}`,
      providesTags: ["Graph"],
    }),

    // ---- Folders ----
    getFolders: builder.query<FolderNode[], void>({
      query: () => "/folders",
      providesTags: ["Folder"],
    }),

    renameFolder: builder.mutation<
      { moved: number },
      { oldPath: string; newPath: string }
    >({
      query: ({ oldPath, newPath }) => ({
        url: "/folders/rename",
        method: "PUT",
        body: { oldPath, newPath },
      }),
      invalidatesTags: ["Folder", "NoteList"],
    }),

    deleteFolder: builder.mutation<{ moved: number }, string>({
      query: (path) => ({
        url: `/folders?path=${encodeURIComponent(path)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Folder", "NoteList"],
    }),

    // ---- Uploads ----
    uploadFile: builder.mutation<Upload, { noteId: string; file: File }>({
      query: ({ noteId, file }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("noteId", noteId);
        return { url: "/uploads", method: "POST", body: formData };
      },
      transformResponse: (upload: Upload) => ({
        ...upload,
        url: absoluteUrl(upload.url),
      }),
      invalidatesTags: (_result, _error, { noteId }) => [
        { type: "Upload", id: noteId },
      ],
    }),

    getUploads: builder.query<Upload[], string>({
      query: (noteId) => `/uploads/${noteId}`,
      transformResponse: (uploads: Upload[]) =>
        uploads.map((u) => ({ ...u, url: absoluteUrl(u.url) })),
      providesTags: (_result, _error, noteId) => [
        { type: "Upload", id: noteId },
      ],
    }),

    deleteUpload: builder.mutation<void, string>({
      query: (id) => ({ url: `/uploads/${id}`, method: "DELETE" }),
      invalidatesTags: ["Upload"],
    }),

    // ---- Calendar ----
    getCalendarData: builder.query<
      CalendarData,
      { year: number; month: number }
    >({
      query: ({ year, month }) => `/calendar?year=${year}&month=${month}`,
      providesTags: ["Calendar"],
    }),

    getOutlookEvents: builder.query<
      OutlookResponse,
      { start: string; end: string }
    >({
      query: ({ start, end }) =>
        `/calendar/outlook?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    }),

    getOutlookStatus: builder.query<OutlookStatus, void>({
      query: () => "/calendar/outlook/status",
    }),

    configureOutlookIcsUrl: builder.mutation<{ message: string }, string>({
      query: (icsUrl) => ({
        url: "/calendar/outlook/config",
        method: "POST",
        body: { icsUrl },
      }),
      invalidatesTags: ["Calendar"],
    }),

    clearOutlookConfig: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/calendar/outlook/config",
        method: "DELETE",
      }),
      invalidatesTags: ["Calendar"],
    }),
  }),
});

export const {
  useGetNotesQuery,
  useGetNoteQuery,
  useCreateNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
  useGetBacklinkCountsQuery,
  useGetNoteBacklinksQuery,
  useGetNoteUnlinkedMentionsQuery,
  useLazyGetNoteByTitleQuery,
  useSearchNotesQuery,
  useLazySearchNotesQuery,
  useLazySearchSuggestQuery,
  useGetTagsQuery,
  useGetTagNotesQuery,
  useRenameTagMutation,
  useDeleteTagMutation,
  useAddNoteTagMutation,
  useRemoveNoteTagMutation,
  useGetGraphQuery,
  useGetGraphSubQuery,
  useGetFoldersQuery,
  useRenameFolderMutation,
  useDeleteFolderMutation,
  useUploadFileMutation,
  useGetUploadsQuery,
  useDeleteUploadMutation,
  useGetCalendarDataQuery,
  useGetOutlookEventsQuery,
  useGetOutlookStatusQuery,
  useConfigureOutlookIcsUrlMutation,
  useClearOutlookConfigMutation,
} = apiSlice;
