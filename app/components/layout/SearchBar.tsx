"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { navigationItems } from "./navigation";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function SearchBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    return navigationItems
      .filter((item) => [item.label, item.description, ...(item.keywords ?? [])].join(" ").toLowerCase().includes(normalized))
      .slice(0, 6);
  }, [query]);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  function navigate(href: string) {
    setQuery("");
    setFocused(false);
    router.push(href);
  }

  return (
    <form
      className="platform-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        if (matches[0]) navigate(matches[0].href);
      }}
    >
      <label htmlFor="mercury-search">
        <SearchIcon />
        <span className="platform-search-label">Search Mercury</span>
        <input
          ref={inputRef}
          id="mercury-search"
          type="search"
          value={query}
          placeholder="Search workers, operations, and settings"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="mercury-search-results"
          aria-expanded={focused && query.trim().length > 0}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        />
        <kbd aria-hidden="true">Ctrl K</kbd>
      </label>

      {focused && query.trim() ? (
        <div className="platform-search-results" id="mercury-search-results" role="listbox">
          {matches.length ? matches.map((item) => (
            <button key={item.href} type="button" role="option" onClick={() => navigate(item.href)}>
              <span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              <span aria-hidden="true">↗</span>
            </button>
          )) : (
            <p>No workspace destination matches “{query.trim()}”.</p>
          )}
        </div>
      ) : null}
    </form>
  );
}
