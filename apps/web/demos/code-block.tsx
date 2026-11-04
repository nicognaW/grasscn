import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import { useHighlightedCode } from "../registry/hooks/use-highlighted-code";
import { Checkbox } from "../registry/ui/checkbox";
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
  CodeBlockLine,
  CodeBlockFooter,
} from "../registry/ui/code-block";
import { Textarea } from "../registry/ui/textarea";
import type { DemoProps } from "../types";

const CodeBlockDemo = ({ scale }: DemoProps) => {
  const [code, setCode] = React.useState(
    'const greeting = "Hello 世界";\n\n// Keep building!'
  );

  const [wrap, setWrap] = React.useState(false);
  const [numbers, setNumbers] = React.useState(true);
  const lines = useHighlightedCode(code, "typescript");

  const demoLayout2: DemoVariables = {
    "--demo-owned-code-block-2-width": `${40 * scale}px`,
  };

  return (
    <>
      <div className="demo-options">
        <label>
          Code
          <Textarea
            aria-label="Code block source"
            scale={scale}
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
            }}
            className="h-30 w-85"
          />
        </label>
        <label>
          <Checkbox
            scale={scale}
            checked={wrap}
            onCheckedChange={(value) => {
              setWrap(value === true);
            }}
          />
          Wrap
        </label>
        <label>
          <Checkbox
            scale={scale}
            checked={numbers}
            onCheckedChange={(value) => {
              setNumbers(value === true);
            }}
          />
          Line numbers
        </label>
      </div>
      <div className="demo-stage" data-stage="code-block">
        <CodeBlock scale={scale} className="demo-owned-code-block-1">
          <CodeBlockHeader>
            <CodeBlockTitle>greeting.ts</CodeBlockTitle>
            <CodeBlockActions>
              <CodeBlockCopyButton
                value={code}
                className="demo-owned-code-block-2"
                style={demoLayout2}
              />
            </CodeBlockActions>
          </CodeBlockHeader>
          <CodeBlockContent wrap={wrap} lineNumbers={numbers} startLine={1}>
            {lines.map((line, index) => (
              <CodeBlockLine key={index}>{line}</CodeBlockLine>
            ))}
          </CodeBlockContent>
          <CodeBlockFooter>Minecraft colors</CodeBlockFooter>
        </CodeBlock>
      </div>
      <div className="demo-result">
        <span />
        <span>Select the code or copy it</span>
      </div>
    </>
  );
};

export { CodeBlockDemo as default };
