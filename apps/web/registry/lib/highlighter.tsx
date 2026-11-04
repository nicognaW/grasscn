import * as React from "react";
import { createHighlighterCore } from "shiki/core";
import type { GrammarState, HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

// Add the languages you need. Each one loads the first time it is used.
const languages = {
  bash: async () => await import("shiki/langs/shellscript.mjs"),
  css: async () => await import("shiki/langs/css.mjs"),
  diff: async () => await import("shiki/langs/diff.mjs"),
  html: async () => await import("shiki/langs/html.mjs"),
  javascript: async () => await import("shiki/langs/javascript.mjs"),
  json: async () => await import("shiki/langs/json.mjs"),
  jsx: async () => await import("shiki/langs/jsx.mjs"),
  markdown: async () => await import("shiki/langs/markdown.mjs"),
  python: async () => await import("shiki/langs/python.mjs"),
  sql: async () => await import("shiki/langs/sql.mjs"),
  tsx: async () => await import("shiki/langs/tsx.mjs"),
  typescript: async () => await import("shiki/langs/typescript.mjs"),
  yaml: async () => await import("shiki/langs/yaml.mjs"),
};

const aliases: Record<string, keyof typeof languages> = {
  js: "javascript",
  md: "markdown",
  py: "python",
  sh: "bash",
  shell: "bash",
  shellscript: "bash",
  ts: "typescript",
  yml: "yaml",
  zsh: "bash",
};

const minecraftTheme = {
  colors: { "editor.background": "#000000", "editor.foreground": "#FFFFFF" },
  name: "minecraft-native",
  settings: [
    { scope: ["comment"], settings: { foreground: "#555555" } },
    { scope: ["keyword", "storage"], settings: { foreground: "#FF55FF" } },
    { scope: ["string"], settings: { foreground: "#55FF55" } },
    {
      scope: ["constant.numeric", "constant.language"],
      settings: { foreground: "#FFAA00" },
    },
    {
      scope: ["entity.name", "support.function"],
      settings: { foreground: "#55FFFF" },
    },
    { scope: ["invalid"], settings: { foreground: "#FF5555" } },
  ],
  type: "dark" as const,
};

const nativePalette = [
  "#000000",
  "#0000AA",
  "#00AA00",
  "#00AAAA",
  "#AA0000",
  "#AA00AA",
  "#FFAA00",
  "#AAAAAA",
  "#555555",
  "#5555FF",
  "#55FF55",
  "#55FFFF",
  "#FF5555",
  "#FF55FF",
  "#FFFF55",
  "#FFFFFF",
];

const nativeTokenColor = function nativeTokenColor(value?: string) {
  if (value === undefined || value === "" || !/^#[0-9a-f]{6}$/iu.test(value)) {
    return "#FFFFFF";
  }

  const rgb = [1, 3, 5].map((i) => Number.parseInt(value.slice(i, i + 2), 16));

  const distance = (c: string) =>
    [1, 3, 5].reduce(
      (sum, index, i) =>
        sum + (Number.parseInt(c.slice(index, index + 2), 16) - rgb[i]) ** 2,
      0
    );

  let [best] = nativePalette;

  for (const color of nativePalette) {
    if (distance(color) < distance(best)) {
      best = color;
    }
  }

  return best;
};

let highlighter: Promise<HighlighterCore> | undefined;

// oxlint-disable-next-line typescript/promise-function-async -- Return the cached highlighter Promise itself; async would wrap its identity and settlement.
const getHighlighter = function getHighlighter() {
  highlighter ??= createHighlighterCore({
    engine: createJavaScriptRegexEngine({ forgiving: true }),
    langs: [],
    themes: [minecraftTheme],
  });

  return highlighter;
};

const getLanguage = function getLanguage(language: string) {
  const name = language.toLowerCase();

  if (name === "ansi") {
    return name;
  }

  if (name in languages) {
    return name as keyof typeof languages;
  }

  return aliases[name] ?? null;
};

// Loads a language and returns a highlighter for it, or null for a language
// that is not listed.
export const loadHighlighter = async function loadHighlighter(
  language: string
) {
  const lang = getLanguage(language);

  if (!lang) {
    return null;
  }

  const shiki = await getHighlighter();

  if (lang !== "ansi" && !shiki.getLoadedLanguages().includes(lang)) {
    await shiki.loadLanguage(languages[lang]);
  }

  return {
    // Returns one React node per line, and the grammar state after the last
    // line. Pass that state back to continue where the code left off.
    highlight(code: string, state?: GrammarState) {
      const tokenize = (text: string) =>
        shiki.codeToTokens(text, {
          defaultColor: false,
          grammarState: state,
          lang,
          theme: "minecraft-native",
        }).tokens;

      // ANSI has no grammar state, so each line is tokenized on its own and
      // gets the same colors whether it arrives in one piece or streams.
      const tokens =
        lang === "ansi"
          ? code.split("\n").flatMap((line) => tokenize(line))
          : tokenize(code);

      return {
        lines: tokens.map((line) =>
          line.map((token, index) => {
            const tokenStyle: React.CSSProperties & {
              "--mc-token-color": string;
            } = { "--mc-token-color": nativeTokenColor(token.color) };

            return (
              <span
                key={index}
                style={tokenStyle}
                data-mc-code-token=""
                className="text-(--mc-token-color)"
              >
                {token.content}
              </span>
            );
          })
        ),
        state: shiki.getLastGrammarState(tokens),
      };
    },
  };
};

// Returns one React node per line, or null for a language that is not listed.
export const highlightCode = async function highlightCode(
  code: string,
  language: string
) {
  const resolvedHighlighter = await loadHighlighter(language);

  return resolvedHighlighter ? resolvedHighlighter.highlight(code).lines : null;
};
