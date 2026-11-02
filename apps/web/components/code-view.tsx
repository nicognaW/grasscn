"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";

import { useHighlightedCode } from "../registry/hooks/use-highlighted-code";
import { Button } from "../registry/ui/button";
import { DocumentText } from "./document-text";

import "./documentation.css";

export interface CodeViewProps {
  code: string;
  filename: string;
  language?: string;
  label?: string;
  collapsible?: boolean;
}

interface CopyState {
  code: string;
  status: "copying" | "success" | "failed";
}

export const CodeView = ({
  code,
  filename,
  language = "tsx",
  label = "Example code",
  collapsible = true,
}: CodeViewProps) => {
  const id = useId();
  const pre = useRef<HTMLPreElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [lastCopy, setLastCopy] = useState<CopyState | null>(null);
  const request = useRef(0);
  const copy = lastCopy?.code === code ? lastCopy.status : "idle";
  const canCollapse = collapsible && code.split("\n").length > 12;

  const displayedCode =
    canCollapse && !expanded ? code.split("\n").slice(0, 12).join("\n") : code;

  const lines = useHighlightedCode(displayedCode, language);

  const selectCode = useCallback(() => {
    if (!pre.current) {
      return;
    }

    pre.current.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(pre.current);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);

  useLayoutEffect(() => {
    // Wait for the complete expanded file to commit before selecting its text.
    if (copy === "failed" && expanded) {
      selectCode();
    }
  }, [copy, expanded, selectCode]);

  const copyCode = async () => {
    request.current += 1;
    const identity = request.current;
    setLastCopy({ code, status: "copying" });

    /* eslint-disable react/todo -- This browser I/O operation requires guarded failure and cleanup paths; React Compiler is not enabled. */
    try {
      if (navigator.clipboard?.writeText === undefined) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(code);

      if (identity === request.current) {
        setLastCopy({ code, status: "success" });
      }
    } catch {
      if (identity === request.current) {
        setLastCopy({ code, status: "failed" });
        setExpanded(true);
      }
    }
    /* eslint-enable react/todo */
  };

  return (
    <section
      /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
      className="documentation-code"
      /* eslint-enable shadcn/no-unknown-classes */
      aria-label={`${label}: ${filename}`}
    >
      <div /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
        className="documentation-code-toolbar"
        /* eslint-enable shadcn/no-unknown-classes */
      >
        <DocumentText>{label}</DocumentText>
        <DocumentText /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
          className="documentation-filename"
          /* eslint-enable shadcn/no-unknown-classes */
        >
          {filename} · {language}
        </DocumentText>
        <Button
          /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
          className="documentation-control"
          /* eslint-enable shadcn/no-unknown-classes */
          onClick={() => {
            void copyCode();
          }}
          disabled={copy === "copying"}
        >
          Copy
        </Button>
        {canCollapse ? (
          <Button
            /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
            className="documentation-control"
            /* eslint-enable shadcn/no-unknown-classes */
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => {
              setExpanded((value) => !value);
            }}
          >
            {expanded ? "Collapse" : "Expand"}
          </Button>
        ) : null}
      </div>
      <pre
        ref={pre}
        id={id}

        /* eslint-disable jsx-a11y/no-noninteractive-tabindex -- The source preview is keyboard-focusable for exact code selection and clipboard fallback. */
        tabIndex={0}
        /* eslint-enable jsx-a11y/no-noninteractive-tabindex */

        aria-label={`${filename} code`}
        /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
        className={`documentation-code-scroll${canCollapse && !expanded ? " documentation-code-collapsed" : ""}`}
        /* eslint-enable shadcn/no-unknown-classes */
      >
        <code data-language={language}>
          {lines.map((line, index) => (
            <span /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
              className="documentation-code-line"
              /* eslint-enable shadcn/no-unknown-classes */
              /* eslint-disable react-doctor/no-array-index-as-key -- These positions identify immutable generated document segments; text and source identity own replacement. */
              key={index}
              /* eslint-enable react-doctor/no-array-index-as-key */
            >
              <DocumentText>{line}</DocumentText>
              {index < lines.length - 1 || displayedCode.endsWith("\n")
                ? "\n"
                : null}
            </span>
          ))}
          {displayedCode.endsWith("\n") ? (
            // A rendered empty final line preserves the authored LF in browser selection.
            <span
              aria-hidden="true"
              /* eslint-disable shadcn/no-unknown-classes -- This empty line box is defined in the imported documentation stylesheet. */
              className="documentation-code-endline"
              /* eslint-enable shadcn/no-unknown-classes */
            />
          ) : null}
        </code>
      </pre>
      <div
        /* eslint-disable jsx-a11y/prefer-tag-over-role -- Keep the native component tag, CSS geometry and explicit composed ARIA role together. */
        role="status"
        /* eslint-enable jsx-a11y/prefer-tag-over-role */

        aria-live="polite"
        /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
        className="documentation-copy-status"
        /* eslint-enable shadcn/no-unknown-classes */
      >
        <DocumentText>
          {
            {
              copying: "",
              failed: "Copy failed. Select the code and copy it manually.",
              idle: "",
              success: "Copied",
            }[copy]
          }
        </DocumentText>
      </div>
      {copy === "failed" ? (
        <Button /* eslint-disable shadcn/no-unknown-classes -- These classes are defined in components/documentation.css and loaded by the documentation layout. */
          className="documentation-control"
          /* eslint-enable shadcn/no-unknown-classes */ onClick={selectCode}
        >
          Select
        </Button>
      ) : null}
    </section>
  );
};
