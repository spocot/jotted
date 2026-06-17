import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLazySearchSuggestQuery } from "../store/redux/api";
import type { SearchSuggestion } from "../types";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [searchSuggest] = useLazySearchSuggestQuery();

  useEffect(() => {
    if (query.trim().length === 0) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await searchSuggest(query).unwrap();
        setSuggestions(data ?? []);
      } catch {
        // ignore
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSuggestions([]);
    setFocused(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSuggestionClick = (s: SearchSuggestion) => {
    setSuggestions([]);
    setFocused(false);
    navigate(`/note/${s.id}`);
  };

  const showDropdown = focused && suggestions.length > 0 && query.trim().length > 0;

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search notes..."
          className="w-48 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500"
        />
      </form>
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onMouseDown={() => handleSuggestionClick(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              {s.title || "Untitled"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
