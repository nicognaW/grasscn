import { AdvancementTree } from "@grasscn/web/ui/advancement-tree";
import { Book } from "@grasscn/web/ui/book";
import { Hotbar } from "@grasscn/web/ui/hotbar";
import { MinecraftMap } from "@grasscn/web/ui/map";
import { PlayerList } from "@grasscn/web/ui/player-list";
import { Trading } from "@grasscn/web/ui/trading";
import * as React from "react";

export const CustomApiFixture = () => {
  const tree = React.useRef<HTMLDivElement>(null);
  const hotbar = React.useRef<HTMLDivElement>(null);

  const [event, setEvent] = React.useState("");
  const [cancel, setCancel] = React.useState(false);

  return (
    <>
      <button type="button" onClick={() => tree.current?.focus()}>
        Focus tree by ref
      </button>
      <button
        type="button"
        onClick={() => hotbar.current?.querySelector("button")?.focus()}
      >
        Focus hotbar by ref
      </button>
      <button
        type="button"
        onClick={() => {
          setCancel((value) => !value);
        }}
      >
        Toggle cancellation
      </button>
      <output id="custom-api-event">{event}</output>
      <AdvancementTree
        ref={tree}
        nodes={[{ id: "root", title: "Root", x: 0, y: 0 }]}
        defaultPan={{ x: 20, y: 20 }}
        onClickCapture={(event) => {
          if (cancel) {
            event.preventDefault();
          }
        }}
        onSelectedIdChange={(id) => {
          setEvent(`tree:${id}`);
        }}
      />
      <Hotbar
        ref={hotbar}
        onClickCapture={(event) => {
          if (cancel) {
            event.preventDefault();
          }
        }}
        onWheelCapture={(event) => {
          if (cancel) {
            event.preventDefault();
          }
        }}
        onValueChange={(value) => {
          setEvent(`slot:${value}`);
        }}
      />
      <MinecraftMap
        pixels={new Uint8Array(16_384)}
        onClick={(event) => {
          if (cancel) {
            event.preventDefault();
          }
        }}
        onMapClick={(point) => {
          setEvent(`map:${point.x},${point.y}`);
        }}
      />
      <Book
        pages={["First", "Second"]}
        turnSound={false}
        onClickCapture={(event) => {
          if (cancel) {
            event.preventDefault();
          }
        }}
        onPageChange={(page) => {
          setEvent(`page:${page}`);
        }}
      />
      <PlayerList
        players={[{ id: "sample", name: "Sample player" }]}
        onClickCapture={(event) => {
          if (cancel) {
            event.preventDefault();
          }
        }}
        onPlayerSelect={(id) => {
          setEvent(`player:${id}`);
        }}
      />
      <Trading
        offers={[
          {
            cost: { icon: null, label: "Cost" },
            id: "first",
            label: "First offer",
            result: { icon: null, label: "Reward" },
          },
          {
            cost: { icon: null, label: "Cost" },
            id: "second",
            label: "Second offer",
            result: { icon: null, label: "Reward" },
          },
        ]}
        onClickCapture={(event) => {
          if (cancel) {
            event.preventDefault();
          }
        }}
        onSelectedIdChange={(id) => {
          setEvent(`trade:${id}`);
        }}
      />
    </>
  );
};
