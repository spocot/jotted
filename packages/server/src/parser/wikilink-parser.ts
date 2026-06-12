export interface WikilinkMatch {
  wikilink: string;
  target: string;
  index: number;
}

const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

export function extractWikilinks(content: string): WikilinkMatch[] {
  const matches: WikilinkMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = WIKILINK_RE.exec(content)) !== null) {
    matches.push({
      wikilink: match[0],
      target: match[1].trim(),
      index: match.index,
    });
  }
  return matches;
}
