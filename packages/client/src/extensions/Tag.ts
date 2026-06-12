import { Node, mergeAttributes } from "@tiptap/core";

export interface TagOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tag: {
      setTag: (attributes: { name: string }) => ReturnType;
    };
  }
}

export const Tag = Node.create<TagOptions>({
  name: "tag",

  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-name"),
        renderHTML: (attrs) => ({ "data-name": attrs.name }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-tag]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-tag": "",
        class: "inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full",
      }),
      `#${node.attrs.name ?? ""}`,
    ];
  },

  renderText({ node }) {
    return `#${node.attrs.name ?? ""}`;
  },

  addCommands() {
    return {
      setTag:
        (attributes: { name: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },
});
