export interface Note {
  id: string;
  title: string;
  content: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteCreatePayload {
  title?: string;
  content?: string;
  path?: string;
}

export interface NoteUpdatePayload {
  title?: string;
  content?: string;
  path?: string;
}

export interface EnrichedNote extends Note {
  tags: Tag[];
  backlinks: string[];
  outgoingLinks: Link[];
}

export interface Tag {
  id: string;
  name: string;
  noteCount: number;
}

export interface Link {
  sourceId: string;
  targetId: string;
}

export interface GraphNode {
  id: string;
  title: string;
  path: string;
  tags: string[];
}

export interface GraphData {
  nodes: GraphNode[];
  links: Link[];
}

export interface SearchSuggestion {
  id: string;
  title: string;
}

export interface FolderNode {
  name: string;
  path: string;
  noteCount: number;
  children: FolderNode[];
}

export interface Upload {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

export type SortField = "relevance" | "updatedAt" | "title" | "createdAt";
export type SortOrder = "ASC" | "DESC";

export interface PageResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

export interface NoteListParams {
  folder?: string;
  tag?: string;
  sort?: SortField;
  order?: SortOrder;
  limit?: number;
  offset?: number;
}

export interface SearchOptions {
  tag?: string;
  sort?: SortField;
  order?: SortOrder;
  limit?: number;
  offset?: number;
}

export interface CalendarDayItem {
  id: string;
  title: string;
  path: string;
}

export interface CalendarDay {
  date: string;
  created: CalendarDayItem[];
  modified: CalendarDayItem[];
  dailyNoteId: string | null;
}

export interface CalendarData {
  year: number;
  month: number;
  days: CalendarDay[];
}

export interface OutlookEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  isAllDay: boolean;
}

export interface OutlookResponse {
  events: OutlookEvent[];
  method: "ics" | "none";
  available: boolean;
  message?: string;
  needsConfig?: boolean;
}

export interface OutlookStatus {
  method: "ics" | "none";
  hasIcsUrl: boolean;
  icsUrl?: string;
}

export interface StreakInfo {
  streak: number;
}

export interface NoteVersion {
  id: string;
  noteId: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Canvas {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasItem {
  id: string;
  canvasId: string;
  noteId: string | null;
  type: "text_box" | "note_pin" | "image" | "rectangle" | "rounded_rectangle" | "circle" | "diamond" | "cylinder" | "cloud" | "hexagon";
  text: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  createdAt: string;
}

export interface CanvasEdge {
  id: string;
  canvasId: string;
  sourceItemId: string;
  targetItemId: string;
  type: "straight" | "curved";
  label?: string;
  edgeStyle?: "solid" | "dashed" | "dotted";
  arrowStart?: number;
  arrowEnd?: number;
  createdAt: string;
}

export interface CanvasWithDetails extends Canvas {
  items: CanvasItem[];
  edges: CanvasEdge[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectGroup {
  id: string;
  projectId: string;
  title: string;
  description: string;
  position: number;
  createdAt: string;
}

export interface ProjectColumn {
  id: string;
  groupId: string;
  title: string;
  color: string;
  position: number;
  createdAt: string;
}

export interface ProjectCard {
  id: string;
  columnId: string;
  title: string;
  description: string;
  noteId: string | null;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  labels?: ProjectLabel[];
  checklist?: ProjectChecklistItem[];
  commentCount?: number;
}

export interface ProjectLabel {
  id: string;
  projectId: string;
  name: string;
  color: string;
  position: number;
  createdAt: string;
}

export interface ProjectChecklistItem {
  id: string;
  cardId: string;
  text: string;
  position: number;
  done: boolean;
  createdAt: string;
}

export interface ProjectCardComment {
  id: string;
  cardId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  dueDate: string | null;
  position: number;
  createdAt: string;
}

export interface ProjectCardTemplate {
  id: string;
  projectId: string;
  title: string;
  description: string;
  defaultLabels: string[];
  defaultChecklist: string[];
  position: number;
  createdAt: string;
}

export interface ProjectArtifact {
  id: string;
  projectId: string;
  groupId: string | null;
  title: string;
  description: string;
  artifactType: string;
  referenceId: string | null;
  referenceUrl: string | null;
  position: number;
  createdAt: string;
}

export interface ProjectWithDetails extends Project {
  groups: Array<
    ProjectGroup & {
      columns: Array<ProjectColumn & {
        cards: Array<ProjectCard & {
          labels: ProjectLabel[];
          checklist: ProjectChecklistItem[];
          commentCount: number;
        }>;
      }>;
      artifacts: ProjectArtifact[];
    }
  >;
  globalArtifacts: ProjectArtifact[];
}

export interface Template {
  id: string;
  type: "note" | "project";
  name: string;
  description: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteTemplateContent {
  title: string;
  body: string;
  tags: string[];
  folder: string;
}

export interface ProjectTemplateGroupColumn {
  name: string;
  color: string;
}

export interface ProjectTemplateGroup {
  name: string;
  columns: ProjectTemplateGroupColumn[];
  artifacts: Array<{ name: string; type: string }>;
}

export interface ProjectTemplateContent {
  groups: ProjectTemplateGroup[];
}
