import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import type { ChainedCommands } from "@tiptap/core";

interface SlashCommandItem {
  category: string;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
  action: (chain: ChainedCommands) => ChainedCommands;
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    category: "Headings",
    label: "Heading 1",
    description: "Large section heading",
    icon: "H1",
    keywords: ["h1", "title"],
    action: (c) => c.toggleHeading({ level: 1 }),
  },
  {
    category: "Headings",
    label: "Heading 2",
    description: "Medium section heading",
    icon: "H2",
    keywords: ["h2"],
    action: (c) => c.toggleHeading({ level: 2 }),
  },
  {
    category: "Headings",
    label: "Heading 3",
    description: "Small section heading",
    icon: "H3",
    keywords: ["h3"],
    action: (c) => c.toggleHeading({ level: 3 }),
  },
  {
    category: "Headings",
    label: "Heading 4",
    description: "Subsection heading",
    icon: "H4",
    keywords: ["h4"],
    action: (c) => c.toggleHeading({ level: 4 }),
  },
  {
    category: "Headings",
    label: "Heading 5",
    description: "Minor heading",
    icon: "H5",
    keywords: ["h5"],
    action: (c) => c.toggleHeading({ level: 5 }),
  },
  {
    category: "Headings",
    label: "Heading 6",
    description: "Smallest heading",
    icon: "H6",
    keywords: ["h6"],
    action: (c) => c.toggleHeading({ level: 6 }),
  },
  {
    category: "Lists",
    label: "Bullet List",
    description: "Simple bullet list",
    icon: "•",
    keywords: ["ul", "bullet", "unordered"],
    action: (c) => c.toggleBulletList(),
  },
  {
    category: "Lists",
    label: "Ordered List",
    description: "Numbered list",
    icon: "1.",
    keywords: ["ol", "numbered", "ordered"],
    action: (c) => c.toggleOrderedList(),
  },
  {
    category: "Lists",
    label: "Task List",
    description: "Checkable task list",
    icon: "☑",
    keywords: ["todo", "checkbox", "checklist"],
    action: (c) => c.toggleTaskList(),
  },
  {
    category: "Blocks",
    label: "Paragraph",
    description: "Plain text block",
    icon: "P",
    keywords: ["text", "normal"],
    action: (c) => c.setParagraph(),
  },
  {
    category: "Blocks",
    label: "Blockquote",
    description: "Quoted text block",
    icon: "❝",
    keywords: ["quote", "citation"],
    action: (c) => c.toggleBlockquote(),
  },
  {
    category: "Blocks",
    label: "Callout",
    description: "Colored info box",
    icon: "!",
    keywords: ["info", "warning", "note", "tip"],
    action: (c) => c.setCallout({ type: "note" }),
  },
  {
    category: "Blocks",
    label: "Code Block",
    description: "Code snippet with highlighting",
    icon: "<>",
    keywords: ["code", "snippet", "programming"],
    action: (c) => c.toggleCodeBlock(),
  },
  {
    category: "Blocks",
    label: "Divider",
    description: "Horizontal separator line",
    icon: "—",
    keywords: ["hr", "line", "horizontal", "separator", "rule"],
    action: (c) => c.setHorizontalRule(),
  },
];

const slashSuggestionPluginKey = new PluginKey("slash-command-suggestion");

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: true,
        pluginKey: slashSuggestionPluginKey,
        command: ({ editor, range, props }: {
          editor: any;
          range: { from: number; to: number };
          props: SlashCommandItem;
        }) => {
          const chain = editor.chain().focus().deleteRange(range);
          props.action(chain).run();
        },
        items: ({ query }: { query: string }): SlashCommandItem[] => {
          if (!query) {
            return SLASH_COMMANDS;
          }
          const q = query.toLowerCase();
          return SLASH_COMMANDS.filter((cmd) =>
            cmd.label.toLowerCase().includes(q) ||
            cmd.keywords.some((kw) => kw.toLowerCase().includes(q))
          );
        },
        render: () => {
          let popup: HTMLDivElement | null = null;
          let selectedIndex = 0;
          let currentItems: SlashCommandItem[] = [];
          let currentCommand: ((item: SlashCommandItem) => void) | null = null;

          const renderItems = () => {
            if (!popup) return;
            popup.innerHTML = "";
            if (currentItems.length === 0) {
              popup.style.display = "none";
              return;
            }
            popup.style.display = "";

            let lastCategory = "";
            let flatIndex = 0;

            for (let i = 0; i < currentItems.length; i++) {
              const item = currentItems[i];

              if (item.category !== lastCategory) {
                lastCategory = item.category;
                const header = document.createElement("div");
                header.className =
                  "px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";
                header.textContent = item.category;
                popup.appendChild(header);
              }

              const row = document.createElement("button");
              row.className = [
                "w-full text-left px-3 py-2 text-sm flex items-center gap-3 transition-colors",
                flatIndex === selectedIndex
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50",
              ].join(" ");

              const icon = document.createElement("span");
              icon.className =
                "flex-shrink-0 w-7 h-5 flex items-center justify-center font-mono text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
              icon.textContent = item.icon;
              row.appendChild(icon);

              const label = document.createElement("span");
              label.className = "font-medium";
              label.textContent = item.label;
              row.appendChild(label);

              const desc = document.createElement("span");
              desc.className = "ml-auto text-xs text-gray-400 dark:text-gray-500 hidden sm:inline";
              desc.textContent = item.description;
              row.appendChild(desc);

              const idx = flatIndex;
              row.onmousedown = (e) => {
                e.preventDefault();
                currentCommand?.(currentItems[idx]);
              };

              popup.appendChild(row);
              flatIndex++;
            }
          };

          return {
            onStart: (props: { items: SlashCommandItem[]; command: (item: SlashCommandItem) => void; clientRect?: () => DOMRect | null }) => {
              selectedIndex = 0;
              currentItems = props.items;
              currentCommand = props.command;
              popup = document.createElement("div");
              popup.className =
                "fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 overflow-y-auto min-w-[260px] py-1";
              popup.style.maxHeight = "320px";
              const rect = props.clientRect?.();
              if (rect) {
                popup.style.top = `${rect.bottom + 4}px`;
                popup.style.left = `${rect.left}px`;
              }
              document.body.appendChild(popup);
              renderItems();
            },

            onUpdate: (props: { items: SlashCommandItem[]; command: (item: SlashCommandItem) => void; clientRect?: () => DOMRect | null }) => {
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

            onKeyDown: ({ event }: { event: KeyboardEvent }) => {
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
