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

export interface SearchOptions {
  tag?: string;
  sort?: SortField;
  order?: SortOrder;
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
