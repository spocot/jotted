import { Node, mergeAttributes, InputRule, PasteRule } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import type { SearchSuggestion } from "../types";
import { getApiBaseUrl } from "../lib/server-config";

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

const WikilinkSuggestionPluginKey = new PluginKey("wikilink-suggestion");

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

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: WikilinkSuggestionPluginKey,
        char: "\x00",
        startOfLine: false,
        allowedPrefixes: null,
        findSuggestionMatch: (config) => {
          const { $position } = config;
          const text =
            $position.nodeBefore?.isText
              ? $position.nodeBefore.text
              : "";
          if (!text) return null;
          const textFrom = $position.pos - text.length;
          const regex = /\[\[([^\]\[]*)$/;
          const match = text.match(regex);
          if (!match) return null;
          const from = textFrom + match.index!;
          const to = textFrom + text.length;
          if (from >= $position.pos) return null;
          return {
            range: { from, to },
            query: match[1] ?? "",
            text: match[0],
          };
        },
        items: async ({ query }) => {
          if (query.length < 2) return [];
          try {
            const res = await fetch(
              `${getApiBaseUrl()}/search/suggest?q=${encodeURIComponent(query)}`,
            );
            if (!res.ok) return [];
            return await res.json() as SearchSuggestion[];
          } catch {
            return [];
          }
        },
        command: ({ editor, range, props }) => {
          const { from, to } = range;
          editor
            .chain()
            .focus()
            .insertContentAt(
              { from, to },
              {
                type: "wikilink",
                attrs: { title: (props as SearchSuggestion).title },
              },
            )
            .run();
        },
        render: () => {
          let popup: HTMLDivElement | null = null;
          let selectedIndex = 0;
          let currentItems: SearchSuggestion[] = [];
          let currentCommand: ((item: SearchSuggestion) => void) | null = null;

          const renderItems = () => {
            if (!popup) return;
            popup.innerHTML = "";
            if (currentItems.length === 0) {
              popup.style.display = "none";
              return;
            }
            popup.style.display = "";
            for (let i = 0; i < currentItems.length; i++) {
              const item = currentItems[i];
              const btn = document.createElement("button");
              btn.className =
                `w-full text-left px-3 py-2 text-sm ${
                  i === selectedIndex
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`;
              btn.textContent = item.title;
              btn.onmousedown = (e) => {
                e.preventDefault();
                currentCommand?.(item);
              };
              popup.appendChild(btn);
            }
          };

          return {
            onStart: (props) => {
              selectedIndex = 0;
              currentItems = props.items;
              currentCommand = props.command;
              popup = document.createElement("div");
              popup.className =
                "fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[180px] py-1";
              const rect = props.clientRect?.();
              if (rect) {
                popup.style.top = `${rect.bottom + 4}px`;
                popup.style.left = `${rect.left}px`;
              }
              document.body.appendChild(popup);
              renderItems();
            },

            onUpdate: (props) => {
              selectedIndex = 0;
              currentItems = props.items;
              currentCommand = props.command;
              const rect = props.clientRect?.();
              if (popup && rect) {
                popup.style.top = `${rect.bottom + 4}px`;
                popup.style.left = `${rect.left}px`;
              }
              renderItems();
            },

            onKeyDown: ({ event }) => {
              if (!popup || popup.style.display === "none") return false;
              if (currentItems.length === 0) return false;

              if (event.key === "ArrowDown") {
                event.preventDefault();
                selectedIndex = (selectedIndex + 1) % currentItems.length;
                renderItems();
                return true;
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                selectedIndex =
                  (selectedIndex - 1 + currentItems.length) % currentItems.length;
                renderItems();
                return true;
              }

              if (event.key === "Enter" || event.key === "Tab") {
                event.preventDefault();
                currentCommand?.(currentItems[selectedIndex]);
                return true;
              }

              return false;
            },

            onExit: () => {
              if (popup) {
                popup.remove();
                popup = null;
              }
            },
          };
        },
      }),
    ];
  },
});
