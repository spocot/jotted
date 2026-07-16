import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export type CalloutType =
  | "note"
  | "warning"
  | "tip"
  | "danger"
  | "info"
  | "question"
  | "abstract"
  | "success"
  | "failure"
  | "bug"
  | "example"
  | "quote";

export const CALLOUT_TYPES: {
  type: CalloutType;
  label: string;
  icon: string;
  color: string;
}[] = [
  { type: "note", label: "Note", color: "blue", icon: "note" },
  { type: "warning", label: "Warning", color: "amber", icon: "warning" },
  { type: "tip", label: "Tip", color: "emerald", icon: "tip" },
  { type: "danger", label: "Danger", color: "red", icon: "danger" },
  { type: "info", label: "Info", color: "sky", icon: "info" },
  { type: "question", label: "Question", color: "purple", icon: "question" },
  { type: "abstract", label: "Abstract", color: "teal", icon: "abstract" },
  { type: "success", label: "Success", color: "green", icon: "success" },
  { type: "failure", label: "Failure", color: "rose", icon: "failure" },
  { type: "bug", label: "Bug", color: "red", icon: "bug" },
  { type: "example", label: "Example", color: "violet", icon: "example" },
  { type: "quote", label: "Quote", color: "slate", icon: "quote" },
];

const COLOR_MAP: Record<CalloutType, { border: string; bg: string }> = {
  note: { border: "border-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
  warning: { border: "border-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
  tip: { border: "border-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  danger: { border: "border-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
  info: { border: "border-sky-500", bg: "bg-sky-50 dark:bg-sky-950/30" },
  question: { border: "border-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30" },
  abstract: { border: "border-teal-500", bg: "bg-teal-50 dark:bg-teal-950/30" },
  success: { border: "border-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
  failure: { border: "border-rose-500", bg: "bg-rose-50 dark:bg-rose-950/30" },
  bug: { border: "border-red-500", bg: "bg-red-50 dark:bg-red-950/30" },
  example: { border: "border-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
  quote: { border: "border-slate-500", bg: "bg-slate-50 dark:bg-slate-800/30" },
};

const TEXT_COLOR_MAP: Record<CalloutType, string> = {
  note: "text-blue-800 dark:text-blue-200",
  warning: "text-amber-800 dark:text-amber-200",
  tip: "text-emerald-800 dark:text-emerald-200",
  danger: "text-red-800 dark:text-red-200",
  info: "text-sky-800 dark:text-sky-200",
  question: "text-purple-800 dark:text-purple-200",
  abstract: "text-teal-800 dark:text-teal-200",
  success: "text-green-800 dark:text-green-200",
  failure: "text-rose-800 dark:text-rose-200",
  bug: "text-red-800 dark:text-red-200",
  example: "text-violet-800 dark:text-violet-200",
  quote: "text-slate-800 dark:text-slate-200",
};

const ICON_SVGS: Record<string, string> = {
  note: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"></path><path d="M12 9h.01"></path><path d="M11 12h1v4h1"></path></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"></path><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0"></path><path d="M12 16h.01"></path></svg>`,
  tip: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7"></path><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3"></path><path d="M9.7 17l4.6 0"></path></svg>`,
  danger: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.802 2.165l5.575 2.389c.48 .206 .863 .589 1.07 1.07l2.388 5.574c.22 .512 .22 1.092 0 1.604l-2.389 5.575c-.206 .48 -.589 .863 -1.07 1.07l-5.574 2.388c-.512 .22 -1.092 .22 -1.604 0l-5.575 -2.389a2.036 2.036 0 0 1 -1.07 -1.07l-2.388 -5.574a2.036 2.036 0 0 1 0 -1.604l2.389 -5.575c.206 -.48 .589 -.863 1.07 -1.07l5.574 -2.388a2.036 2.036 0 0 1 1.604 0"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9h.01"></path><path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14"></path><path d="M11 12h1v4h1"></path></svg>`,
  question: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"></path><path d="M12 16v.01"></path><path d="M12 13a2 2 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483"></path></svg>`,
  abstract: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2"></path><path d="M9 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2"></path><path d="M9 12l.01 0"></path><path d="M13 12l2 0"></path><path d="M9 16l.01 0"></path><path d="M13 16l2 0"></path></svg>`,
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path><path d="M9 12l2 2l4 -4"></path></svg>`,
  failure: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path><path d="M10 10l4 4m0 -4l-4 4"></path></svg>`,
  bug: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9v-1a3 3 0 0 1 6 0v1"></path><path d="M8 9h8a6 6 0 0 1 1 3v3a5 5 0 0 1 -10 0v-3a6 6 0 0 1 1 -3"></path><path d="M3 13l4 0"></path><path d="M17 13l4 0"></path><path d="M12 20l0 -6"></path><path d="M4 19l3.35 -2"></path><path d="M20 19l-3.35 -2"></path><path d="M4 7l3.75 2.4"></path><path d="M20 7l-3.75 2.4"></path></svg>`,
  example: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3l6 0"></path><path d="M10 9l4 0"></path><path d="M10 3v6l-4 11a.7 .7 0 0 0 .5 1h11a.7 .7 0 0 0 .5 -1l-4 -11v-6"></path></svg>`,
  quote: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11h-4a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h3a1 1 0 0 1 1 1v6c0 2.667 -1.333 4.333 -4 5"></path><path d="M19 11h-4a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h3a1 1 0 0 1 1 1v6c0 2.667 -1.333 4.333 -4 5"></path></svg>`,
};

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      type: {
        default: "note",
        parseHTML: (element) => element.getAttribute("data-type") || "note",
        renderHTML: (attributes) => ({
          "data-type": attributes.type,
        }),
      },
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
        tag: "div[data-callout]",
        contentElement: "div.callout-body",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = (node.attrs.type || "note") as CalloutType;
    const title = (node.attrs.title || "") as string;
    const colors = COLOR_MAP[type] || COLOR_MAP.note;
    const textCls = TEXT_COLOR_MAP[type] || TEXT_COLOR_MAP.note;
    const svg = ICON_SVGS[type] || ICON_SVGS.note;
    const encodedSvg = encodeURIComponent(svg);

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-callout": "",
        class: `callout-wrapper border-l-4 rounded-r-lg my-4 ${colors.border} ${colors.bg}`,
      }),
      [
        "div",
        {
          class: `callout-header flex items-center gap-2 px-4 pt-3 pb-1 text-sm font-semibold select-none ${textCls}`,
          "data-callout-header": "",
          style: "cursor: pointer;",
        },
        [
          "span",
          {
            class: "callout-icon shrink-0",
            style: `width:18px;height:18px;background-color:currentColor;mask-image:url("data:image/svg+xml;charset=utf-8,${encodedSvg}");-webkit-mask-image:url("data:image/svg+xml;charset=utf-8,${encodedSvg}");mask-size:contain;-webkit-mask-size:contain;mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat;display:inline-block;`,
          },
        ],
        title
          ? ["span", { class: "callout-title" }, title]
          : ["span", { class: "callout-title" }, type.charAt(0).toUpperCase() + type.slice(1)],
      ],
      ["div", { class: "callout-body px-4 pb-3" }, 0],
    ];
  },

  renderText({ node }) {
    const type = node.attrs.type as string;
    const title = node.attrs.title as string;
    return `[!${type}]${title ? ` ${title}` : ""}`;
  },

  addCommands() {
    return {
      setCallout:
        (attrs: { type: CalloutType; title?: string }) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: { type: attrs.type, title: attrs.title || "" },
              content: [{ type: "paragraph" }],
            })
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { empty, $anchor } = editor.state.selection;
        if (!empty) return false;
        const node = $anchor.node(-1);
        if (node?.type.name !== this.name) return false;
        if ($anchor.parentOffset > 0) return false;
        if (!editor.isActive(this.name)) return false;
        if (node.textContent.trim().length === 0) {
          const from = $anchor.before(-1);
          const to = from + node.nodeSize;
          editor.view.dispatch(editor.view.state.tr.delete(from, to));
          return true;
        }
        return editor.chain().lift(this.name).run();
      },
      "Mod-Enter": ({ editor }) => {
        if (!editor.isActive(this.name)) return false;
        return editor.chain().exitCode().run();
      },
    };
  },

  addProseMirrorPlugins() {
    const calloutToggle = new Plugin({
      key: new PluginKey("calloutToggle"),
      props: {
        handleClick(_view, _pos, event) {
          const target = event.target as HTMLElement;
          const header = target.closest("[data-callout-header]");
          if (!header) return false;
          const wrapper = header.closest("[data-callout]") as HTMLElement;
          if (!wrapper) return false;
          const body = wrapper.querySelector(".callout-body") as HTMLElement;
          if (!body) return false;
          const collapsed = wrapper.getAttribute("data-collapsed") === "true";
          if (collapsed) {
            wrapper.setAttribute("data-collapsed", "false");
            body.style.display = "";
          } else {
            wrapper.setAttribute("data-collapsed", "true");
            body.style.display = "none";
          }
          return false;
        },
      },
    });

    return [calloutToggle];
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes: { type: CalloutType; title?: string }) => ReturnType;
    };
  }
}
