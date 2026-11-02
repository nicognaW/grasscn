import * as React from "react"
import {CodeBlock,CodeBlockHeader,CodeBlockTitle,CodeBlockActions,CodeBlockCopyButton,CodeBlockContent,CodeBlockLine,CodeBlockFooter} from "../registry/ui/code-block"
import {useHighlightedCode} from "../registry/hooks/use-highlighted-code"
import {Textarea} from "../registry/ui/textarea"
import {Checkbox} from "../registry/ui/checkbox"
import type {DemoProps} from "../types"

export default function CodeBlockDemo({ scale }: DemoProps) {
  const [code, setCode] = React.useState(
    'const greeting = "Hello 世界";\n\n// Keep building!'
  );
  const [wrap, setWrap] = React.useState(false);
  const [numbers, setNumbers] = React.useState(true);
  const lines = useHighlightedCode(code, "typescript");

  return (
    <>
      <div className="demo-options">
        <label className="demo-option">
          Code
          <Textarea
            aria-label="Code block source"
            scale={scale}
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
            }}
            style={{ width: 340, height: 120 }}
          />
        </label>
        <label className="demo-option">
          <Checkbox
            scale={scale}
            checked={wrap}
            onCheckedChange={(value) => {
              setWrap(value === true);
            }}
          />
          Wrap
        </label>
        <label className="demo-option">
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
        <CodeBlock scale={scale} style={{ width: "100%", maxWidth: 620 }}>
          <CodeBlockHeader>
            <CodeBlockTitle>greeting.ts</CodeBlockTitle>
            <CodeBlockActions>
              <CodeBlockCopyButton value={code} style={{ width: 40 * scale }} />
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
        <span className="status-dot" />
        <span>Select the code or copy it</span>
      </div>
    </>
  );
}
