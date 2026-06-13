export interface WikilinkMatch {
  wikilink: string;
  target: string;
  index: number;
}

const WIKILINK_RE = /\[\[([^\]]+?)\]\]/g;

function unescapeContent(text: string): string {
  return text.replace(/\\(\[|\])/g, "$1");
}

export function extractWikilinks(content: string): WikilinkMatch[] {
  const matches: WikilinkMatch[] = [];
  const unescaped = unescapeContent(content);
  let match: RegExpExecArray | null;
  while ((match = WIKILINK_RE.exec(unescaped)) !== null) {
    const target = match[1].trim();
    matches.push({
      wikilink: match[0],
      target,
      index: match.index,
    });
  }
  return matches;
}
