import { marked } from "marked";

// Pre-process markdown to HTML for TipTap consumption.
// Converts [[wikilinks]] → <span data-wikilink> and #tags → <span data-tag>
// Then converts remaining markdown to HTML via marked.
export function markdownToHtml(md: string): string {
  let html = md
    // Preserve [[wikilinks]] as custom spans
    .replace(/\[\[([^\]]+?)\]\]/g, '<span data-wikilink="$1"></span>')
    // Preserve #tags
    .replace(/(^|\s)(#[\w/-]+(?=[\s.,;:!?]|$))/gm, (_, before, tag) => `${before}<span data-tag data-name="${tag.slice(1)}">${tag}</span>`);

  const result = marked.parse(html, { async: false });
  return typeof result === "string" ? result : "";
}
