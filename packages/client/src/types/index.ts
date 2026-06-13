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
