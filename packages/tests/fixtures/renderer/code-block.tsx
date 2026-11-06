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
import type { ReactNode } from "react";
import * as React from "react";

import { MinecraftSelectableText } from "@/components/ui/minecraft-selectable-text";

const q = new URLSearchParams(location.search);

// SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
const scale =
  // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
  Number(q.get("scale") ?? 2) as 1 | 2 | 3;

const SelectableRefFixture = ({
  text,
  setText,
}: {
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const external = React.useRef<HTMLSpanElement>(null);
  const [shown, setShown] = React.useState(true);
  const [tag, setTag] = React.useState("");
  const [events, setEvents] = React.useState<string[]>([]);
  const [baselineEvents, setBaselineEvents] = React.useState<string[]>([]);

  const callback = React.useCallback<React.RefCallback<HTMLSpanElement>>(
    (node) => {
      external.current = node;
      let cleanup: (() => void) | undefined;

      if (node === null) {
        setEvents((previous) => [...previous, "null"]);
      } else {
        setEvents((previous) => [...previous, "attach:SPAN"]);
        cleanup = () => {
          external.current = null;
          setEvents((previous) => [...previous, `cleanup:${node.isConnected}`]);
        };
      }

      return cleanup;
    },
    []
  );

  const baselineCallback = React.useCallback<
    React.RefCallback<HTMLSpanElement>
  >((node) => {
    let cleanup: (() => void) | undefined;

    if (node === null) {
      setBaselineEvents((previous) => [...previous, "null"]);
    } else {
      setBaselineEvents((previous) => [...previous, "attach:SPAN"]);
      cleanup = () => {
        setBaselineEvents((previous) => [
          ...previous,
          `cleanup:${node.isConnected}`,
        ]);
      };
    }

    return cleanup;
  }, []);

  return (
    <>
      {shown && (
        <MinecraftSelectableText
          ref={q.get("selectableRef") === "callback" ? callback : external}
          text={text}
          className="select-text"
          title="Consumer selectable text"
          data-consumer="ref-test"
          data-testid="selectable-ref-subject"
        />
      )}
      {shown && (
        <span ref={baselineCallback} hidden>
          {text}
        </span>
      )}
      <button
        type="button"
        onClick={() => {
          setTag(external.current?.tagName ?? "missing");
        }}
      >
        Read selectable ref
      </button>
      <button
        type="button"
        onClick={() => {
          setShown((value) => !value);
        }}
      >
        Toggle selectable
      </button>
      <button
        type="button"
        onClick={() => {
          setText((value) => `${value}!`);
        }}
      >
        Update selectable text
      </button>
      <output aria-label="Selectable ref tag">{tag}</output>
      <output aria-label="Selectable ref callbacks">{events.join("|")}</output>
      <output aria-label="Intrinsic ref callbacks">
        {baselineEvents.join("|")}
      </output>
    </>
  );
};

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

  let selectedFixtureBranch1: ReactNode;

  if (q.has("highlight")) {
    selectedFixtureBranch1 = highlighted.map((line, index) => (
      <CodeBlockLine
        // oxlint-disable-next-line react-doctor/no-array-index-as-key -- The actual highlighter produces private text/token rows by document position, including duplicate and blank lines; there is no caller-owned stateful row identity.
        key={index}
      >
        {line}
      </CodeBlockLine>
    ));
  } else {
    selectedFixtureBranch1 = q.has("lines") ? (
      <>
        <CodeBlockLine variant="added">Added 世界</CodeBlockLine>
        <CodeBlockLine />
        <CodeBlockLine variant="removed">Removed</CodeBlockLine>
        <CodeBlockLine variant="highlighted">Highlight</CodeBlockLine>
      </>
    ) : (
      text
    );
  }

  if (q.has("selectableRef")) {
    return <SelectableRefFixture text={text} setText={setText} />;
  }

  return (
    <div className="fixture-code-block-frame">
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
          className={
            q.has("wrap")
              ? "fixture-width-180 fixture-code-max-height"
              : "fixture-code-max-height"
          }
          data-subject="true"
        >
          {selectedFixtureBranch1}
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
        type="button"
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
