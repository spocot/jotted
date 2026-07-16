interface AdfNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
  text?: string;
  marks?: AdfMark[];
}

interface AdfMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
  marks?: TipTapMark[];
}

interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

const PANEL_TYPE_TO_CALLOUT: Record<string, string> = {
  info: "info",
  note: "note",
  warning: "warning",
  success: "success",
  error: "danger",
  tip: "tip",
};

function convertMarks(marks?: AdfMark[]): TipTapMark[] | undefined {
  if (!marks || marks.length === 0) return undefined;
  const result: TipTapMark[] = [];
  for (const mark of marks) {
    switch (mark.type) {
      case "strong":
        result.push({ type: "bold" });
        break;
      case "em":
        result.push({ type: "italic" });
        break;
      case "underline":
        result.push({ type: "underline" });
        break;
      case "strike":
        result.push({ type: "strike" });
        break;
      case "code":
        result.push({ type: "code" });
        break;
      case "link":
        result.push({
          type: "link",
          attrs: {
            href: mark.attrs?.href ?? "",
          },
        });
        break;
      case "subsup":
        if (mark.attrs?.type === "sub") {
          result.push({ type: "subscript" });
        } else {
          result.push({ type: "superscript" });
        }
        break;
      case "textColor": {
        if (mark.attrs?.color) {
          result.push({
            type: "textStyle",
            attrs: { color: mark.attrs.color },
          });
        }
        break;
      }
      default:
        break;
    }
  }
  return result.length > 0 ? result : undefined;
}

function convertNode(node: AdfNode): TipTapNode {
  switch (node.type) {
    case "doc":
      return {
        type: "doc",
        content: (node.content ?? []).map(convertNode),
      };

    case "heading":
      return {
        type: "heading",
        attrs: { level: node.attrs?.level ?? 1 },
        content: (node.content ?? []).map(convertNode),
      };

    case "paragraph":
      return {
        type: "paragraph",
        content: node.content
          ? node.content.map(convertNode)
          : node.text
            ? [{ type: "text", text: node.text, marks: convertMarks(node.marks) }]
            : [],
      };

    case "text":
      return {
        type: "text",
        text: node.text ?? "",
        marks: convertMarks(node.marks),
      };

    case "bulletList":
      return {
        type: "bulletList",
        content: (node.content ?? []).map(convertNode),
      };

    case "orderedList":
      return {
        type: "orderedList",
        content: (node.content ?? []).map(convertNode),
      };

    case "listItem":
      return {
        type: "listItem",
        content: (node.content ?? []).map(convertNode),
      };

    case "blockquote":
      return {
        type: "blockquote",
        content: (node.content ?? []).map(convertNode),
      };

    case "codeBlock":
      return {
        type: "codeBlock",
        attrs: {
          language: node.attrs?.language ?? "",
        },
        content: node.content
          ? node.content.map(convertNode)
          : [{ type: "text", text: node.text ?? "" }],
      };

    case "rule":
      return { type: "horizontalRule" };

    case "hardBreak":
      return { type: "hardBreak" };

    case "taskList":
      return {
        type: "taskList",
        content: (node.content ?? []).map(convertNode),
      };

    case "taskItem":
      return {
        type: "taskItem",
        attrs: {
          checked: node.attrs?.state === "DONE",
        },
        content: (node.content ?? []).map(convertNode),
      };

    case "panel":
      return {
        type: "callout",
        attrs: {
          type: PANEL_TYPE_TO_CALLOUT[node.attrs?.panelType as string] ?? "info",
          title: "",
        },
        content: (node.content ?? []).map(convertNode),
      };

    case "table":
      return {
        type: "table",
        content: (node.content ?? []).map(convertNode),
      };

    case "tableRow":
      return {
        type: "tableRow",
        content: (node.content ?? []).map(convertNode),
      };

    case "tableHeader":
      return {
        type: "tableHeader",
        content: (node.content ?? []).map(convertNode),
      };

    case "tableCell":
      return {
        type: "tableCell",
        content: (node.content ?? []).map(convertNode),
      };

    case "media":
    case "mediaSingle": {
      const mediaContent = node.content?.find(
        (c) => c.type === "media",
      );
      const mediaId = mediaContent?.attrs?.id as string | undefined;
      const collection = (mediaContent?.attrs?.collection as string) ?? "";
      if (mediaId) {
        return {
          type: "image",
          attrs: {
            src: `[Confluence attachment: ${mediaId}]`,
            alt: mediaContent?.attrs?.alt ?? "",
          },
        };
      }
      return { type: "paragraph" };
    }

    case "mention": {
      const name = (node.attrs?.text as string) ?? (node.text) ?? "";
      return {
        type: "text",
        text: `@${name}`,
      };
    }

    case "emoji": {
      const shortName = (node.attrs?.shortName as string) ?? "";
      return {
        type: "text",
        text: shortName ? `:${shortName}:` : "",
      };
    }

    case "inlineCard":
    case "blockCard": {
      const cardUrl = (node.attrs?.url as string) ?? "";
      if (cardUrl) {
        return {
          type: "text",
          text: cardUrl,
          marks: [{ type: "link", attrs: { href: cardUrl } }],
        };
      }
      return { type: "paragraph" };
    }

    case "status": {
      const statusText = (node.attrs?.text as string) ?? "";
      const statusColor = (node.attrs?.color as string) ?? "neutral";
      return {
        type: "text",
        text: `[${statusText}]`,
      };
    }

    case "date": {
      const timestamp = (node.attrs?.timestamp as string) ?? "";
      return {
        type: "text",
        text: timestamp ? new Date(Number(timestamp)).toLocaleDateString() : "",
      };
    }

    case "expand":
    case "nestedExpand":
      // Flatten: just render the content
      return {
        type: "paragraph",
        content: (node.content ?? []).map(convertNode),
      };

    case "layoutSection":
    case "layoutColumn":
      // Flatten nested layouts
      return {
        type: "paragraph",
        content: (node.content ?? []).map(convertNode),
      };

    case "placeholder":
      return {
        type: "text",
        text: (node.attrs?.text as string) ?? "",
      };

    default:
      // Unknown nodes: try to render children or fallback to empty paragraph
      if (node.content && node.content.length > 0) {
        return {
          type: "paragraph",
          content: node.content.map(convertNode),
        };
      }
      return { type: "paragraph" };
  }
}

export function convertAdfToTipTap(adf: object): object {
  const root = adf as AdfNode;
  if (root.type === "doc") {
    return convertNode(root);
  }
  // Wrap non-doc root in a doc
  return {
    type: "doc",
    content: [convertNode(root)],
  };
}
