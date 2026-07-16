import { useMemo } from "react";

type PreviewSegment =
  | { type: "text"; text: string }
  | { type: "wikilink"; title: string }
  | { type: "tag"; name: string }
  | { type: "mention"; name: string; personId: string };

export function stripMarkdownForPreview(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, "$2")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsePreviewSegments(content: string): PreviewSegment[] {
  const cleaned = stripMarkdownForPreview(content);
  const segments: PreviewSegment[] = [];

  // Match [[Title]], #tagname, or [@Name](mention:id)
  const regex =
    /\[\[([^\]]+)\]\]|(?:^|\s)(#[\w/-]+)(?=[\s.,;:!?]|$)|\[@([^\]]+)\]\(mention:([^)]+)\)/g;

  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIdx) {
      segments.push({ type: "text", text: cleaned.slice(lastIdx, match.index) });
    }

    if (match[1] !== undefined) {
      segments.push({ type: "wikilink", title: match[1] });
    } else if (match[2] !== undefined) {
      segments.push({ type: "tag", name: match[2] });
    } else if (match[3] !== undefined) {
      segments.push({ type: "mention", name: match[3], personId: match[4] });
    }

    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < cleaned.length) {
    const remaining = cleaned.slice(lastIdx).trim();
    if (remaining) {
      segments.push({ type: "text", text: remaining });
    }
  }

  return segments;
}

function renderSegment(seg: PreviewSegment, index: number) {
  switch (seg.type) {
    case "wikilink":
      return (
        <span
          key={index}
          className="text-blue-600 dark:text-blue-400 underline decoration-dotted"
        >
          [[{seg.title}]]
        </span>
      );
    case "tag":
      return (
        <span
          key={index}
          className="inline-flex items-center px-1.5 py-px rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
        >
          {seg.name.startsWith("#") ? seg.name : `#${seg.name}`}
        </span>
      );
    case "mention":
      return (
        <span
          key={index}
          className="inline-flex items-center px-1.5 py-px rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
        >
          @{seg.name}
        </span>
      );
    default:
      return <span key={index}>{seg.text}</span>;
  }
}

interface NoteContentPreviewProps {
  content: string;
  maxLength?: number;
}

export default function NoteContentPreview({
  content,
  maxLength,
}: NoteContentPreviewProps) {
  const segments = useMemo(() => {
    const truncated =
      maxLength != null && content.length > maxLength
        ? content.slice(0, maxLength) + "..."
        : content;
    return parsePreviewSegments(truncated);
  }, [content, maxLength]);

  if (!content) return null;

  return <span>{segments.map((seg, i) => renderSegment(seg, i))}</span>;
}

interface SegmentWithHighlights {
  type: "text" | "wikilink" | "tag" | "mention";
  text?: string;
  title?: string;
  name?: string;
  personId?: string;
  highlighted: boolean;
}

