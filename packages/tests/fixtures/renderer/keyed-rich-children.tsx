import { CodeBlock, CodeBlockContent } from "@grasscn/web/ui/code-block";
import { Kbd } from "@grasscn/web/ui/kbd";
import * as React from "react";

import { MinecraftChatText } from "@/components/ui/minecraft-chat-text";
import { MinecraftItemText } from "@/components/ui/minecraft-item-text";

type CounterIdentity = "A" | "B";

const CounterChild = ({ identity }: { identity: CounterIdentity }) => {
  const [count, setCount] = React.useState(0);

  return (
    <button
      type="button"
      aria-label={`Increment ${identity}`}
      data-counter-id={identity}
      onClick={() => {
        setCount((value) => value + 1);
      }}
    >
      {identity}:{count}
    </button>
  );
};

export const KeyedRichChildrenFixture = () => {
  const [reversed, setReversed] = React.useState(false);
  const identities = reversed ? (["B", "A"] as const) : (["A", "B"] as const);

  const children = identities.map((identity) => (
    <CounterChild key={identity} identity={identity} />
  ));

  const adapter = new URLSearchParams(location.search).get("adapter");
  let content: React.ReactNode;

  if (adapter === "code-block") {
    content = (
      <CodeBlock>
        <CodeBlockContent data-testid="rich-key-adapter">
          {children}
        </CodeBlockContent>
      </CodeBlock>
    );
  } else if (adapter === "item-text") {
    content = (
      <MinecraftItemText data-testid="rich-key-adapter">
        {children}
      </MinecraftItemText>
    );
  } else if (adapter === "chat-text") {
    content = (
      <MinecraftChatText data-testid="rich-key-adapter">
        {children}
      </MinecraftChatText>
    );
  } else {
    content = <Kbd data-testid="rich-key-adapter">{children}</Kbd>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setReversed((value) => !value);
        }}
      >
        Swap children
      </button>
      {content}
    </div>
  );
};
