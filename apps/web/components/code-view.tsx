"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";

import { useHighlightedCode } from "../registry/hooks/use-highlighted-code";
import { Button } from "../registry/ui/button";
import { DocumentText } from "./document-text";

import "./documentation.css";

export type CodeViewProps = {
  code: string;
  filename: string;
  language?: string;
  label?: string;
  collapsible?: boolean;
};

type CopyState = { code: string; status: "copying" | "success" | "failed" };

export function CodeView({
  code,
  filename,
  language = "tsx",
  label = "Example code",
  collapsible = true,
}: CodeViewProps) {
  const id = useId();
  const pre = useRef<HTMLPreElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [lastCopy, setCopy] = useState<CopyState | null>(null);
  const request = useRef(0);
  const copy = lastCopy?.code === code ? lastCopy.status : "idle";
  const canCollapse = collapsible && code.split("\n").length > 12;
  const displayedCode =
    canCollapse && !expanded ? code.split("\n").slice(0, 12).join("\n") : code;
  const lines = useHighlightedCode(displayedCode, language);
  const selectCode = useCallback(() => {
    if (!pre.current) return;
    pre.current.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(pre.current);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);
  useLayoutEffect(() => {
    // Wait for the complete expanded file to commit before selecting its text.
    if (copy === "failed" && expanded) selectCode();
  }, [copy, expanded, code, selectCode]);
  const copyCode = async () => {
    const identity = ++request.current;
    setCopy({ code, status: "copying" });
    try {
      if (!navigator.clipboard?.writeText) throw Error("Clipboard unavailable");
      await navigator.clipboard.writeText(code);
      if (identity === request.current) setCopy({ code, status: "success" });
    } catch {
      if (identity === request.current) {
        setCopy({ code, status: "failed" });
        setExpanded(true);
      }
    }
  };
  return (
    <section
      className="documentation-code"
      aria-label={`${label}: ${filename}`}
    >
      <div className="documentation-code-toolbar">
        <DocumentText>{label}</DocumentText>
        <DocumentText className="documentation-filename">
          {filename} · {language}
        </DocumentText>
        <Button
          className="documentation-control"
          onClick={copyCode}
          disabled={copy === "copying"}
        >
          Copy
        </Button>
        {canCollapse ? (
          <Button
            className="documentation-control"
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Collapse" : "Expand"}
          </Button>
        ) : null}
      </div>
      <pre
        ref={pre}
        id={id}
        tabIndex={0}
        aria-label={`${filename} code`}
        onCopy={(event) => {
          event.clipboardData.setData("text/plain", code);
          event.preventDefault();
        }}
        className={`documentation-code-scroll${canCollapse && !expanded ? " documentation-code-collapsed" : ""}`}
      >
        <code data-language={language}>
          {lines.map((line, index) => (
            <span className="documentation-code-line" key={index}>
              <DocumentText>{line}</DocumentText>
              {index < lines.length - 1 || displayedCode.endsWith("\n")
                ? "\n"
                : null}
            </span>
          ))}
        </code>
      </pre>
      <div
        role="status"
        aria-live="polite"
        className="documentation-copy-status"
      >
        <DocumentText>
          {copy === "success"
            ? "Copied"
            : copy === "failed"
              ? "Copy failed. Select the code and copy it manually."
              : ""}
        </DocumentText>
      </div>
      {copy === "failed" ? (
        <Button className="documentation-control" onClick={selectCode}>
          Select
        </Button>
      ) : null}
    </section>
  );
}
