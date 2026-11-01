"use client";

import { MessageGroup, Message, MessageContent } from "@/components/ui/message";

export default function Example() {
  return (
    <MessageGroup>
      <Message author="Steve">
        <MessageContent>The bridge is finished.</MessageContent>
      </Message>
      <Message kind="system">
        <MessageContent>Changes saved.</MessageContent>
      </Message>
    </MessageGroup>
  );
}
