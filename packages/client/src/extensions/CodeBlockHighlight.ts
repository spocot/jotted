import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const lowlight = createLowlight(common);

export const SUPPORTED_LANGUAGES = [
  { label: "Auto", value: null },
  { label: "Bash", value: "bash" },
  { label: "C", value: "c" },
  { label: "Clojure", value: "clojure" },
  { label: "CoffeeScript", value: "coffeescript" },
  { label: "C++", value: "cpp" },
  { label: "C#", value: "csharp" },
  { label: "CSS", value: "css" },
  { label: "Dart", value: "dart" },
  { label: "Diff", value: "diff" },
  { label: "Elixir", value: "elixir" },
  { label: "Erlang", value: "erlang" },
  { label: "Go", value: "go" },
  { label: "GraphQL", value: "graphql" },
  { label: "Haskell", value: "haskell" },
  { label: "HTML", value: "html" },
  { label: "Java", value: "java" },
  { label: "JavaScript", value: "javascript" },
  { label: "JSON", value: "json" },
  { label: "JSX", value: "jsx" },
  { label: "Kotlin", value: "kotlin" },
  { label: "LaTeX", value: "latex" },
  { label: "Less", value: "less" },
  { label: "Lisp", value: "lisp" },
  { label: "Lua", value: "lua" },
  { label: "Makefile", value: "makefile" },
  { label: "Markdown", value: "markdown" },
  { label: "Objective-C", value: "objectivec" },
  { label: "OCaml", value: "ocaml" },
  { label: "Perl", value: "perl" },
  { label: "PHP", value: "php" },
  { label: "Python", value: "python" },
  { label: "R", value: "r" },
  { label: "Ruby", value: "ruby" },
  { label: "Rust", value: "rust" },
  { label: "Sass", value: "sass" },
  { label: "SCSS", value: "scss" },
  { label: "Shell", value: "shell" },
  { label: "SQL", value: "sql" },
  { label: "Swift", value: "swift" },
  { label: "TSX", value: "tsx" },
  { label: "TypeScript", value: "typescript" },
  { label: "VB.NET", value: "vbnet" },
  { label: "WebAssembly", value: "wasm" },
  { label: "XML", value: "xml" },
  { label: "YAML", value: "yaml" },
  { label: "Zig", value: "zig" },
];

function codeBlockCopyPlugin() {
  return new Plugin({
    key: new PluginKey("codeBlockCopy"),
    props: {
      decorations(state) {
        const decorations: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          if (node.type.name === "codeBlock") {
            const btn = document.createElement("button");
            btn.className =
              "absolute top-2 right-2 px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors opacity-0 group-hover:opacity-100";
            btn.textContent = "Copy";
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(node.textContent);
              btn.textContent = "Copied!";
              setTimeout(() => {
                btn.textContent = "Copy";
              }, 2000);
            });
            decorations.push(
              Decoration.widget(pos + 1, btn, { side: -1 }),
            );
          }
        });
        return DecorationSet.create(state.doc, decorations);
      },
    },
  });
}

const CodeBlockHighlight = CodeBlockLowlight.extend({
  addProseMirrorPlugins() {
    return [...(this.parent?.() ?? []), codeBlockCopyPlugin()];
  },
  renderHTML({ node, HTMLAttributes }) {
    const preClass = [
      "group",
      HTMLAttributes.class,
    ].filter(Boolean).join(" ");
    return [
      "pre",
      { ...HTMLAttributes, class: preClass || undefined },
      [
        "code",
        {
          class: node.attrs.language
            ? `language-${node.attrs.language}`
            : undefined,
        },
        0,
      ],
    ];
  },
}).configure({
  lowlight,
  defaultLanguage: null,
});

export default CodeBlockHighlight;
