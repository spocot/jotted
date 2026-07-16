import { marked } from "marked";

// Post-process HTML from marked to convert task list syntax
// into the structure TipTap's TaskList/TaskItem extensions expect.
function postProcessTaskLists(html: string): string {
  // marked renders "- [ ] content" as:
  //   <li><input disabled="" type="checkbox"> content</li>  (no blank lines)
  //   <li><p><input disabled="" type="checkbox"> content</p></li>  (blank lines between items)
  // Remove the <p> wrapper first so the input regex matches both forms.
  let result = html.replace(
    /(<li>)<p>(<input [^>]+> .*?)<\/p>/g,
    "$1$2",
  );

  // Convert the <input> checkbox to TipTap's data attributes
  result = result
    .replace(
      /<li><input disabled="" type="checkbox"> /g,
      '<li data-type="taskItem" data-checked="false">',
    )
    .replace(
      /<li><input checked="" disabled="" type="checkbox"> /g,
      '<li data-type="taskItem" data-checked="true">',
    );

  // Mark <ul> as task list if it contains at least one task item
  result = result.replace(
    /(<ul>)([\s\S]*?<li data-type="taskItem")/g,
    '<ul data-type="taskList">$2',
  );

  return result;
}

// Pre-process markdown to HTML for TipTap consumption.
// Converts [[wikilinks]] → <span data-wikilink> and #tags → <span data-tag>
// Then converts remaining markdown to HTML via marked.
export function markdownToHtml(md: string): string {
  let html = md
    // Handle escaped \[\[wikilinks\]\] from previous serializer escaping
    .replace(/\\\[\\\[([^\]]+?)\\\]\\\]/g, '<span data-wikilink data-title="$1"></span>')
    // Preserve [[wikilinks]] as custom spans
    .replace(/\[\[([^\]]+?)\]\]/g, '<span data-wikilink data-title="$1"></span>')
    // Preserve #tags
    .replace(/(^|\s)(#[\w/-]+(?=[\s.,;:!?]|$))/gm, (_, before, tag) => `${before}<span data-tag data-name="${tag.slice(1)}">${tag}</span>`)
    // Preserve @mentions: [@name](mention:person-id)
    .replace(/\[@([^\]]+)\]\(mention:([^)]+)\)/g, '<span data-type="mention" data-person-id="$2" data-name="$1">@$1</span>');

  const result = marked.parse(html, { async: false });
  const output = typeof result === "string" ? result : "";

  return postProcessTaskLists(output);
}
