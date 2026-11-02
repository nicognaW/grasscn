"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

const EmptyCreate = () => {
  const [created, setCreated] = useState(false);

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{created ? "World created" : "No worlds yet"}</EmptyTitle>
        <EmptyDescription>Create your first world.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          disabled={created}
          onClick={() => {
            setCreated(true);
          }}
        >
          Create world
        </Button>
      </EmptyContent>
    </Empty>
  );
};

export default EmptyCreate;
