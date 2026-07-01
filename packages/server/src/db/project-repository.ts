import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";

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
      columns: Array<ProjectColumn & { cards: ProjectCard[] }>;
      artifacts: ProjectArtifact[];
    }
  >;
  globalArtifacts: ProjectArtifact[];
}

export class ProjectRepository {
  private insertProjectStmt: Database.Statement;
  private updateProjectStmt: Database.Statement;
  private deleteProjectStmt: Database.Statement;
  private getProjectByIdStmt: Database.Statement;
  private listProjectsStmt: Database.Statement;

  private insertGroupStmt: Database.Statement;
  private updateGroupStmt: Database.Statement;
  private deleteGroupStmt: Database.Statement;
  private getGroupsByProjectStmt: Database.Statement;
  private getGroupByIdStmt: Database.Statement;

  private insertColumnStmt: Database.Statement;
  private updateColumnStmt: Database.Statement;
  private deleteColumnStmt: Database.Statement;
  private getColumnsByGroupStmt: Database.Statement;
  private getColumnByIdStmt: Database.Statement;

  private insertCardStmt: Database.Statement;
  private updateCardStmt: Database.Statement;
  private deleteCardStmt: Database.Statement;
  private getCardsByColumnStmt: Database.Statement;
  private getCardByIdStmt: Database.Statement;
  private getCardsByGroupStmt: Database.Statement;

  private insertArtifactStmt: Database.Statement;
  private updateArtifactStmt: Database.Statement;
  private deleteArtifactStmt: Database.Statement;
  private getArtifactsByProjectStmt: Database.Statement;
  private getArtifactsByGroupStmt: Database.Statement;
  private getArtifactByIdStmt: Database.Statement;

  constructor(public db: Database.Database) {
    this.insertProjectStmt = db.prepare(
      "INSERT INTO projects (id, title, description, status, start_date, end_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    this.updateProjectStmt = db.prepare(
      "UPDATE projects SET title = ?, description = ?, status = ?, start_date = ?, end_date = ?, updated_at = ? WHERE id = ?",
    );
    this.deleteProjectStmt = db.prepare("DELETE FROM projects WHERE id = ?");
    this.getProjectByIdStmt = db.prepare(
      "SELECT id, title, description, status, start_date AS startDate, end_date AS endDate, created_at AS createdAt, updated_at AS updatedAt FROM projects WHERE id = ?",
    );
    this.listProjectsStmt = db.prepare(
      "SELECT id, title, description, status, start_date AS startDate, end_date AS endDate, created_at AS createdAt, updated_at AS updatedAt FROM projects ORDER BY updated_at DESC",
    );

    this.insertGroupStmt = db.prepare(
      "INSERT INTO project_groups (id, project_id, title, description, position, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    this.updateGroupStmt = db.prepare(
      "UPDATE project_groups SET title = ?, description = ? WHERE id = ? AND project_id = ?",
    );
    this.deleteGroupStmt = db.prepare(
      "DELETE FROM project_groups WHERE id = ? AND project_id = ?",
    );
    this.getGroupsByProjectStmt = db.prepare(
      "SELECT id, project_id AS projectId, title, description, position, created_at AS createdAt FROM project_groups WHERE project_id = ? ORDER BY position ASC",
    );
    this.getGroupByIdStmt = db.prepare(
      "SELECT id, project_id AS projectId, title, description, position, created_at AS createdAt FROM project_groups WHERE id = ?",
    );

    this.insertColumnStmt = db.prepare(
      "INSERT INTO project_columns (id, group_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)",
    );
    this.updateColumnStmt = db.prepare(
      "UPDATE project_columns SET title = ? WHERE id = ? AND group_id = ?",
    );
    this.deleteColumnStmt = db.prepare(
      "DELETE FROM project_columns WHERE id = ? AND group_id = ?",
    );
    this.getColumnsByGroupStmt = db.prepare(
      "SELECT id, group_id AS groupId, title, position, created_at AS createdAt FROM project_columns WHERE group_id = ? ORDER BY position ASC",
    );
    this.getColumnByIdStmt = db.prepare(
      "SELECT id, group_id AS groupId, title, position, created_at AS createdAt FROM project_columns WHERE id = ?",
    );

    this.insertCardStmt = db.prepare(
      "INSERT INTO project_cards (id, column_id, title, description, note_id, due_date, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    this.updateCardStmt = db.prepare(
      "UPDATE project_cards SET title = ?, description = ?, note_id = ?, due_date = ?, position = ?, updated_at = ? WHERE id = ?",
    );
    this.deleteCardStmt = db.prepare("DELETE FROM project_cards WHERE id = ?");
    this.getCardsByColumnStmt = db.prepare(
      "SELECT id, column_id AS columnId, title, description, note_id AS noteId, due_date AS dueDate, position, created_at AS createdAt, updated_at AS updatedAt FROM project_cards WHERE column_id = ? ORDER BY position ASC",
    );
    this.getCardByIdStmt = db.prepare(
      "SELECT id, column_id AS columnId, title, description, note_id AS noteId, due_date AS dueDate, position, created_at AS createdAt, updated_at AS updatedAt FROM project_cards WHERE id = ?",
    );
    this.getCardsByGroupStmt = db.prepare(
      "SELECT pc.id, pc.column_id AS columnId, pc.title, pc.description, pc.note_id AS noteId, pc.due_date AS dueDate, pc.position, pc.created_at AS createdAt, pc.updated_at AS updatedAt FROM project_cards pc JOIN project_columns pc2 ON pc.column_id = pc2.id WHERE pc2.group_id = ? ORDER BY pc.position ASC",
    );

    this.insertArtifactStmt = db.prepare(
      "INSERT INTO project_artifacts (id, project_id, group_id, title, description, artifact_type, reference_id, reference_url, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    this.updateArtifactStmt = db.prepare(
      "UPDATE project_artifacts SET title = ?, description = ?, artifact_type = ?, reference_id = ?, reference_url = ? WHERE id = ? AND project_id = ?",
    );
    this.deleteArtifactStmt = db.prepare(
      "DELETE FROM project_artifacts WHERE id = ? AND project_id = ?",
    );
    this.getArtifactsByProjectStmt = db.prepare(
      "SELECT id, project_id AS projectId, group_id AS groupId, title, description, artifact_type AS artifactType, reference_id AS referenceId, reference_url AS referenceUrl, position, created_at AS createdAt FROM project_artifacts WHERE project_id = ? AND group_id IS NULL ORDER BY position ASC",
    );
    this.getArtifactsByGroupStmt = db.prepare(
      "SELECT id, project_id AS projectId, group_id AS groupId, title, description, artifact_type AS artifactType, reference_id AS referenceId, reference_url AS referenceUrl, position, created_at AS createdAt FROM project_artifacts WHERE group_id = ? ORDER BY position ASC",
    );
    this.getArtifactByIdStmt = db.prepare(
      "SELECT id, project_id AS projectId, group_id AS groupId, title, description, artifact_type AS artifactType, reference_id AS referenceId, reference_url AS referenceUrl, position, created_at AS createdAt FROM project_artifacts WHERE id = ?",
    );
  }

