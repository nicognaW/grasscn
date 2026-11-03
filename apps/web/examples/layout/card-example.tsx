"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Typography } from "@/components/ui/typography";

const CardExample = () => {
  const [name, setName] = useState("Minecraft");
  const [saved, setSaved] = useState(false);

  return (
    <Card className="w-118 max-w-full">
      <CardHeader>
        <CardTitle>World Settings</CardTitle>
        <CardDescription>Change your world options.</CardDescription>
      </CardHeader>
      <CardContent>
        <label htmlFor="world-name">World name</label>
        <Input
          id="world-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}

          className="w-full"
        />
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => {
            setSaved(true);
          }}
        >
          Done
        </Button>
        <Typography as="output" aria-live="polite">
          {saved ? "Settings saved" : "Edit your world name"}
        </Typography>
      </CardFooter>
    </Card>
  );
};

export default CardExample;
