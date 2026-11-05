import * as React from "react";

import type { DemoVariables } from "../demo-variables";
import { Button } from "../registry/ui/button";
import { Input } from "../registry/ui/input";
import {
  Item,
  ItemGroup,
  ItemSeparator,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemHeader,
  ItemFooter,
} from "../registry/ui/item";
import { Textarea } from "../registry/ui/textarea";
import type { DemoProps } from "../types";

const ItemDemo = ({ scale }: DemoProps) => {
  const [name, setName] = React.useState("New World");

  const [description, setDescription] = React.useState(
    "world-1\nSurvival Mode"
  );

  const [selected, setSelected] = React.useState("");
  const [opens, setOpens] = React.useState(0);
  const hasFirstWorldLabel = name.trim() !== "" || description.trim() !== "";

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
            className="h-25 w-80"
          />
        </label>
      </div>
      <div className="demo-stage" data-stage="item">
        <ItemGroup scale={scale} className="demo-owned-item-1">
          <Item
            aria-label={hasFirstWorldLabel ? undefined : "Open first world"}
            // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- This anchor receives its actual accessible content and optional aria-label from the Item owner through the supported render composition.
            render={<a href="#item" />}
            selected={selected === "first"}
            className="demo-owned-item-2"
            onClick={() => {
              setSelected("first");
              setOpens((v) => v + 1);
            }}
          >
            <>
              <ItemMedia />
              <ItemContent>
                <ItemTitle>{name}</ItemTitle>
                <ItemDescription>{description}</ItemDescription>
              </ItemContent>
            </>
          </Item>
          <ItemSeparator />
          <Item
            render={
              // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- This receiver gets the fixed nonempty world-2 title and description from Item; retain the actual render composition rather than overriding its accessible name.
              <a href="#item" />
            }
            selected={selected === "second"}
            className="demo-owned-item-3"
            onClick={() => {
              setSelected("second");
              setOpens((v) => v + 1);
            }}
          >
            <>
              <ItemMedia />
              <ItemContent>
                <ItemTitle>你好，世界</ItemTitle>
                <ItemDescription>{"world-2\nCreative Mode"}</ItemDescription>
              </ItemContent>
            </>
          </Item>
        </ItemGroup>
        <Item scale={scale} className="demo-owned-item-4">
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
};

export { ItemDemo as default };
