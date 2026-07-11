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
  PageResponse,
  StreakInfo,
  NoteVersion,
  Canvas,
  CanvasWithDetails,
  CanvasItem,
  CanvasEdge,
  Project,
  ProjectWithDetails,
  ProjectGroup,
  ProjectColumn,
  ProjectCard,
  ProjectArtifact,
  ProjectLabel,
  ProjectChecklistItem,
  ProjectCardComment,
  ProjectMilestone,
  ProjectCardTemplate,
  Template,
  CanvasVersion,
  InquiryColumnInfo,
  InquiryRow,
  InquiryForeignKey,
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
    "NoteVersions",
    "Tag",
    "TagList",
    "Folder",
    "Upload",
    "Calendar",
    "Canvas",
    "Project",
    "Graph",
    "Template",
    "Inquiry",
  ],
  endpoints: (builder) => ({
    // ---- Notes ----
    getNotes: builder.query<
      PageResponse<Note>,
      { folder?: string; tag?: string; sort?: SortField; order?: SortOrder; limit?: number; offset?: number } | void
    >({
      query: (params) => {
        const sp = new URLSearchParams();
        if (params?.folder) sp.set("folder", params.folder);
        if (params?.tag) sp.set("tag", params.tag);
        if (params?.sort) sp.set("sort", params.sort);
        if (params?.order) sp.set("order", params.order);
        if (params?.limit) sp.set("limit", String(params.limit));
        if (params?.offset) sp.set("offset", String(params.offset));
        const qs = sp.toString();
        return `/notes${qs ? `?${qs}` : ""}`;
      },
      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map(({ id }) => ({ type: "Note" as const, id })),
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
        { type: "NoteVersions", id },
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

    getNoteBacklinks: builder.query<
      PageResponse<Note>,
      { id: string; limit?: number; offset?: number }
    >({
      query: ({ id, limit, offset }) => {
        const sp = new URLSearchParams();
        if (limit) sp.set("limit", String(limit));
        if (offset) sp.set("offset", String(offset));
        const qs = sp.toString();
        return `/notes/${id}/backlinks${qs ? `?${qs}` : ""}`;
      },
    }),

    getNoteUnlinkedMentions: builder.query<
      PageResponse<Note>,
      { id: string; limit?: number; offset?: number }
    >({
      query: ({ id, limit, offset }) => {
        const sp = new URLSearchParams();
        if (limit) sp.set("limit", String(limit));
        if (offset) sp.set("offset", String(offset));
        const qs = sp.toString();
        return `/notes/${id}/unlinked-mentions${qs ? `?${qs}` : ""}`;
      },
    }),

    getNoteByTitle: builder.query<Note, string>({
      query: (title) => `/notes/by-title/${encodeURIComponent(title)}`,
    }),

    // ---- Versions ----
    getNoteVersions: builder.query<
      PageResponse<NoteVersion>,
      { id: string; limit?: number; offset?: number }
    >({
      query: ({ id, limit, offset }) => {
        const sp = new URLSearchParams();
        if (limit) sp.set("limit", String(limit));
        if (offset) sp.set("offset", String(offset));
        const qs = sp.toString();
        return `/notes/${id}/versions${qs ? `?${qs}` : ""}`;
      },
      providesTags: (_result, _error, { id }) => [{ type: "NoteVersions", id }],
    }),

    getNoteVersion: builder.query<
      NoteVersion,
      { id: string; versionId: string }
    >({
      query: ({ id, versionId }) => `/notes/${id}/versions/${versionId}`,
    }),

    restoreNoteVersion: builder.mutation<
      import("../../types").EnrichedNote,
      { id: string; versionId: string }
    >({
      query: ({ id, versionId }) => ({
        url: `/notes/${id}/versions/${versionId}/restore`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Note", id },
        { type: "NoteVersions", id },
        "NoteList",
      ],
    }),

    // ---- Search ----
    searchNotes: builder.query<
      PageResponse<Note>,
      { q: string; tag?: string; sort?: SortField; order?: SortOrder; limit?: number; offset?: number }
    >({
      query: ({ q, tag, sort, order, limit, offset }) => {
        const params = new URLSearchParams({ q });
        if (tag) params.set("tag", tag);
        if (sort) params.set("sort", sort);
        if (order) params.set("order", order);
        if (limit) params.set("limit", String(limit));
        if (offset) params.set("offset", String(offset));
        return `/search?${params.toString()}`;
      },
    }),

    searchSuggest: builder.query<SearchSuggestion[], string>({
      query: (q) => `/search/suggest?q=${encodeURIComponent(q)}`,
    }),

    // ---- Daily Notes / Journal ----
    getDailyNotes: builder.query<
      PageResponse<Note>,
      { limit?: number; offset?: number } | void
    >({
      query: (params) => {
        const sp = new URLSearchParams();
        if (params?.limit) sp.set("limit", String(params.limit));
        if (params?.offset) sp.set("offset", String(params.offset));
        const qs = sp.toString();
        return `/notes/daily${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["NoteList"],
    }),

    getDailyStreak: builder.query<StreakInfo, void>({
      query: () => "/notes/daily/streak",
      providesTags: ["NoteList"],
    }),

    // ---- Tags ----
    getTags: builder.query<Tag[], void>({
      query: () => "/tags",
      providesTags: ["TagList"],
    }),

    getTagNotes: builder.query<
      PageResponse<Note>,
      { name: string; limit?: number; offset?: number }
    >({
      query: ({ name, limit, offset }) => {
        const sp = new URLSearchParams();
        if (limit) sp.set("limit", String(limit));
        if (offset) sp.set("offset", String(offset));
        const qs = sp.toString();
        return `/tags/${encodeURIComponent(name)}/notes${qs ? `?${qs}` : ""}`;
      },
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
    getGraph: builder.query<
      GraphData & { total?: number; hasMore?: boolean },
      { limit?: number; offset?: number } | void
    >({
      query: (params) => {
        const sp = new URLSearchParams();
        if (params?.limit) sp.set("limit", String(params.limit));
        if (params?.offset) sp.set("offset", String(params.offset));
        const qs = sp.toString();
        return `/graph${qs ? `?${qs}` : ""}`;
      },
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
        "Upload",
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

    getAllUploads: builder.query<Upload[], void>({
      query: () => "/uploads",
      transformResponse: (uploads: Upload[]) =>
        uploads.map((u) => ({ ...u, url: absoluteUrl(u.url) })),
      providesTags: ["Upload"],
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

    // ---- Canvases ----
    getCanvases: builder.query<Canvas[], void>({
      query: () => "/canvases",
      providesTags: ["Canvas"],
    }),

    getCanvas: builder.query<CanvasWithDetails, string>({
      query: (id) => `/canvases/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Canvas", id }],
    }),

    createCanvas: builder.mutation<Canvas, string | void>({
      query: (title) => ({
        url: "/canvases",
        method: "POST",
        body: title ? { title } : {},
      }),
      invalidatesTags: ["Canvas"],
    }),

    updateCanvas: builder.mutation<Canvas, { id: string; title: string }>({
      query: ({ id, title }) => ({
        url: `/canvases/${id}`,
        method: "PUT",
        body: { title },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Canvas", id },
        "Canvas",
      ],
    }),

    deleteCanvas: builder.mutation<void, string>({
      query: (id) => ({
        url: `/canvases/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Canvas"],
    }),

    addCanvasItem: builder.mutation<
      CanvasItem,
      { canvasId: string; item: { noteId?: string | null; type?: string; text?: string; color?: string; x?: number; y?: number; width?: number; height?: number } }
    >({
      query: ({ canvasId, item }) => ({
        url: `/canvases/${canvasId}/items`,
        method: "POST",
        body: item,
      }),
      invalidatesTags: (_result, _error, { canvasId }) => [
        { type: "Canvas", id: canvasId },
      ],
    }),

    updateCanvasItem: builder.mutation<
      CanvasItem,
      { canvasId: string; itemId: string; item: Partial<CanvasItem> }
    >({
      query: ({ canvasId, itemId, item }) => ({
        url: `/canvases/${canvasId}/items/${itemId}`,
        method: "PUT",
        body: item,
      }),
      invalidatesTags: (_result, _error, { canvasId }) => [
        { type: "Canvas", id: canvasId },
      ],
    }),

    deleteCanvasItem: builder.mutation<
      void,
      { canvasId: string; itemId: string }
    >({
      query: ({ canvasId, itemId }) => ({
        url: `/canvases/${canvasId}/items/${itemId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { canvasId }) => [
        { type: "Canvas", id: canvasId },
      ],
    }),

    addCanvasEdge: builder.mutation<
      CanvasEdge,
      { canvasId: string; edge: { sourceItemId: string; targetItemId: string; type?: string } }
    >({
      query: ({ canvasId, edge }) => ({
        url: `/canvases/${canvasId}/edges`,
        method: "POST",
        body: edge,
      }),
      invalidatesTags: (_result, _error, { canvasId }) => [
        { type: "Canvas", id: canvasId },
      ],
    }),

    updateCanvasEdge: builder.mutation<
      CanvasEdge,
      { canvasId: string; edgeId: string; edge: Partial<CanvasEdge> }
    >({
      query: ({ canvasId, edgeId, edge }) => ({
        url: `/canvases/${canvasId}/edges/${edgeId}`,
        method: "PUT",
        body: edge,
      }),
      invalidatesTags: (_result, _error, { canvasId }) => [
        { type: "Canvas", id: canvasId },
      ],
    }),

    deleteCanvasEdge: builder.mutation<
      void,
      { canvasId: string; edgeId: string }
    >({
      query: ({ canvasId, edgeId }) => ({
        url: `/canvases/${canvasId}/edges/${edgeId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { canvasId }) => [
        { type: "Canvas", id: canvasId },
      ],
    }),

    batchUpdateCanvas: builder.mutation<
      CanvasWithDetails,
      {
        canvasId: string;
        data: {
          items?: Array<Partial<CanvasItem> & { id: string }>;
          edges?: Array<Partial<CanvasEdge> & { id: string }>;
          deletedItemIds?: string[];
          deletedEdgeIds?: string[];
        };
      }
    >({
      query: ({ canvasId, data }) => ({
        url: `/canvases/${canvasId}/batch`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (_result, _error, { canvasId }) => [
        { type: "Canvas", id: canvasId },
        "Canvas",
      ],
    }),

    // ---- Canvas Groups ----
    createCanvasGroup: builder.mutation<
      { id: string; canvasId: string; label: string; createdAt: string },
      { canvasId: string; groupId: string; label?: string }
    >({
      query: ({ canvasId, groupId, label }) => ({
        url: `/canvases/${canvasId}/groups`,
        method: "POST",
        body: { groupId, label },
      }),
      invalidatesTags: (_result, _error, { canvasId }) => [
        { type: "Canvas", id: canvasId },
      ],
    }),

    deleteCanvasGroup: builder.mutation<
      void,
      { canvasId: string; groupId: string }
    >({
      query: ({ canvasId, groupId }) => ({
        url: `/canvases/${canvasId}/groups/${groupId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { canvasId }) => [
        { type: "Canvas", id: canvasId },
      ],
    }),

    getCanvasGroups: builder.query<
      Array<{ id: string; canvasId: string; label: string; createdAt: string }>,
      string
    >({
      query: (canvasId) => `/canvases/${canvasId}/groups`,
      providesTags: (_result, _error, canvasId) => [{ type: "Canvas", id: canvasId }],
    }),

    // ---- Canvas Versions ----
    createCanvasVersion: builder.mutation<
      CanvasVersion,
      { canvasId: string; title: string; description?: string; items: CanvasItem[]; edges: CanvasEdge[]; thumbnail?: string }
    >({
      query: ({ canvasId, title, description, items, edges, thumbnail }) => ({
        url: `/canvases/${canvasId}/versions`,
        method: "POST",
        body: { title, description, items, edges, thumbnail },
      }),
      invalidatesTags: (_result, _error, { canvasId }) => [
        { type: "Canvas", id: canvasId },
      ],
    }),

    deleteCanvasVersion: builder.mutation<
      void,
      { canvasId: string; versionId: string }
    >({
      query: ({ canvasId, versionId }) => ({
        url: `/canvases/${canvasId}/versions/${versionId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { canvasId }) => [
        { type: "Canvas", id: canvasId },
      ],
    }),

    getCanvasVersions: builder.query<CanvasVersion[], string>({
      query: (canvasId) => `/canvases/${canvasId}/versions`,
      providesTags: (_result, _error, canvasId) => [{ type: "Canvas", id: canvasId }],
    }),

    getCanvasVersion: builder.query<CanvasVersion, { canvasId: string; versionId: string }>({
      query: ({ canvasId, versionId }) => `/canvases/${canvasId}/versions/${versionId}`,
    }),

    restoreCanvasVersion: builder.mutation<
      CanvasWithDetails,
      { canvasId: string; versionId: string }
    >({
      query: ({ canvasId, versionId }) => ({
        url: `/canvases/${canvasId}/versions/${versionId}/restore`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { canvasId }) => [
        { type: "Canvas", id: canvasId },
        "Canvas",
      ],
    }),

    // ---- Projects ----
    getProjects: builder.query<Project[], void>({
      query: () => "/projects",
      providesTags: ["Project"],
    }),

    getProject: builder.query<ProjectWithDetails, string>({
      query: (id) => `/projects/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Project", id }],
    }),

    createProject: builder.mutation<
      Project,
      { title?: string; description?: string; status?: string; startDate?: string; endDate?: string } | void
    >({
      query: (payload) => ({
        url: "/projects",
        method: "POST",
        body: payload ?? { title: "Untitled Project" },
      }),
      invalidatesTags: ["Project"],
    }),

    updateProject: builder.mutation<
      Project,
      {
        id: string;
        payload: {
          title?: string;
          description?: string;
          status?: string;
          startDate?: string | null;
          endDate?: string | null;
        };
      }
    >({
      query: ({ id, payload }) => ({
        url: `/projects/${id}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Project", id },
        "Project",
      ],
    }),

    deleteProject: builder.mutation<void, string>({
      query: (id) => ({ url: `/projects/${id}`, method: "DELETE" }),
      invalidatesTags: ["Project"],
    }),

    // ---- Groups ----
    createGroup: builder.mutation<
      ProjectGroup,
      { projectId: string; title?: string; description?: string }
    >({
      query: ({ projectId, title, description }) => ({
        url: `/projects/${projectId}/groups`,
        method: "POST",
        body: { title, description },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    updateGroup: builder.mutation<
      ProjectGroup,
      { projectId: string; groupId: string; title?: string; description?: string }
    >({
      query: ({ projectId, groupId, title, description }) => ({
        url: `/projects/${projectId}/groups/${groupId}`,
        method: "PUT",
        body: { title, description },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    deleteGroup: builder.mutation<
      void,
      { projectId: string; groupId: string }
    >({
      query: ({ projectId, groupId }) => ({
        url: `/projects/${projectId}/groups/${groupId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    reorderGroups: builder.mutation<
      ProjectGroup[],
      { projectId: string; orderedIds: string[] }
    >({
      query: ({ projectId, orderedIds }) => ({
        url: `/projects/${projectId}/groups/reorder`,
        method: "PUT",
        body: { orderedIds },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    // ---- Columns ----
    createColumn: builder.mutation<
      ProjectColumn,
      { projectId: string; groupId: string; title?: string }
    >({
      query: ({ projectId, groupId, title }) => ({
        url: `/projects/${projectId}/groups/${groupId}/columns`,
        method: "POST",
        body: { title },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    updateColumn: builder.mutation<
      ProjectColumn,
      { projectId: string; groupId: string; columnId: string; title?: string }
    >({
      query: ({ projectId, groupId, columnId, title }) => ({
        url: `/projects/${projectId}/groups/${groupId}/columns/${columnId}`,
        method: "PUT",
        body: { title },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    deleteColumn: builder.mutation<
      void,
      { projectId: string; groupId: string; columnId: string }
    >({
      query: ({ projectId, groupId, columnId }) => ({
        url: `/projects/${projectId}/groups/${groupId}/columns/${columnId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    reorderColumns: builder.mutation<
      ProjectColumn[],
      { projectId: string; groupId: string; orderedIds: string[] }
    >({
      query: ({ projectId, groupId, orderedIds }) => ({
        url: `/projects/${projectId}/groups/${groupId}/columns/reorder`,
        method: "PUT",
        body: { orderedIds },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    // ---- Cards ----
    createCard: builder.mutation<
      ProjectCard,
      {
        projectId: string;
        groupId: string;
        columnId: string;
        title?: string;
        description?: string;
        noteId?: string;
        dueDate?: string;
      }
    >({
      query: ({ projectId, groupId, columnId, title, description, noteId, dueDate }) => ({
        url: `/projects/${projectId}/groups/${groupId}/cards`,
        method: "POST",
        body: { columnId, title, description, noteId, dueDate },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    updateCard: builder.mutation<
      ProjectCard,
      {
        projectId: string;
        groupId: string;
        cardId: string;
        title?: string;
        description?: string;
        noteId?: string | null;
        dueDate?: string | null;
      }
    >({
      query: ({ projectId, groupId, cardId, title, description, noteId, dueDate }) => ({
        url: `/projects/${projectId}/groups/${groupId}/cards/${cardId}`,
        method: "PUT",
        body: { title, description, noteId, dueDate },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    deleteCard: builder.mutation<
      void,
      { projectId: string; groupId: string; cardId: string }
    >({
      query: ({ projectId, groupId, cardId }) => ({
        url: `/projects/${projectId}/groups/${groupId}/cards/${cardId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    moveCard: builder.mutation<
      ProjectCard,
      { projectId: string; groupId: string; cardId: string; targetColumnId: string; position?: number }
    >({
      query: ({ projectId, groupId, cardId, targetColumnId, position }) => ({
        url: `/projects/${projectId}/groups/${groupId}/cards/${cardId}/move`,
        method: "PUT",
        body: { targetColumnId, position },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    reorderCards: builder.mutation<
      ProjectCard[],
      { projectId: string; groupId: string; columnId: string; orderedIds: string[] }
    >({
      query: ({ projectId, groupId, columnId, orderedIds }) => ({
        url: `/projects/${projectId}/groups/${groupId}/cards/reorder/${columnId}`,
        method: "PUT",
        body: { orderedIds },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    // ---- Artifacts ----
    getArtifacts: builder.query<
      ProjectArtifact[],
      { projectId: string; groupId?: string }
    >({
      query: ({ projectId, groupId }) => {
        const sp = new URLSearchParams();
        if (groupId) sp.set("groupId", groupId);
        const qs = sp.toString();
        return `/projects/${projectId}/artifacts${qs ? `?${qs}` : ""}`;
      },
      providesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
      ],
    }),

    createArtifact: builder.mutation<
      ProjectArtifact,
      {
        projectId: string;
        groupId?: string | null;
        title?: string;
        description?: string;
        artifactType?: string;
        referenceId?: string;
        referenceUrl?: string;
      }
    >({
      query: ({ projectId, groupId, title, description, artifactType, referenceId, referenceUrl }) => ({
        url: `/projects/${projectId}/artifacts`,
        method: "POST",
        body: { groupId, title, description, artifactType, referenceId, referenceUrl },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    updateArtifact: builder.mutation<
      ProjectArtifact,
      {
        projectId: string;
        artifactId: string;
        title?: string;
        description?: string;
        artifactType?: string;
        referenceId?: string | null;
        referenceUrl?: string | null;
      }
    >({
      query: ({ projectId, artifactId, title, description, artifactType, referenceId, referenceUrl }) => ({
        url: `/projects/${projectId}/artifacts/${artifactId}`,
        method: "PUT",
        body: { title, description, artifactType, referenceId, referenceUrl },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    deleteArtifact: builder.mutation<
      void,
      { projectId: string; artifactId: string }
    >({
      query: ({ projectId, artifactId }) => ({
        url: `/projects/${projectId}/artifacts/${artifactId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    // ---- Labels ----
    getLabels: builder.query<
      ProjectLabel[],
      { projectId: string }
    >({
      query: ({ projectId }) => `/projects/${projectId}/labels`,
      providesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
      ],
    }),

    createLabel: builder.mutation<
      ProjectLabel,
      { projectId: string; name: string; color?: string }
    >({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/labels`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    updateLabel: builder.mutation<
      ProjectLabel,
      { projectId: string; labelId: string; name?: string; color?: string }
    >({
      query: ({ projectId, labelId, ...body }) => ({
        url: `/projects/${projectId}/labels/${labelId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    deleteLabel: builder.mutation<
      void,
      { projectId: string; labelId: string }
    >({
      query: ({ projectId, labelId }) => ({
        url: `/projects/${projectId}/labels/${labelId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    addLabelToCard: builder.mutation<
      void,
      { projectId: string; cardId: string; labelId: string }
    >({
      query: ({ projectId, cardId, labelId }) => ({
        url: `/projects/${projectId}/cards/${cardId}/labels/${labelId}`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    removeLabelFromCard: builder.mutation<
      void,
      { projectId: string; cardId: string; labelId: string }
    >({
      query: ({ projectId, cardId, labelId }) => ({
        url: `/projects/${projectId}/cards/${cardId}/labels/${labelId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    // ---- Checklists ----
    getChecklist: builder.query<
      ProjectChecklistItem[],
      { projectId: string; cardId: string }
    >({
      query: ({ projectId, cardId }) =>
        `/projects/${projectId}/cards/${cardId}/checklist`,
      providesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
      ],
    }),

    addChecklistItem: builder.mutation<
      ProjectChecklistItem,
      { projectId: string; cardId: string; text: string }
    >({
      query: ({ projectId, cardId, ...body }) => ({
        url: `/projects/${projectId}/cards/${cardId}/checklist`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    updateChecklistItem: builder.mutation<
      ProjectChecklistItem,
      {
        projectId: string;
        cardId: string;
        itemId: string;
        text?: string;
        done?: boolean;
      }
    >({
      query: ({ projectId, cardId, itemId, ...body }) => ({
        url: `/projects/${projectId}/cards/${cardId}/checklist/${itemId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    deleteChecklistItem: builder.mutation<
      void,
      { projectId: string; cardId: string; itemId: string }
    >({
      query: ({ projectId, cardId, itemId }) => ({
        url: `/projects/${projectId}/cards/${cardId}/checklist/${itemId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    // ---- Comments ----
    getComments: builder.query<
      ProjectCardComment[],
      { projectId: string; cardId: string }
    >({
      query: ({ projectId, cardId }) =>
        `/projects/${projectId}/cards/${cardId}/comments`,
      providesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
      ],
    }),

    addComment: builder.mutation<
      ProjectCardComment,
      { projectId: string; cardId: string; body: string }
    >({
      query: ({ projectId, cardId, ...body }) => ({
        url: `/projects/${projectId}/cards/${cardId}/comments`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    deleteComment: builder.mutation<
      void,
      { projectId: string; cardId: string; commentId: string }
    >({
      query: ({ projectId, cardId, commentId }) => ({
        url: `/projects/${projectId}/cards/${cardId}/comments/${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    // ---- Templates ----
    getTemplates: builder.query<Template[], { type?: "note" | "project" }>({
      query: ({ type }) => {
        const sp = new URLSearchParams();
        if (type) sp.set("type", type);
        const qs = sp.toString();
        return `/templates${qs ? `?${qs}` : ""}`;
      },
      providesTags: ["Template"],
    }),

    getTemplate: builder.query<Template, string>({
      query: (id) => `/templates/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Template", id }],
    }),

    createTemplate: builder.mutation<
      Template,
      { type: "note" | "project"; name: string; description?: string; content: string }
    >({
      query: (body) => ({ url: "/templates", method: "POST", body }),
      invalidatesTags: ["Template"],
    }),

    updateTemplate: builder.mutation<
      Template,
      { id: string; type?: "note" | "project"; name?: string; description?: string; content?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/templates/${id}`, method: "PUT", body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Template", id }, "Template"],
    }),

    deleteTemplate: builder.mutation<void, string>({
      query: (id) => ({ url: `/templates/${id}`, method: "DELETE" }),
      invalidatesTags: ["Template"],
    }),

    applyTemplate: builder.mutation<
      unknown,
      { id: string; target: "note" | "project" }
    >({
      query: ({ id, target }) => ({
        url: `/templates/${id}/apply?target=${target}`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { target }) =>
        target === "note" ? ["NoteList"] : ["Project"],
    }),

    // ---- Milestones ----
    getMilestones: builder.query<ProjectMilestone[], { projectId: string }>({
      query: ({ projectId }) => `/projects/${projectId}/milestones`,
      providesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
      ],
    }),

    createMilestone: builder.mutation<
      ProjectMilestone,
      { projectId: string; title: string; description?: string; dueDate?: string }
    >({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/milestones`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    updateMilestone: builder.mutation<
      ProjectMilestone,
      { projectId: string; milestoneId: string; title?: string; description?: string; dueDate?: string | null; position?: number }
    >({
      query: ({ projectId, milestoneId, ...body }) => ({
        url: `/projects/${projectId}/milestones/${milestoneId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    deleteMilestone: builder.mutation<
      void,
      { projectId: string; milestoneId: string }
    >({
      query: ({ projectId, milestoneId }) => ({
        url: `/projects/${projectId}/milestones/${milestoneId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    toggleMilestone: builder.mutation<
      ProjectMilestone,
      { projectId: string; milestoneId: string; completed: boolean }
    >({
      query: ({ projectId, milestoneId, completed }) => ({
        url: `/projects/${projectId}/milestones/${milestoneId}/toggle`,
        method: "PATCH",
        body: { completed },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    linkCardsToMilestone: builder.mutation<
      { linked: number },
      { projectId: string; milestoneId: string; cardIds: string[] }
    >({
      query: ({ projectId, milestoneId, cardIds }) => ({
        url: `/projects/${projectId}/milestones/${milestoneId}/cards`,
        method: "POST",
        body: { cardIds },
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    unlinkCardFromMilestone: builder.mutation<
      void,
      { projectId: string; milestoneId: string; cardId: string }
    >({
      query: ({ projectId, milestoneId, cardId }) => ({
        url: `/projects/${projectId}/milestones/${milestoneId}/cards/${cardId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    getCardsForMilestone: builder.query<
      string[],
      { projectId: string; milestoneId: string }
    >({
      query: ({ projectId, milestoneId }) =>
        `/projects/${projectId}/milestones/${milestoneId}/cards`,
      providesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
      ],
    }),

    // ---- Card Templates ----
    getCardTemplates: builder.query<ProjectCardTemplate[], { projectId: string }>({
      query: ({ projectId }) => `/projects/${projectId}/card-templates`,
      providesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
      ],
    }),

    createCardTemplate: builder.mutation<
      ProjectCardTemplate,
      { projectId: string; title: string; description?: string; defaultLabels?: string[]; defaultChecklist?: string[] }
    >({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}/card-templates`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    updateCardTemplate: builder.mutation<
      ProjectCardTemplate,
      { projectId: string; templateId: string; title?: string; description?: string; defaultLabels?: string[]; defaultChecklist?: string[] }
    >({
      query: ({ projectId, templateId, ...body }) => ({
        url: `/projects/${projectId}/card-templates/${templateId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    deleteCardTemplate: builder.mutation<
      void,
      { projectId: string; templateId: string }
    >({
      query: ({ projectId, templateId }) => ({
        url: `/projects/${projectId}/card-templates/${templateId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        { type: "Project", id: projectId },
        "Project",
      ],
    }),

    getInquiryTables: builder.query<string[], void>({
      query: () => "/inquiry/tables",
      providesTags: ["Inquiry"],
    }),

    getInquiryTableSchema: builder.query<InquiryColumnInfo[], string>({
      query: (table) => `/inquiry/tables/${table}/schema`,
      providesTags: (_result, _error, table) => [
        { type: "Inquiry", id: `schema:${table}` },
      ],
    }),

    getInquiryTableRows: builder.query<
      PageResponse<InquiryRow>,
      { table: string; sort?: string; order?: string; limit?: number; offset?: number }
    >({
      query: ({ table, sort, order, limit, offset }) => {
        const params = new URLSearchParams();
        if (sort) params.set("sort", sort);
        if (order) params.set("order", order);
        if (limit !== undefined) params.set("limit", String(limit));
        if (offset !== undefined) params.set("offset", String(offset));
        const qs = params.toString();
        return `/inquiry/tables/${table}/rows${qs ? `?${qs}` : ""}`;
      },
      providesTags: (_result, _error, { table }) => [
        { type: "Inquiry", id: `rows:${table}` },
      ],
    }),

    getInquiryTableRow: builder.query<
      InquiryRow,
      { table: string; rowKey: string }
    >({
      query: ({ table, rowKey }) =>
        `/inquiry/tables/${table}/rows/${encodeURIComponent(rowKey)}`,
      providesTags: (_result, _error, { table, rowKey }) => [
        { type: "Inquiry", id: `row:${table}:${rowKey}` },
      ],
    }),

    getInquiryTableForeignKeys: builder.query<InquiryForeignKey[], string>({
      query: (table) => `/inquiry/tables/${table}/foreign-keys`,
      providesTags: (_result, _error, table) => [
        { type: "Inquiry", id: `fks:${table}` },
      ],
    }),
  }),
});

export const {
  useGetNotesQuery,
  useLazyGetNotesQuery,
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
  useLazyGetTagNotesQuery,
  useRenameTagMutation,
  useDeleteTagMutation,
  useAddNoteTagMutation,
  useRemoveNoteTagMutation,
  useGetGraphQuery,
  useLazyGetGraphQuery,
  useGetGraphSubQuery,
  useGetFoldersQuery,
  useRenameFolderMutation,
  useDeleteFolderMutation,
  useUploadFileMutation,
  useGetUploadsQuery,
  useGetAllUploadsQuery,
  useDeleteUploadMutation,
  useGetCalendarDataQuery,
  useGetOutlookEventsQuery,
  useGetOutlookStatusQuery,
  useConfigureOutlookIcsUrlMutation,
  useClearOutlookConfigMutation,
  useGetDailyNotesQuery,
  useLazyGetDailyNotesQuery,
  useGetDailyStreakQuery,
  useGetNoteVersionsQuery,
  useGetNoteVersionQuery,
  useRestoreNoteVersionMutation,
  useGetCanvasesQuery,
  useGetCanvasQuery,
  useCreateCanvasMutation,
  useUpdateCanvasMutation,
  useDeleteCanvasMutation,
  useAddCanvasItemMutation,
  useUpdateCanvasItemMutation,
  useDeleteCanvasItemMutation,
  useAddCanvasEdgeMutation,
  useUpdateCanvasEdgeMutation,
  useDeleteCanvasEdgeMutation,
  useBatchUpdateCanvasMutation,
  useCreateCanvasGroupMutation,
  useDeleteCanvasGroupMutation,
  useGetCanvasGroupsQuery,
  useCreateCanvasVersionMutation,
  useDeleteCanvasVersionMutation,
  useGetCanvasVersionsQuery,
  useGetCanvasVersionQuery,
  useRestoreCanvasVersionMutation,
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useReorderGroupsMutation,
  useCreateColumnMutation,
  useUpdateColumnMutation,
  useDeleteColumnMutation,
  useReorderColumnsMutation,
  useCreateCardMutation,
  useUpdateCardMutation,
  useDeleteCardMutation,
  useMoveCardMutation,
  useReorderCardsMutation,
  useGetArtifactsQuery,
  useCreateArtifactMutation,
  useUpdateArtifactMutation,
  useDeleteArtifactMutation,
  useGetLabelsQuery,
  useCreateLabelMutation,
  useUpdateLabelMutation,
  useDeleteLabelMutation,
  useAddLabelToCardMutation,
  useRemoveLabelFromCardMutation,
  useGetChecklistQuery,
  useAddChecklistItemMutation,
  useUpdateChecklistItemMutation,
  useDeleteChecklistItemMutation,
  useGetCommentsQuery,
  useAddCommentMutation,
  useDeleteCommentMutation,
  useGetMilestonesQuery,
  useCreateMilestoneMutation,
  useUpdateMilestoneMutation,
  useDeleteMilestoneMutation,
  useToggleMilestoneMutation,
  useLinkCardsToMilestoneMutation,
  useUnlinkCardFromMilestoneMutation,
  useGetCardsForMilestoneQuery,
  useGetCardTemplatesQuery,
  useCreateCardTemplateMutation,
  useUpdateCardTemplateMutation,
  useDeleteCardTemplateMutation,
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useApplyTemplateMutation,
  useGetInquiryTablesQuery,
  useGetInquiryTableSchemaQuery,
  useGetInquiryTableRowsQuery,
  useLazyGetInquiryTableRowsQuery,
  useGetInquiryTableRowQuery,
  useLazyGetInquiryTableRowQuery,
  useGetInquiryTableForeignKeysQuery,
} = apiSlice;
