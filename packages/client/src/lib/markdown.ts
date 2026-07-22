import { marked } from "marked";

const CALLOUT_BODY_RE = /^> \[!(\w+)\](?: (.+?))?(?:\r?\n)((?:^> .*(?:\r?\n|$))*)/gm;

// GFM table: one or more pipe-delimited rows with a header separator row
const GFM_TABLE_RE = /^\|(.+)\|\n\|([-:| ]+)\|\n((?:\|.+\|\n?)*)/gm;

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function convertGfmTables(md: string): string {
  const tables: string[] = [];
  let processed = md.replace(GFM_TABLE_RE, (_full, headerRow, sepRow, bodyRows) => {
    const alignments = parseAlignments(sepRow);
    const headers = splitRow(headerRow);
    const rows = bodyRows
      .trim()
      .split("\n")
      .map((r: string) => splitRow(r));

    let html = "<table><tbody><tr>";
    for (let i = 0; i < headers.length; i++) {
      const cell = headers[i] ?? "";
      const align = alignments[i] ? ` style="text-align:${alignments[i]}"` : "";
      html += `<th${align}><p>${escapeHtml(cell)}</p></th>`;
    }
    html += "</tr>";

    for (const row of rows) {
      html += "<tr>";
      for (let i = 0; i < headers.length; i++) {
        const cell = row[i] ?? "";
        const align = alignments[i] ? ` style="text-align:${alignments[i]}"` : "";
        html += `<td${align}><p>${escapeHtml(cell)}</p></td>`;
      }
      html += "</tr>";
    }
    html += "</tbody></table>";

    const key = `<!-- JTD-TABLE-${tables.length} -->`;
    tables.push(html);
    return key;
  });

  for (let i = 0; i < tables.length; i++) {
    processed = processed.replace(`<!-- JTD-TABLE-${i} -->`, tables[i]);
  }

  return processed;
}

function parseAlignments(sepRow: string): string[] {
  return splitRow(sepRow).map((cell) => {
    const t = cell.trim();
    if (t.startsWith(":") && t.endsWith(":")) return "center";
    if (t.endsWith(":")) return "right";
    return "left";
  });
}

function splitRow(row: string): string[] {
  let r = row;
  if (r.startsWith("|")) r = r.slice(1);
  if (r.endsWith("|")) r = r.slice(0, -1);

  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < r.length; i++) {
    if (r[i] === "\\" && i + 1 < r.length && r[i + 1] === "|") {
      current += "|";
      i++;
    } else if (r[i] === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += r[i];
    }
  }
  cells.push(current.trim());
  return cells;
}

function applyInlinePreprocessing(md: string): string {
  return md
    .replace(/!\[\[([^\]]+?)\]\]/g, '<div data-note-embed data-title="$1"></div>')
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

  let processed = convertGfmTables(md);

  processed = processed.replace(CALLOUT_BODY_RE, (_, type, title, body) => {
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
