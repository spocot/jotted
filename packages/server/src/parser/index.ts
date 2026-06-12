import { extractWikilinks, type WikilinkMatch } from "./wikilink-parser.js";
import { extractTags, type TagMatch } from "./tag-parser.js";

export type { WikilinkMatch, TagMatch };

export interface ParseResult {
  wikilinks: WikilinkMatch[];
  tags: TagMatch[];
}

export function parseContent(content: string): ParseResult {
  return {
    wikilinks: extractWikilinks(content),
    tags: extractTags(content),
  };
}