function parseHighlightedSegments(content: string): SegmentWithHighlights[] {
  const segments: SegmentWithHighlights[] = [];

  // First, split by highlight markers
  const hlRegex = /%%HL%%([\s\S]*?)%%\/HL%%/g;
  const parts: Array<{ text: string; highlighted: boolean }> = [];
  let lastIdx = 0;
  let hlMatch: RegExpExecArray | null;

  while ((hlMatch = hlRegex.exec(content)) !== null) {
    if (hlMatch.index > lastIdx) {
      parts.push({ text: content.slice(lastIdx, hlMatch.index), highlighted: false });
    }
    parts.push({ text: hlMatch[1], highlighted: true });
    lastIdx = hlMatch.index + hlMatch[0].length;
  }
  if (lastIdx < content.length) {
    parts.push({ text: content.slice(lastIdx), highlighted: false });
  }

  // For each part, further split by special item patterns
  const itemRegex =
    /\[\[([^\]]+)\]\]|(?:^|\s)(#[\w/-]+)(?=[\s.,;:!?]|$)|\[@([^\]]+)\]\(mention:([^)]+)\)/g;

  for (const part of parts) {
    itemRegex.lastIndex = 0;
    let itemLastIdx = 0;
    let itemMatch: RegExpExecArray | null;

    while ((itemMatch = itemRegex.exec(part.text)) !== null) {
      if (itemMatch.index > itemLastIdx) {
        segments.push({
          type: "text",
          text: part.text.slice(itemLastIdx, itemMatch.index),
          highlighted: part.highlighted,
        });
      }

      if (itemMatch[1] !== undefined) {
        segments.push({
          type: "wikilink",
          title: itemMatch[1],
          highlighted: part.highlighted,
        });
      } else if (itemMatch[2] !== undefined) {
        segments.push({
          type: "tag",
          name: itemMatch[2],
          highlighted: part.highlighted,
        });
      } else if (itemMatch[3] !== undefined) {
        segments.push({
          type: "mention",
          name: itemMatch[3],
          personId: itemMatch[4],
          highlighted: part.highlighted,
        });
      }

      itemLastIdx = itemMatch.index + itemMatch[0].length;
    }

    if (itemLastIdx < part.text.length) {
      const remaining = part.text.slice(itemLastIdx).trim();
      if (remaining) {
        segments.push({
          type: "text",
          text: remaining,
          highlighted: part.highlighted,
        });
      }
    }
  }

  return segments;
}

function renderHighlightedSegment(seg: SegmentWithHighlights, index: number) {
  const base = (inner: React.ReactNode) =>
    seg.highlighted ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
        {inner}
      </mark>
    ) : (
      <span key={index}>{inner}</span>
    );

  switch (seg.type) {
    case "wikilink":
      return base(
        <span className="text-blue-600 dark:text-blue-400 underline decoration-dotted">
          [[{seg.title}]]
        </span>,
      );
    case "tag":
      return base(
        <span className="inline-flex items-center px-1.5 py-px rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
          {seg.name!.startsWith("#") ? seg.name : `#${seg.name}`}
        </span>,
      );
    case "mention":
      return base(
        <span className="inline-flex items-center px-1.5 py-px rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
          @{seg.name}
        </span>,
      );
    default:
      return base(seg.text);
  }
}

interface HighlightedContentPreviewProps {
  content: string;
  query: string;
  maxLength?: number;
}

export function HighlightedContentPreview({
  content,
  query,
  maxLength,
}: HighlightedContentPreviewProps) {
  const segments = useMemo(() => {
    const stripped = stripMarkdownForPreview(content);
    const truncated =
      maxLength != null && stripped.length > maxLength
        ? stripped.slice(0, maxLength) + "..."
        : stripped;
    const highlighted = highlightText(truncated, query);
    return parseHighlightedSegments(highlighted);
  }, [content, query, maxLength]);

  if (!content) return null;

  return (
    <span>{segments.map((seg, i) => renderHighlightedSegment(seg, i))}</span>
  );
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  let result = text;
  for (const term of terms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    result = result.replace(regex, "%%HL%%$1%%/HL%%");
  }
  return result;
}

interface PreviewSnippet {
  highlightedSnippet: string;
}

export function buildPreviewSnippet(
  content: string,
  query: string,
  snippetWords = 30,
): PreviewSnippet {
  const stripped = stripMarkdownForPreview(content);
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return {
      highlightedSnippet: stripped.slice(0, 200),
    };
  }

  const lower = stripped.toLowerCase();
  let bestIdx = -1;
  let bestScore = 0;

  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx >= 0) {
      const score = term.length;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    }
  }

  if (bestIdx < 0) {
    return {
      highlightedSnippet: stripped.slice(0, 200),
    };
  }

  const words = stripped.split(/\s+/);
  const beforeWords = stripped.slice(0, bestIdx).split(/\s+/).length;
  const start = Math.max(0, beforeWords - Math.floor(snippetWords / 2));
  const snippet = words.slice(start, start + snippetWords).join(" ");

  const prefix = start > 0 ? "..." : "";
  const suffix = "";

  return {
    highlightedSnippet: prefix + highlightText(snippet, query) + suffix,
  };
}
