import { Node, mergeAttributes, InputRule, PasteRule } from "@tiptap/core";

export interface WikilinkOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikilink: {
      setWikilink: (attributes: { title: string }) => ReturnType;
    };
  }
}

export const Wikilink = Node.create<WikilinkOptions>({
  name: "wikilink",

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
      title: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-title"),
        renderHTML: (attrs) => ({ "data-title": attrs.title }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-wikilink]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-wikilink": "",
        class: "cursor-pointer text-blue-600 dark:text-blue-400 underline decoration-dotted hover:decoration-solid",
      }),
      `[[${node.attrs.title ?? ""}]]`,
    ];
  },

  renderText({ node }) {
    return `[[${node.attrs.title ?? ""}]]`;
  },

  addCommands() {
    return {
      setWikilink:
        (attributes: { title: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[([^\]]+?)\]\]$/,
        handler: ({ state, range, match }) => {
          const title = match[1].trim();
          if (!title) return;
          const { tr } = state;
          tr.replaceRangeWith(range.from, range.to, this.type.create({ title }));
        },
      }),
    ];
  },

  addPasteRules() {
    return [
      new PasteRule({
        find: /\[\[([^\]]+?)\]\]/g,
        handler: ({ state, range, match }) => {
          const title = match[1].trim();
          if (!title) return;
          const { tr } = state;
          tr.replaceRangeWith(range.from, range.to, this.type.create({ title }));
        },
      }),
    ];
  },
});
