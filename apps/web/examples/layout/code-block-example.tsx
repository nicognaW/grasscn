"use client";

import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
} from "@/components/ui/code-block";

export default function CodeBlockExample() {
  const code = 'const world = "Minecraft";';
  return (
    <CodeBlock style={{ width: 560, maxWidth: "100%" }}>
      <CodeBlockHeader>
        <CodeBlockTitle>world.ts</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent>{code}</CodeBlockContent>
    </CodeBlock>
  );
}
