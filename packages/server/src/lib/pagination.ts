export interface PageRequest {
  limit: number;
  offset: number;
}

export interface PageResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

export function buildPageResponse<T>(
  items: T[],
  total: number,
  limit: number,
  offset: number,
): PageResponse<T> {
  return {
    items: items.slice(0, limit),
    total,
    hasMore: offset + limit < total,
  };
}

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;
export const SEARCH_DEFAULT_LIMIT = 20;
export const SEARCH_MAX_LIMIT = 100;
export const BACKLINK_DEFAULT_LIMIT = 20;
export const GRAPH_DEFAULT_LIMIT = 200;
export const GRAPH_MAX_LIMIT = 500;

export function clampLimit(value: unknown, defaultVal: number, maxVal: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return defaultVal;
  return Math.min(n, maxVal);
}

export function parseOrder(value: unknown): "ASC" | "DESC" {
  if (typeof value === "string") {
    const upper = value.toUpperCase();
    if (upper === "ASC" || upper === "DESC") return upper;
  }
  return "DESC";
}

export type SortField = "updatedAt" | "title" | "createdAt";

export function parseSort(value: unknown): SortField | null {
  if (typeof value === "string") {
    if (value === "updatedAt" || value === "title" || value === "createdAt") {
      return value;
    }
  }
  return null;
}
