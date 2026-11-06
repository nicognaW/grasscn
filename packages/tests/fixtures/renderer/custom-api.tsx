import { AdvancementTree } from "@grasscn/web/ui/advancement-tree";
import { Book } from "@grasscn/web/ui/book";
import { Hotbar } from "@grasscn/web/ui/hotbar";
import { MinecraftMap } from "@grasscn/web/ui/map";
import { PlayerList } from "@grasscn/web/ui/player-list";
import { Trading } from "@grasscn/web/ui/trading";
import * as React from "react";

const hotbarKeyboardQuery = new URLSearchParams(window.location.search);

const HotbarKeyboardFixture = () => {
  const [value, setValue] = React.useState(
    Number(hotbarKeyboardQuery.get("hotbarValue") ?? 0)
  );

  const [lastRequest, setLastRequest] = React.useState("");

  const [disabledSlots, setDisabledSlots] = React.useState<
    number[] | undefined
  >(() =>
    hotbarKeyboardQuery.has("hotbarMissingItems")
      ? undefined
      : (hotbarKeyboardQuery.get("hotbarDisabled") ?? "")
          .split(",")
          .filter((slot) => slot !== "")
          .map(Number)
  );

  return (
    <>
      <button type="button">Before hotbar</button>
      <Hotbar
        data-testid="keyboard-hotbar"
        items={
          disabledSlots === undefined
            ? undefined
            : Array.from({ length: 9 }, (_, slot) => ({
                disabled: disabledSlots.includes(slot),
                id: String(slot),
                label: `Slot ${slot + 1}`,
              }))
        }
        value={value}
        tabIndex={
          hotbarKeyboardQuery.has("hotbarTabIndex")
            ? Number(hotbarKeyboardQuery.get("hotbarTabIndex"))
            : undefined
        }
        onValueChange={(next) => {
          setLastRequest(String(next));

          if (!hotbarKeyboardQuery.has("hotbarDecline")) {
            setValue(next);
          }
        }}
      />
      <button type="button">After hotbar</button>
      <button
        type="button"
        onClick={() => {
          setDisabledSlots((current) => [...(current ?? []), value]);
        }}
      >
        Disable selected hotbar slot
      </button>
      <button
        type="button"
        onClick={() => {
          setDisabledSlots(Array.from({ length: 9 }, (_, slot) => slot));
        }}
      >
        Disable all hotbar slots
      </button>
      <button
        type="button"
        onClick={() => {
          setDisabledSlots([]);
        }}
      >
        Enable all hotbar slots
      </button>
      <output data-testid="hotbar-request">{lastRequest}</output>
    </>
  );
};

export const CustomApiFixture = () => {
  const tree = React.useRef<HTMLDivElement>(null);
  const hotbar = React.useRef<HTMLDivElement>(null);

  const [event, setEvent] = React.useState("");
  const [cancel, setCancel] = React.useState(false);

  if (hotbarKeyboardQuery.has("hotbarKeyboard")) {
    return <HotbarKeyboardFixture />;
  }

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
        onClickCapture={(clickEvent) => {
          if (cancel) {
            clickEvent.preventDefault();
          }
        }}
        onSelectedIdChange={(id) => {
          setEvent(`tree:${id}`);
        }}
      />
      <Hotbar
        ref={hotbar}
        onClickCapture={(clickEvent) => {
          if (cancel) {
            clickEvent.preventDefault();
          }
        }}
        onWheelCapture={(wheelEvent) => {
          if (cancel) {
            wheelEvent.preventDefault();
          }
        }}
        onValueChange={(value) => {
          setEvent(`slot:${value}`);
        }}
      />
      <MinecraftMap
        pixels={new Uint8Array(16_384)}
        onClick={(clickEvent) => {
          if (cancel) {
            clickEvent.preventDefault();
          }
        }}
        onMapClick={(point) => {
          setEvent(`map:${point.x},${point.y}`);
        }}
      />
      <Book
        pages={["First", "Second"]}
        turnSound={false}
        onClickCapture={(clickEvent) => {
          if (cancel) {
            clickEvent.preventDefault();
          }
        }}
        onPageChange={(page) => {
          setEvent(`page:${page}`);
        }}
      />
      <PlayerList
        players={[{ id: "sample", name: "Sample player" }]}
        onClickCapture={(clickEvent) => {
          if (cancel) {
            clickEvent.preventDefault();
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
        onClickCapture={(clickEvent) => {
          if (cancel) {
            clickEvent.preventDefault();
          }
        }}
        onSelectedIdChange={(id) => {
          setEvent(`trade:${id}`);
        }}
      />
    </>
  );
};
