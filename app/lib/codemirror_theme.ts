import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const purple = "var(--highlight-purple)",
  darkPurple = "var(--highlight-dark-purple)",
  gray = "var(--highlight-gray)",
  darkGray = "var(--highlight-dark-gray)",
  invalid = "#ffffff",
  ivory = "#abb2bf",
  darkBackground = "var(--highlight-background)",
  highlightBackground = "var(--highlight-background)",
  background = "var(--highlight-background)",
  selection = "var(--highlight-light-gray)",
  cursor = "#528bff";

function underline(color: string) {
  if (typeof btoa != "function") return "none";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="6" height="3">
    <path d="m0 3 l2 -2 l1 0 l2 2 l1 0" stroke="${color}" fill="none" stroke-width=".9"/>
  </svg>`;
  return `url('data:image/svg+xml;base64,${btoa(svg)}')`;
}

/// The editor theme styles for One Dark.
export const placemarkBaseTheme = EditorView.theme(
  {
    ".cm-lintRange-error": { backgroundImage: underline("#DC2626") },
    "&": {
      height: "16rem",
      color: ivory,
      backgroundColor: background,
    },

    ".cm-content": {
      caretColor: cursor,
      fontFamily: "var(--cm-font)",
      padding: "4px",
      fontSize: "12px",
    },
    ".cm-line": {
      padding: "0px",
    },

    "&.cm-focused .cm-cursor": { borderLeftColor: cursor },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-selectionBackground, ::selection":
      {
        backgroundColor: selection,
      },

    ".cm-panels": { backgroundColor: darkBackground, color: ivory },
    ".cm-scroller": { overflow: "auto" },
    ".cm-panels.cm-panels-top": { borderBottom: "2px solid black" },
    ".cm-panels.cm-panels-bottom": { borderTop: "2px solid black" },

    ".cm-searchMatch": {
      backgroundColor: "#72a1ff59",
      outline: "1px solid #457dff",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "#6199ff2f",
    },

    ".cm-activeLine": { backgroundColor: highlightBackground },
    ".cm-selectionMatch": { backgroundColor: "#aafe661a" },

    ".cm-matchingBracket, .cm-nonmatchingBracket": {
      backgroundColor: "#bad0f847",
      outline: "1px solid #515a6b",
    },

    ".cm-gutters": {
      backgroundColor: background,
      color: darkGray,
      opacity: 0.5,
      border: "none",
    },

    ".cm-activeLineGutter": {
      backgroundColor: highlightBackground,
    },

    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "none",
      color: "#ddd",
    },
    ".cm-diagnostic-error": { borderLeft: "initial" },
    ".cm-diagnostic-warning": {
      borderLeft: "initial",
    },
    ".cm-diagnostic-info": { borderLeft: "initial" },

    ".cm-tooltip": {
      color: "var(--highlight-tooltip-text)",
      borderRadius: "2px",
      boxShadow:
        "rgb(255, 255, 255) 0px 0px 0px 0px, rgb(229, 229, 229) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.06) 0px 2px 4px -1px",
      backgroundColor: darkBackground,
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": {
        backgroundColor: highlightBackground,
        color: ivory,
      },
    },
  },
  { dark: true }
);

/// The highlighting style for code in the One Dark theme.
export const placemarkHighlightStyle = HighlightStyle.define([
  {
    tag: [
      t.keyword,
      t.name,
      t.deleted,
      t.character,
      t.propertyName,
      t.macroName,
      t.function(t.variableName),
      t.labelName,
      t.operator,
      t.operatorKeyword,
      t.url,
      t.escape,
      t.regexp,
      t.link,
      t.special(t.string),
    ],
    color: purple,
  },
  {
    tag: [
      t.processingInstruction,
      t.string,
      t.inserted,
      t.special(t.variableName),
      t.color,
      t.constant(t.name),
      t.standard(t.name),
    ],
    color: darkPurple,
  },
  {
    tag: [
      t.typeName,
      t.className,
      t.number,
      t.atom,
      t.bool,
      t.changed,
      t.annotation,
      t.modifier,
      t.self,
      t.namespace,
    ],
    color: darkPurple,
  },
  { tag: [t.meta, t.comment, t.definition(t.name), t.separator], color: gray },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: gray, textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: purple },
  { tag: t.invalid, color: invalid },
]);

/// Extension to enable the One Dark theme (both the editor theme and
/// the highlight style).
export const placemarkTheme: Extension = [
  placemarkBaseTheme,
  syntaxHighlighting(placemarkHighlightStyle),
];
