import { useState, useEffect, useMemo, useCallback } from "react";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useSearchParams } from "react-router-dom";
import { useLazySearchNotesQuery, useGetTagsQuery } from "../store/redux/api";
import type { Note, SortField, SortOrder } from "../types";
import { NoteListSkeleton } from "../components/Skeleton";
import NoteCard from "../components/NoteCard";
import TagPill from "../components/TagPill";

const SNIPPET_WORDS = 30;
const PAGE_SIZE = 20;

function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  let result = text;
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    result = result.replace(regex, "%%HL%%$1%%/HL%%");
  }
  return result;
}

function buildSnippet(content: string, query: string): string {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return content.slice(0, 200);

  const lower = content.toLowerCase();
  let bestIdx = -1;
  let bestScore = 0;

  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx >= 0) {
      const score = term.length;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    }
  }

  if (bestIdx < 0) return content.slice(0, 200);

  const words = content.split(/\s+/);
  const beforeWords = content.slice(0, bestIdx).split(/\s+/).length;
  const start = Math.max(0, beforeWords - Math.floor(SNIPPET_WORDS / 2));
  const snippet = words.slice(start, start + SNIPPET_WORDS).join(" ");

  if (start > 0) return `...${highlightText(snippet, query)}...`;
  return highlightText(snippet, query);
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get("q") ?? "";
  const tagParam = searchParams.get("tag") ?? "";
  const sortParam: SortField = (searchParams.get("sort") ?? "relevance") as SortField;
  const orderParam: SortOrder = (searchParams.get("order") ?? "DESC") as SortOrder;

  const [query, setQuery] = useState(qParam);
  const [results, setResults] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const { data: tags = [] } = useGetTagsQuery();
  const [searchNotes] = useLazySearchNotesQuery();

  // Auto-search on mount if q param present
  useEffect(() => {
    if (qParam) {
      doSearch(qParam, tagParam, sortParam, orderParam, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = async (
    q: string,
    tag?: string,
    sort?: SortField,
    order?: SortOrder,
    offsetVal = 0,
    append = false,
  ) => {
    if (!q.trim()) return;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setSearched(true);
    try {
      const data = await searchNotes({ q: q.trim(), tag, sort, order, limit: PAGE_SIZE, offset: offsetVal }).unwrap();
      if (append) {
        setResults((prev) => [...prev, ...data.items]);
      } else {
        setResults(data.items);
        setOffset(0);
      }
      setHasMore(data.hasMore);
      setOffset(offsetVal);
    } catch {
      if (!append) setResults([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const params: Record<string, string> = { q: query.trim() };
    if (tagParam) params.tag = tagParam;
    if (sortParam !== "relevance") params.sort = sortParam;
    if (orderParam !== "DESC") params.order = orderParam;
    setSearchParams(params);
    doSearch(query.trim(), tagParam, sortParam, orderParam, 0);
  };

  const handleTagFilter = (tagName: string) => {
    const nextTag = tagParam === tagName ? "" : tagName;
    const params: Record<string, string> = { q: query.trim() || qParam };
    if (nextTag) params.tag = nextTag;
    if (sortParam !== "relevance") params.sort = sortParam;
    if (orderParam !== "DESC") params.order = orderParam;
    setSearchParams(params);
    doSearch(query.trim() || qParam, nextTag, sortParam, orderParam, 0);
  };

  const handleSortChange = (sort: SortField) => {
    const params: Record<string, string> = { q: query.trim() || qParam };
    if (tagParam) params.tag = tagParam;
    if (sort !== "relevance") params.sort = sort;
    if (orderParam !== "DESC") params.order = orderParam;
    setSearchParams(params);
    doSearch(query.trim() || qParam, tagParam, sort, orderParam, 0);
  };

  const toggleOrder = () => {
    const nextOrder = orderParam === "DESC" ? "ASC" : "DESC";
    const params: Record<string, string> = { q: query.trim() || qParam };
    if (tagParam) params.tag = tagParam;
    if (sortParam !== "relevance") params.sort = sortParam;
    if (nextOrder !== "DESC") params.order = nextOrder;
    setSearchParams(params);
    doSearch(query.trim() || qParam, tagParam, sortParam, nextOrder, 0);
  };

  const loadMore = useCallback(() => {
    const q = query.trim() || qParam;
    doSearch(q, tagParam, sortParam, orderParam, offset + PAGE_SIZE, true);
  }, [query, qParam, tagParam, sortParam, orderParam, offset]);

  const activeQuery = query || qParam;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Search</h2>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes... (Ctrl+Shift+F)"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm outline-none focus:border-blue-400 dark:focus:border-blue-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Tag filter */}
        <div className="flex flex-wrap gap-1">
          {tags.length > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500 mr-1 self-center">
              Tag:
            </span>
          )}
          {tags.map((tag) => (
            <TagPill
              key={tag.id}
              name={tag.name}
              active={tagParam === tag.name}
              onClick={() => handleTagFilter(tag.name)}
            />
          ))}
          {tagParam && (
            <button
              onClick={() => handleTagFilter("")}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-gray-400 dark:text-gray-500">Sort:</span>
          <select
            value={sortParam}
            onChange={(e) => handleSortChange(e.target.value as SortField)}
            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none"
          >
            <option value="relevance">Relevance</option>
            <option value="updatedAt">Updated</option>
            <option value="createdAt">Created</option>
            <option value="title">Title</option>
          </select>
          <button
            onClick={toggleOrder}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={orderParam === "DESC" ? "Descending" : "Ascending"}
          >
            {orderParam === "DESC" ? (
              <IconChevronDown className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <IconChevronUp className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {loading && <NoteListSkeleton />}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          No results found for "{activeQuery}"
          {tagParam && ` with tag #${tagParam}`}
        </div>
      )}

      <div className="grid gap-3">
        {results.map((note) => (
          <SearchResultItem
            key={note.id}
            note={note}
            query={activeQuery}
          />
        ))}
      </div>

      {hasMore && !loading && (
        <div className="text-center py-4">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors disabled:opacity-50"
          >
            {loadingMore ? "Loading..." : "Load more results"}
          </button>
        </div>
      )}
    </div>
  );
}

function SearchResultItem({ note, query }: { note: Note; query: string }) {
  const snippetHtml = useMemo(
    () => buildSnippet(note.content, query),
    [note.content, query],
  );

  return (
    <NoteCard
      note={note}
      title={<HighlightedText text={note.title || "Untitled"} query={query} />}
      content={<SnippetRenderer html={snippetHtml} />}
      footer={
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
          {new Date(note.updatedAt).toLocaleDateString()}
        </div>
      }
    />
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return <>{text}</>;

  const combined = terms.join("|");
  const regex = new RegExp(`(${combined})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        terms.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function SnippetRenderer({ html }: { html: string }) {
  const parts = html.split(/(%%HL%%[\s\S]*?%%\/HL%%%)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("%%HL%%")) {
          const inner = part.replace("%%HL%%", "").replace("%%/HL%%%", "").replace("%%/HL%%", "");
          return (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
              {inner}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
