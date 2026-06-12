import { marked } from "marked";

// Pre-process markdown to HTML for TipTap consumption.
// Converts [[wikilinks]] → <span data-wikilink> and #tags → <span data-tag>
// Then converts remaining markdown to HTML via marked.
export function markdownToHtml(md: string): string {
  let html = md
    // Preserve [[wikilinks]] as custom spans
    .replace(/\[\[([^\]]+?)\]\]/g, '<span data-wikilink="$1"></span>')
    // Preserve #tags
    .replace(/(^|\s)(#[\w/-]+(?=[\s.,;:!?]|$))/gm, '$1<span data-tag="$2">$2</span>');

  const result = marked.parse(html, { async: false });
  return typeof result === "string" ? result : "";
}
