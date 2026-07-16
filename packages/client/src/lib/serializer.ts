import { MarkdownSerializer, MarkdownSerializerState } from "prosemirror-markdown";
import type { Node, Mark } from "@tiptap/pm/model";

const nodes: Record<string, (state: MarkdownSerializerState, node: Node, parent: Node, index: number) => void> = {
  doc(state, node) {
    state.renderContent(node);
  },
  paragraph(state, node) {
    state.renderInline(node);
    state.closeBlock(node);
  },
  heading(state, node) {
    state.write(state.repeat("#", node.attrs.level) + " ");
    state.renderInline(node, false);
    state.closeBlock(node);
  },
  bulletList(state, node) {
    state.renderList(node, "  ", () => (node.attrs.bullet ?? "*") + " ");
  },
  orderedList(state, node) {
    const start = node.attrs.order || 1;
    const maxW = String(start + node.childCount - 1).length;
    const space = state.repeat(" ", maxW + 2);
    state.renderList(node, space, (i: number) => {
      const nStr = String(start + i);
      return state.repeat(" ", maxW - nStr.length) + nStr + ". ";
    });
  },
  taskList(state, node) {
    state.renderList(node, "  ", () => "- ");
  },
  listItem(state, node) {
    state.renderContent(node);
  },
  taskItem(state, node) {
    const checked = node.attrs.checked ? "x" : " ";
    state.write(`[${checked}] `);
    state.renderContent(node);
  },
  codeBlock(state, node) {
    const backticks = node.textContent.match(/`{3,}/gm);
    const fence = backticks ? backticks.sort().slice(-1)[0] + "`" : "```";
    state.write(fence + (node.attrs.language ?? "") + "\n");
    state.text(node.textContent, false);
    state.write("\n");
    state.write(fence);
    state.closeBlock(node);
  },
  blockquote(state, node) {
    state.wrapBlock("> ", null, node, () => state.renderContent(node));
  },
  horizontalRule(state, node) {
    state.write(node.attrs.markup ?? "---");
    state.closeBlock(node);
  },
  hardBreak(state, node, parent, index) {
    for (let i = index + 1; i < parent.childCount; i++) {
      if (parent.child(i).type !== node.type) {
        state.write("\\\n");
        return;
      }
    }
  },
  text(state, node) {
    state.text(node.text ?? "", true);
  },
  wikilink(state, node) {
    state.write(`[[${node.attrs.title ?? ""}]]`);
  },
  tag(state, node) {
    state.write(`#${node.attrs.name ?? ""}`);
  },
  mention(state, node) {
    state.write(`[@${node.attrs.name ?? ""}](mention:${node.attrs.personId ?? ""})`);
  },
};

function isPlainUrl(mark: Mark): boolean {
  const href = mark.attrs.href;
  return !!href && mark.attrs.title == null;
}

const marks: Record<string, any> = {
  bold: { open: "**", close: "**", mixable: true, expelEnclosingWhitespace: true },
  italic: { open: "*", close: "*", mixable: true, expelEnclosingWhitespace: true },
  strike: { open: "~~", close: "~~", mixable: true, expelEnclosingWhitespace: true },
  code: {
    open: "`",
    close: "`",
    escape: false,
  },
  link: {
    open(state: MarkdownSerializerState, mark: Mark, _parent: Node, _index: number) {
      (state as any).inAutolink = isPlainUrl(mark);
      return (state as any).inAutolink ? "<" : "[";
    },
    close(state: MarkdownSerializerState, mark: Mark, _parent: Node, _index: number) {
      const inAutolink = (state as any).inAutolink;
      (state as any).inAutolink = undefined;
      return inAutolink
        ? ">"
        : `](${mark.attrs.href.replace(/[()"]/g, "\\$&")}${mark.attrs.title ? ` "${mark.attrs.title.replace(/"/g, '\\"')}"` : ""})`;
    },
    mixable: true,
  },
};

export const serializer = new MarkdownSerializer(nodes, marks, { strict: false });
