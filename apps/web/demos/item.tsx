import type { DemoVariables } from "../demo-variables";
import * as React from "react";
import { Item, ItemGroup, ItemSeparator, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemHeader, ItemFooter } from "../registry/ui/item";
import { Input } from "../registry/ui/input";
import { Textarea } from "../registry/ui/textarea";
import { Button } from "../registry/ui/button";
import type { DemoProps } from "../types";

export default function ItemDemo({ scale }: DemoProps) {
  const [name, setName] = React.useState("New World");

  const [description, setDescription] = React.useState(
    "world-1\nSurvival Mode"
  );

  const [selected, setSelected] = React.useState("");
  const [opens, setOpens] = React.useState(0);

  return (
    <>
      <div className="demo-options">
        <label>
          World name
          <Input
            aria-label="Item world name"
            scale={scale}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            className="w-70"
          />
        </label>
        <label>
          World information
          <Textarea
            aria-label="Item world information"
            scale={scale}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            style={{ width: 320, height: 100 }}
          />
        </label>
      </div>
      <div className="demo-stage" data-stage="item">
        <ItemGroup scale={scale} style={{ maxWidth: "100%" }}>
          <Item
            render={<a href="#item" />}
            selected={selected === "first"}
            style={{ maxWidth: "100%" }}
            onClick={() => {
              setSelected("first");
              setOpens((v) => v + 1);
            }}
          >
            {
              <>
                <ItemMedia />
                <ItemContent>
                  <ItemTitle>{name}</ItemTitle>
                  <ItemDescription>{description}</ItemDescription>
                </ItemContent>
              </>
            }
          </Item>
          <ItemSeparator />
          <Item
            render={<a href="#item" />}
            selected={selected === "second"}
            style={{ maxWidth: "100%" }}
            onClick={() => {
              setSelected("second");
              setOpens((v) => v + 1);
            }}
          >
            {
              <>
                <ItemMedia />
                <ItemContent>
                  <ItemTitle>你好，世界</ItemTitle>
                  <ItemDescription>{"world-2\nCreative Mode"}</ItemDescription>
                </ItemContent>
              </>
            }
          </Item>
        </ItemGroup>
        <Item scale={scale} style={{ maxWidth: "100%" }}>
          <ItemHeader>WORLD ACTIONS</ItemHeader>
          <ItemContent>
            <ItemTitle>Manage your worlds</ItemTitle>
            <ItemDescription>Keep building your adventure.</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              scale={scale}
              className="w-(--demo-width)"
              style={
                /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
                {
                  "--demo-width": `${80 * scale}px`,
                } satisfies DemoVariables as DemoVariables
              }
              onClick={() => {
                setOpens((v) => v + 1);
              }}
            >
              Open
            </Button>
          </ItemActions>
          <ItemFooter>Choose an action to continue</ItemFooter>
        </Item>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Item activations">Opened {opens} times</output>
        <span>Hover a thumbnail or use your keyboard</span>
      </div>
    </>
  );
}
