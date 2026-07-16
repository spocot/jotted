import { marked } from "marked";

const CALLOUT_BODY_RE = /^> \[!(\w+)\](?: (.+?))?(?:\r?\n)((?:^> .*(?:\r?\n|$))*)/gm;

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function applyInlinePreprocessing(md: string): string {
  return md
    .replace(/\\\[\\\[([^\]]+?)\\\]\\\]/g, '<span data-wikilink data-title="$1"></span>')
    .replace(/\[\[([^\]]+?)\]\]/g, '<span data-wikilink data-title="$1"></span>')
    .replace(/(^|\s)(#[\w/-]+(?=[\s.,;:!?]|$))/gm,
      (_, before, tag) => `${before}<span data-tag data-name="${tag.slice(1)}">${tag}</span>`)
    .replace(/\[@([^\]]+)\]\(mention:([^)]+)\)/g,
      '<span data-type="mention" data-person-id="$2" data-name="$1">@$1</span>');
}

function applyMarkdownToHtml(md: string): string {
  const html = applyInlinePreprocessing(md);
  const result = marked.parse(html, { async: false });
  return typeof result === "string" ? result : "";
}

function postProcessTaskLists(html: string): string {
  let result = html.replace(
    /(<li>)<p>(<input [^>]+> .*?)<\/p>/g,
    "$1$2",
  );

  result = result
    .replace(
      /<li><input disabled="" type="checkbox"> /g,
      '<li data-type="taskItem" data-checked="false">',
    )
    .replace(
      /<li><input checked="" disabled="" type="checkbox"> /g,
      '<li data-type="taskItem" data-checked="true">',
    );

  result = result.replace(
    /(<ul>)([\s\S]*?<li data-type="taskItem")/g,
    '<ul data-type="taskList">$2',
  );

  return result;
}

export function markdownToHtml(md: string): string {
  let calloutIndex = 0;
  const callouts: { type: string; title: string; bodyMd: string }[] = [];

  let processed = md.replace(CALLOUT_BODY_RE, (_, type, title, body) => {
    const key = `<!-- JTD-CALLOUT-${calloutIndex} -->`;
    callouts.push({ type, title: (title || "").trim(), bodyMd: body });
    calloutIndex++;
    return key;
  });

  let output = applyMarkdownToHtml(processed);

  for (let i = 0; i < callouts.length; i++) {
    const { type, title, bodyMd } = callouts[i];
    const cleanBody = bodyMd.replace(/^> /gm, "");
    const bodyHtml = applyMarkdownToHtml(cleanBody);
    const titleAttr = title ? ` data-title="${escapeHtml(title)}"` : "";
    output = output.replace(
      `<!-- JTD-CALLOUT-${i} -->`,
      `<div data-callout data-type="${type}"${titleAttr}><div class="callout-body">${bodyHtml}</div></div>`,
    );
  }

  return postProcessTaskLists(output);
}
