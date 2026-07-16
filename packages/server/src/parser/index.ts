import { extractWikilinks, type WikilinkMatch } from "./wikilink-parser.js";
import { extractTags, type TagMatch } from "./tag-parser.js";
import { extractMentions, type MentionMatch } from "./mention-parser.js";

export type { WikilinkMatch, TagMatch, MentionMatch };

export interface ParseResult {
  wikilinks: WikilinkMatch[];
  tags: TagMatch[];
  mentions: MentionMatch[];
}

export function parseContent(content: string): ParseResult {
  return {
    wikilinks: extractWikilinks(content),
    tags: extractTags(content),
    mentions: extractMentions(content),
  };
}
