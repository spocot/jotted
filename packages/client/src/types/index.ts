export interface Note {
  id: string;
  title: string;
  content: string;
  path: string;
  noteType: string;
  meetingLocation: string | null;
  meetingStart: string | null;
  meetingEnd: string | null;
  icsUid: string | null;
  icsLastSynced: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteCreatePayload {
  title?: string;
  content?: string;
  path?: string;
  noteType?: string;
  meetingLocation?: string;
  meetingStart?: string;
  meetingEnd?: string;
}

export interface NoteUpdatePayload {
  title?: string;
  content?: string;
  path?: string;
  meetingLocation?: string;
  meetingStart?: string;
  meetingEnd?: string;
}

export interface EnrichedNote extends Note {
  tags: Tag[];
  backlinks: string[];
  outgoingLinks: Link[];
  people?: NotePerson[];
  icsOutOfDate?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  noteCount: number;
  source?: "content" | "manual";
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
  noteId?: string | null;
  noteTitle?: string | null;
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

export interface OutlookAttendee {
  name: string;
  email?: string;
  status: string;
}

export interface OutlookEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  isAllDay: boolean;
  organizer?: { name: string; email?: string };
  attendees?: OutlookAttendee[];
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

export interface Person {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
  noteCount?: number;
}

export interface NotePerson {
  noteId: string;
  personId: string;
  role: string;
  status: string | null;
  name: string;
  email: string | null;
}

export interface CreateNoteFromEventPayload {
  title: string;
  date: string;
  start?: string;
  end?: string;
  location?: string;
  organizer?: { name: string; email?: string };
  attendees?: { name: string; email?: string; status: string }[];
  icsUid?: string;
}

export interface StaleNoteInfo {
  icsUid: string;
  noteId: string;
  changes: string[];
}

export interface StaleResponse {
  stale: StaleNoteInfo[];
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
  type: "text_box" | "note_pin" | "image" | "rectangle" | "rounded_rectangle" | "circle" | "diamond" | "cylinder" | "cloud" | "hexagon" | "group";
  text: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  createdAt: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  lockAspectRatio?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  groupId?: string | null;
  childIds?: string[];
}

export interface CanvasVersion {
  id: string;
  canvasId: string;
  title: string;
  description: string;
  items: CanvasItem[];
  edges: CanvasEdge[];
  thumbnail?: string;
  createdAt: string;
}

export interface CanvasGroup {
  id: string;
  canvasId: string;
  label: string;
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
  completed: boolean;
  completedAt: string | null;
  position: number;
  createdAt: string;
}

export interface CardMilestoneLink {
  cardId: string;
  milestoneId: string;
  milestoneTitle: string;
  completed: boolean;
  dueDate: string | null;
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

export interface InquiryColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dfltValue: string | null;
  pk: number;
}

export type InquiryRow = Record<string, unknown>;

export interface InquiryForeignKey {
  id: number;
  table: string;
  from: string[];
  to: string[];
}

export interface DevStats {
  [table: string]: number;
}

export interface DevResetResponse {
  success: boolean;
  stats: DevStats;
}

export interface DevSeedConfig {
  notes?: number;
  projects?: number;
  people?: number;
  canvases?: number;
  uploads?: number;
  linkDensity?: number;
  versionCount?: number;
  tagPoolSize?: number;
}

export interface DevSeedResponse {
  success: boolean;
  created: Record<string, number>;
}

export interface SavedSearchQuery {
  q?: string;
  tag?: string;
  person?: string;
  personRole?: string;
  sort?: SortField;
  order?: SortOrder;
}

export interface SmartFolder {
  id: string;
  name: string;
  queryJson: SavedSearchQuery;
  createdAt: string;
  updatedAt: string;
}

export interface SmartFolderCreatePayload {
  name: string;
  queryJson?: string;
}

export interface AtlassianStatus {
  configured: boolean;
  unlocked: boolean;
  hasPassword: boolean;
  domain?: string;
  email?: string;
  user?: { user: string; displayName: string } | null;
  connectionError?: string | null;
}

export interface JiraIssueInfo {
  key: string;
  summary: string;
  status: string;
  statusColor: string;
  assignee: string;
  priority: string;
  priorityIcon: string;
  issueType: string;
  issueTypeIcon: string;
  url: string;
}

export interface ConfluencePageInfo {
  pageId: string;
  title: string;
  spaceKey: string;
  spaceName: string;
  url: string;
}

export interface IntegrationLink {
  id: string;
  entityType: string;
  entityId: string;
  integrationType: string;
  externalId: string;
  externalUrl: string;
  title: string | null;
  metaJson: string | null;
  syncedAt: string | null;
  createdAt: string;
}

export interface IntegrationLinkCreatePayload {
  entityType: string;
  entityId: string;
  integrationType: string;
  externalId: string;
}
