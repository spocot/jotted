import { describe, it, expect } from "vitest";
import { extractWikilinks } from "./wikilink-parser.js";
import { extractTags } from "./tag-parser.js";
import { extractMentions } from "./mention-parser.js";
import { parseContent } from "./index.js";

describe("wikilink-parser", () => {
  it("extracts simple wikilinks", () => {
    const result = extractWikilinks("Hello [[Target]] world");
    expect(result).toHaveLength(1);
    expect(result[0].target).toBe("Target");
    expect(result[0].index).toBe(6);
  });

  it("extracts multiple wikilinks", () => {
    const result = extractWikilinks("[[A]] and [[B]] and [[C]]");
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.target)).toEqual(["A", "B", "C"]);
  });

  it("trims target whitespace", () => {
    const result = extractWikilinks("[[  My Note  ]]");
    expect(result[0].target).toBe("My Note");
  });

  it("handles wikilinks with special characters", () => {
    const result = extractWikilinks("[[foo-bar_baz/qux]]");
    expect(result[0].target).toBe("foo-bar_baz/qux");
  });

  it("returns empty array for content without wikilinks", () => {
    const result = extractWikilinks("Just plain text");
    expect(result).toHaveLength(0);
  });

  it("unescapes escaped brackets before matching", () => {
    const result = extractWikilinks("Not a \\[\\[wikilink\\]\\]");
    expect(result).toHaveLength(1);
    expect(result[0].target).toBe("wikilink");
  });

  it("handles empty content", () => {
    expect(extractWikilinks("")).toHaveLength(0);
  });
});

describe("tag-parser", () => {
  it("extracts tags with # prefix", () => {
    const result = extractTags("Hello #tag world");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("tag");
  });

  it("extracts multiple tags", () => {
    const result = extractTags("#one #two #three");
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.name)).toEqual(["one", "two", "three"]);
  });

  it("handles tags with hyphens and underscores", () => {
    const result = extractTags("#my-tag #another_tag");
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("my-tag");
    expect(result[1].name).toBe("another_tag");
  });

  it("does not match # in the middle of words", () => {
    const result = extractTags("nota#tag");
    expect(result).toHaveLength(0);
  });

  it("does not match standalone #", () => {
    const result = extractTags("just a # and then text");
    expect(result).toHaveLength(0);
  });

  it("handles empty content", () => {
    expect(extractTags("")).toHaveLength(0);
  });
});

describe("parseContent", () => {
  it("returns both wikilinks and tags", () => {
    const result = parseContent("#hello check [[Note]] #world");
    expect(result.wikilinks).toHaveLength(1);
    expect(result.wikilinks[0].target).toBe("Note");
    expect(result.tags).toHaveLength(2);
    expect(result.tags.map((t) => t.name)).toEqual(["hello", "world"]);
  });

  it("extracts mentions from content", () => {
    const result = parseContent("[@John](mention:abc-123) and [@Jane](mention:def-456)");
    expect(result.mentions).toHaveLength(2);
    expect(result.mentions[0].name).toBe("John");
    expect(result.mentions[0].personId).toBe("abc-123");
    expect(result.mentions[1].name).toBe("Jane");
    expect(result.mentions[1].personId).toBe("def-456");
  });
});

describe("mention-parser", () => {
  it("extracts mentions from content", () => {
    const result = extractMentions("[@John](mention:abc-123)");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("John");
    expect(result[0].personId).toBe("abc-123");
  });

  it("extracts multiple mentions", () => {
    const result = extractMentions("[@John](mention:id1) [@Jane](mention:id2)");
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(["John", "Jane"]);
  });

  it("handles names with special characters", () => {
    const result = extractMentions("[@John-Doe](mention:id-1)");
    expect(result[0].name).toBe("John-Doe");
    expect(result[0].personId).toBe("id-1");
  });

  it("returns empty array for content without mentions", () => {
    const result = extractMentions("Just plain text with [[wikilink]] and #tag");
    expect(result).toHaveLength(0);
  });

  it("handles empty content", () => {
    expect(extractMentions("")).toHaveLength(0);
  });
});
