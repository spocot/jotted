import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Note, SearchSuggestion } from "../types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Note[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (query.trim().length === 0) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await api.searchSuggest(query);
        setSuggestions(data);
      } catch {
        // ignore
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.searchNotes(query);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setSuggestions([]);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Search</h2>

      <form onSubmit={handleSearch} className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
          autoFocus
        />
        {suggestions.length > 0 && query.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSuggestionClick(s.title)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {s.title}
              </button>
            ))}
          </div>
        )}
      </form>

      {loading && <div className="text-gray-400">Searching...</div>}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          No results found for "{query}"
        </div>
      )}

      <div className="grid gap-2">
        {results.map((note) => (
          <Link
            key={note.id}
            to={`/note/${note.id}`}
            className="block p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {note.title || "Untitled"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {note.content || "No content"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
