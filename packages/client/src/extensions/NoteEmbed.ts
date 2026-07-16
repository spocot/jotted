import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import NoteEmbedView from "../components/NoteEmbedView";

export const NoteEmbed = Node.create({
  name: "noteEmbed",
  group: "block",
  atom: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-title") || "",
        renderHTML: (attributes) => {
          if (!attributes.title) return {};
          return { "data-title": attributes.title };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-note-embed]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes, 0];
  },

  renderText({ node }) {
    return `![[${node.attrs.title ?? ""}]]`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteEmbedView);
  },
});
