export interface MentionMatch {
  personId: string;
  name: string;
  raw: string;
  index: number;
}

const MENTION_RE = /\[@([^\]]+)\]\(mention:([^)]+)\)/g;

export function extractMentions(content: string): MentionMatch[] {
  const mentions: MentionMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = MENTION_RE.exec(content)) !== null) {
    mentions.push({
      name: match[1],
      personId: match[2],
      raw: match[0],
      index: match.index,
    });
  }
  return mentions;
}
