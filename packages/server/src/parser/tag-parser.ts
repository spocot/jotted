export interface TagMatch {
  tag: string;
  name: string;
  index: number;
}

const TAG_RE = /(?<=^|\s)#([a-zA-Z][a-zA-Z0-9_\/\-]*)/g;

export function extractTags(content: string): TagMatch[] {
  const matches: TagMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = TAG_RE.exec(content)) !== null) {
    matches.push({
      tag: match[0],
      name: match[1],
      index: match.index,
    });
  }
  return matches;
}