  // ---- Project CRUD ----

  list(): Project[] {
    return this.listProjectsStmt.all() as Project[];
  }

  getById(id: string): Project | null {
    return (this.getProjectByIdStmt.get(id) as Project | undefined) ?? null;
  }

  create(params?: {
    title?: string;
    description?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Project {
    const id = uuid();
    const now = new Date().toISOString();
    this.insertProjectStmt.run(
      id,
      params?.title ?? "Untitled Project",
      params?.description ?? "",
      params?.status ?? "planning",
      params?.startDate ?? null,
      params?.endDate ?? null,
      now,
      now,
    );
    return this.getById(id)!;
  }

  update(
    id: string,
    params: {
      title?: string;
      description?: string;
      status?: string;
      startDate?: string | null;
      endDate?: string | null;
    },
  ): Project | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    this.updateProjectStmt.run(
      params.title ?? existing.title,
      params.description ?? existing.description,
      params.status ?? existing.status,
      params.startDate !== undefined ? params.startDate : existing.startDate,
      params.endDate !== undefined ? params.endDate : existing.endDate,
      now,
      id,
    );
    return this.getById(id)!;
  }

  delete(id: string): boolean {
    const existing = this.getById(id);
    if (!existing) return false;
    this.deleteProjectStmt.run(id);
    return true;
  }

  getWithDetails(id: string): ProjectWithDetails | null {
    const project = this.getById(id);
    if (!project) return null;
    const groups = this.getGroupsByProjectStmt.all(id) as Array<
      ProjectGroup & { columns: Array<ProjectColumn & { cards: ProjectCard[] }>; artifacts: ProjectArtifact[] }
    >;
    for (const group of groups) {
      const columns = this.getColumnsByGroupStmt.all(group.id) as Array<
        ProjectColumn & { cards: ProjectCard[] }
      >;
      for (const col of columns) {
        col.cards = this.getCardsByColumnStmt.all(col.id) as ProjectCard[];
      }
      group.columns = columns;
      group.artifacts = this.getArtifactsByGroupStmt.all(group.id) as ProjectArtifact[];
    }
    const globalArtifacts = this.getArtifactsByProjectStmt.all(id) as ProjectArtifact[];
    return { ...project, groups, globalArtifacts };
  }

  // ---- Group CRUD ----

  getGroups(projectId: string): ProjectGroup[] {
    return this.getGroupsByProjectStmt.all(projectId) as ProjectGroup[];
  }

  createGroup(
    projectId: string,
    params: { title?: string; description?: string },
  ): ProjectGroup | null {
    const project = this.getById(projectId);
    if (!project) return null;
    const id = uuid();
    const now = new Date().toISOString();
    const groups = this.getGroups(projectId);
    const position = groups.length;
    this.insertGroupStmt.run(
      id,
      projectId,
      params.title ?? "New Group",
      params.description ?? "",
      position,
      now,
    );
    return this.getGroupByIdStmt.get(id) as ProjectGroup | null;
  }

  updateGroup(
    projectId: string,
    groupId: string,
    params: { title?: string; description?: string },
  ): ProjectGroup | null {
    const existing = this.getGroupByIdStmt.get(groupId) as
      | ProjectGroup
      | undefined;
    if (!existing || existing.projectId !== projectId) return null;
    this.updateGroupStmt.run(
      params.title ?? existing.title,
      params.description ?? existing.description,
      groupId,
      projectId,
    );
    return this.getGroupByIdStmt.get(groupId) as ProjectGroup | null;
  }

  deleteGroup(projectId: string, groupId: string): boolean {
    const existing = this.getGroupByIdStmt.get(groupId) as
      | ProjectGroup
      | undefined;
    if (!existing || existing.projectId !== projectId) return false;
    this.deleteGroupStmt.run(groupId, projectId);
    return true;
  }

  reorderGroups(
    projectId: string,
    orderedIds: string[],
  ): ProjectGroup[] {
    const update = this.db.prepare(
      "UPDATE project_groups SET position = ? WHERE id = ? AND project_id = ?",
    );
    const transaction = this.db.transaction(() => {
      for (let i = 0; i < orderedIds.length; i++) {
        update.run(i, orderedIds[i], projectId);
      }
    });
    transaction();
    return this.getGroups(projectId);
  }

  // ---- Column CRUD ----

  getColumns(groupId: string): ProjectColumn[] {
    return this.getColumnsByGroupStmt.all(groupId) as ProjectColumn[];
  }

  createColumn(
    groupId: string,
    params: { title?: string },
  ): ProjectColumn | null {
    const id = uuid();
    const now = new Date().toISOString();
    const columns = this.getColumns(groupId);
    const position = columns.length;
    this.insertColumnStmt.run(id, groupId, params.title ?? "New Column", position, now);
    return this.getColumnByIdStmt.get(id) as ProjectColumn | null;
  }

  updateColumn(
    groupId: string,
    columnId: string,
    params: { title?: string },
  ): ProjectColumn | null {
    const existing = this.getColumnByIdStmt.get(columnId) as
      | ProjectColumn
      | undefined;
    if (!existing || existing.groupId !== groupId) return null;
    this.updateColumnStmt.run(
      params.title ?? existing.title,
      columnId,
      groupId,
    );
    return this.getColumnByIdStmt.get(columnId) as ProjectColumn | null;
  }

  deleteColumn(groupId: string, columnId: string): boolean {
    const existing = this.getColumnByIdStmt.get(columnId) as
      | ProjectColumn
      | undefined;
    if (!existing || existing.groupId !== groupId) return false;
    this.deleteColumnStmt.run(columnId, groupId);
    return true;
  }

  reorderColumns(
    groupId: string,
    orderedIds: string[],
  ): ProjectColumn[] {
    const update = this.db.prepare(
      "UPDATE project_columns SET position = ? WHERE id = ? AND group_id = ?",
    );
    const transaction = this.db.transaction(() => {
      for (let i = 0; i < orderedIds.length; i++) {
        update.run(i, orderedIds[i], groupId);
      }
    });
    transaction();
    return this.getColumns(groupId);
  }

  // ---- Card CRUD ----

  getCards(columnId: string): ProjectCard[] {
    return this.getCardsByColumnStmt.all(columnId) as ProjectCard[];
  }

  getGroupCards(groupId: string): ProjectCard[] {
    return this.getCardsByGroupStmt.all(groupId) as ProjectCard[];
  }

  createCard(
    columnId: string,
    params: {
      title?: string;
      description?: string;
      noteId?: string;
      dueDate?: string;
    },
  ): ProjectCard | null {
    const id = uuid();
    const now = new Date().toISOString();
    const cards = this.getCards(columnId);
    const position = cards.length;
    this.insertCardStmt.run(
      id,
      columnId,
      params.title ?? "Untitled",
      params.description ?? "",
      params.noteId ?? null,
      params.dueDate ?? null,
      position,
      now,
      now,
    );
    return this.getCardByIdStmt.get(id) as ProjectCard | null;
  }

  updateCard(
    cardId: string,
    params: {
      title?: string;
      description?: string;
      noteId?: string | null;
      dueDate?: string | null;
    },
  ): ProjectCard | null {
    const existing = this.getCardByIdStmt.get(cardId) as
      | ProjectCard
      | undefined;
    if (!existing) return null;
    const now = new Date().toISOString();
    this.updateCardStmt.run(
      params.title ?? existing.title,
      params.description ?? existing.description,
      params.noteId !== undefined ? params.noteId : existing.noteId,
      params.dueDate !== undefined ? params.dueDate : existing.dueDate,
      existing.position,
      now,
      cardId,
    );
    return this.getCardByIdStmt.get(cardId) as ProjectCard | null;
  }

  deleteCard(cardId: string): boolean {
    const existing = this.getCardByIdStmt.get(cardId) as
      | ProjectCard
      | undefined;
    if (!existing) return false;
    this.deleteCardStmt.run(cardId);
    return true;
  }

  moveCard(
    cardId: string,
    targetColumnId: string,
    targetPosition?: number,
  ): ProjectCard | null {
    const existing = this.getCardByIdStmt.get(cardId) as
      | ProjectCard
      | undefined;
    if (!existing) return null;
    const now = new Date().toISOString();
    const cards = this.getCards(targetColumnId);
    const position =
      targetPosition !== undefined ? targetPosition : cards.length;
    this.updateCardStmt.run(
      existing.title,
      existing.description,
      existing.noteId,
      existing.dueDate,
      position,
      now,
      cardId,
    );
    // Also update column_id by direct SQL since updateCardStmt doesn't touch it
    this.db
      .prepare("UPDATE project_cards SET column_id = ? WHERE id = ?")
      .run(targetColumnId, cardId);
    return this.getCardByIdStmt.get(cardId) as ProjectCard | null;
  }

  reorderCards(columnId: string, orderedIds: string[]): ProjectCard[] {
    const update = this.db.prepare(
      "UPDATE project_cards SET position = ? WHERE id = ? AND column_id = ?",
    );
    const transaction = this.db.transaction(() => {
      for (let i = 0; i < orderedIds.length; i++) {
        update.run(i, orderedIds[i], columnId);
      }
    });
    transaction();
    return this.getCards(columnId);
  }

  // ---- Artifact CRUD ----

  getGlobalArtifacts(projectId: string): ProjectArtifact[] {
    return this.getArtifactsByProjectStmt.all(projectId) as ProjectArtifact[];
  }

  getGroupArtifacts(groupId: string): ProjectArtifact[] {
    return this.getArtifactsByGroupStmt.all(groupId) as ProjectArtifact[];
  }

  createArtifact(
    projectId: string,
    params: {
      groupId?: string | null;
      title?: string;
      description?: string;
      artifactType?: string;
      referenceId?: string;
      referenceUrl?: string;
    },
  ): ProjectArtifact | null {
    const project = this.getById(projectId);
    if (!project) return null;
    const id = uuid();
    const now = new Date().toISOString();
    const artifacts = params.groupId
      ? this.getGroupArtifacts(params.groupId)
      : this.getGlobalArtifacts(projectId);
    const position = artifacts.length;
    this.insertArtifactStmt.run(
      id,
      projectId,
      params.groupId ?? null,
      params.title ?? "",
      params.description ?? "",
      params.artifactType ?? "note",
      params.referenceId ?? null,
      params.referenceUrl ?? null,
      position,
      now,
    );
    return this.getArtifactByIdStmt.get(id) as ProjectArtifact | null;
  }

  updateArtifact(
    projectId: string,
    artifactId: string,
    params: {
      title?: string;
      description?: string;
      artifactType?: string;
      referenceId?: string | null;
      referenceUrl?: string | null;
    },
  ): ProjectArtifact | null {
    const existing = this.getArtifactByIdStmt.get(artifactId) as
      | ProjectArtifact
      | undefined;
    if (!existing || existing.projectId !== projectId) return null;
    this.updateArtifactStmt.run(
      params.title ?? existing.title,
      params.description ?? existing.description,
      params.artifactType ?? existing.artifactType,
      params.referenceId !== undefined
        ? params.referenceId
        : existing.referenceId,
      params.referenceUrl !== undefined
        ? params.referenceUrl
        : existing.referenceUrl,
      artifactId,
      projectId,
    );
    return this.getArtifactByIdStmt.get(artifactId) as ProjectArtifact | null;
  }

  deleteArtifact(projectId: string, artifactId: string): boolean {
    const existing = this.getArtifactByIdStmt.get(artifactId) as
      | ProjectArtifact
      | undefined;
    if (!existing || existing.projectId !== projectId) return false;
    this.deleteArtifactStmt.run(artifactId, projectId);
    return true;
  }
}
