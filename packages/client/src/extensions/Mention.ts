import { Node, mergeAttributes } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";

export interface MentionOptions {
  HTMLAttributes: Record<string, any>;
  suggestion: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mention: {
      setMention: (attributes: { personId: string; name: string }) => ReturnType;
    };
  }
}

export const Mention = Node.create<MentionOptions>({
  name: "mention",

  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      suggestion: {},
    };
  },

  addAttributes() {
    return {
      personId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-person-id"),
        renderHTML: (attrs) => ({ "data-person-id": attrs.personId }),
      },
      name: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-name"),
        renderHTML: (attrs) => ({ "data-name": attrs.name }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-type=\"mention\"]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "mention",
        class: "mention-chip inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full",
      }),
      `@${node.attrs.name ?? ""}`,
    ];
  },

  renderText({ node }) {
    return `@${node.attrs.name ?? ""}`;
  },

  addCommands() {
    return {
      setMention:
        (attributes: { personId: string; name: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
