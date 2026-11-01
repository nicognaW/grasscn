"use client";

import {
  CodeBlock,
  CodeBlockContent,
  CodeBlockLine,
} from "@/components/ui/code-block";

const CodeBlockDiff = () => (
  <CodeBlock>
    <CodeBlockContent lineNumbers startLine={8}>
      <CodeBlockLine variant="removed">const seed = 1;</CodeBlockLine>
      <CodeBlockLine variant="added">const seed = 42;</CodeBlockLine>
    </CodeBlockContent>
  </CodeBlock>
);

export default CodeBlockDiff;
