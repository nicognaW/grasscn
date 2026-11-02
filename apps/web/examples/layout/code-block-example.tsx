"use client";

import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockContent,
} from "@/components/ui/code-block";

const CodeBlockExample = () => {
  const code = 'const world = "Minecraft";';

  return (
    <CodeBlock /* eslint-disable shadcn/no-inline-styles -- Copyable examples retain their exact integer layout and renderer geometry without repository-only CSS. */
      style={{ maxWidth: "100%", width: 560 }}
      /* eslint-enable shadcn/no-inline-styles */
    >
      <CodeBlockHeader>
        <CodeBlockTitle>world.ts</CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton value={code} />
        </CodeBlockActions>
      </CodeBlockHeader>
      <CodeBlockContent>{code}</CodeBlockContent>
    </CodeBlock>
  );
};

export default CodeBlockExample;
