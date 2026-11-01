import { useHighlightedCode } from "@grasscn/web/hooks/use-highlighted-code";
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
  CodeBlockLine,
  CodeBlockFooter,
} from "@grasscn/web/ui/code-block";
import * as React from "react";

const q = new URLSearchParams(location.search);
const scale = Number(q.get("scale") ?? 2) as 1 | 2 | 3;

export const CodeBlockFixture = () => {
  const [text, setText] = React.useState(
    q.get("text") ?? "First\n\n你好 世界\nLast"
  );

  const [events, setEvents] = React.useState(0);
  const [tag, setTag] = React.useState("");
  const ref = React.useRef<HTMLPreElement>(null);

  const highlighted = useHighlightedCode(
    text,
    q.get("language") ?? "typescript"
  );

  return (
    <div style={{ padding: 32, width: 700 }}>
      <CodeBlock
        scale={scale}
        variant={q.has("error") ? "destructive" : "default"}
      >
        <CodeBlockHeader>
          <CodeBlockTitle>Code 世界</CodeBlockTitle>
          <CodeBlockActions>
            <CodeBlockCopyButton
              value={text}
              disabled={q.has("disabled")}
              onClick={(e) => {
                setEvents((n) => n + 1);

                if (q.has("cancel")) {
                  e.preventDefault();
                }
              }}
            />
          </CodeBlockActions>
        </CodeBlockHeader>
        <CodeBlockContent
          id="subject"
          ref={ref}
          wrap={q.has("wrap")}
          lineNumbers={q.has("numbers")}
          startLine={7}
          style={{ maxHeight: 400, width: q.has("wrap") ? 180 : undefined }}
          data-subject="true"
        >
          {q.has("highlight") ? (
            highlighted.map((line, index) => (
              <CodeBlockLine key={index}>{line}</CodeBlockLine>
            ))
          ) : q.has("lines") ? (
            <>
              <CodeBlockLine variant="added">Added 世界</CodeBlockLine>
              <CodeBlockLine />
              <CodeBlockLine variant="removed">Removed</CodeBlockLine>
              <CodeBlockLine variant="highlighted">Highlight</CodeBlockLine>
            </>
          ) : (
            text
          )}
        </CodeBlockContent>
        <CodeBlockFooter>Original text palette</CodeBlockFooter>
      </CodeBlock>
      <textarea
        aria-label="Code input"
        spellCheck={false}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
        }}
      />
      <button
        id="read-ref"
        onClick={() => {
          setTag(ref.current?.tagName ?? "missing");
        }}
      >
        Read ref
      </button>
      <output id="tag">{tag}</output>
      <output id="events">{events}</output>
    </div>
  );
};
