"use client";

import * as React from "react";

import { Button } from "./button";
import { AdventureImage } from "./minecraft-adventure-image";
import { MinecraftDocumentText } from "./minecraft-document-text";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { MinecraftText } from "./minecraft-text";
import { playTradingSound } from "./minecraft-trading-sound";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./tooltip";

import "./minecraft-trading.css";

interface TradeItem {
  label: string;
  icon: React.ReactNode;
  count?: number;
}

interface TradeOffer {
  id: string;
  label: string;
  cost: TradeItem;
  secondCost?: TradeItem;
  result: TradeItem;
  inStock?: boolean;
}

type TradingProps = React.ComponentProps<"div"> & {
  offers: readonly TradeOffer[];
  selectedId?: string;
  defaultSelectedId?: string;
  onSelectedIdChange?: (id: string) => void;
  onTrade?: (id: string) => void;
  scrollOffset?: number;
  defaultScrollOffset?: number;
  onScrollOffsetChange?: (offset: number) => void;
  title?: string;
  scale?: 1 | 2 | 3;
  inventory?: React.ReactNode;
};

const TradeItemGraphic = ({
  item,
  scale,
}: {
  item: TradeItem;
  scale: number;
}) => (
  <span
    className="mc-trade-item"
    aria-label={`${item.count ?? 1} ${item.label}`}
    style={{ height: 16 * scale, width: 16 * scale }}
  >
    {item.icon}
    {(item.count ?? 1) > 1 && (
      <span className="mc-trade-count">
        <MinecraftText>{item.count}</MinecraftText>
      </span>
    )}
  </span>
);

const Trading = ({
  offers,
  selectedId,
  defaultSelectedId,
  onSelectedIdChange,
  onTrade,
  scrollOffset,
  defaultScrollOffset = 0,
  onScrollOffsetChange,
  title = "Trading",
  scale = 2,
  inventory,
  className,
  style,
  ref: forwardedRef,
  onWheelCapture,
  ...props
}: TradingProps) => {
  const [current, setCurrent] = React.useState(
    defaultSelectedId ?? offers[0]?.id
  );

  const [internalOffset, setInternalOffset] =
    React.useState(defaultScrollOffset);

  const root = React.useRef<HTMLDivElement>(null);
  const rail = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();
  const maxOffset = Math.max(0, offers.length - 7);

  const offset = Math.max(
    0,
    Math.min(maxOffset, Math.trunc(scrollOffset ?? internalOffset))
  );

  const selected = selectedId ?? current;
  const offer = offers.find((o) => o.id === selected) ?? offers[0];

  const latestOffset = React.useRef(offset);
  latestOffset.current = offset;
  const cancelledWheel = React.useRef<WheelEvent | null>(null);
  React.useImperativeHandle(forwardedRef, () => root.current!, []);

  const choose = (id: string) => {
    if (selectedId === undefined) {
      setCurrent(id);
    }

    onSelectedIdChange?.(id);
  };

  const changeOffset = React.useCallback(
    (next: number) => {
      const value = Math.max(0, Math.min(maxOffset, Math.trunc(next)));
      latestOffset.current = value;

      if (scrollOffset === undefined) {
        setInternalOffset(value);
      }

      onScrollOffsetChange?.(value);
    },
    [maxOffset, scrollOffset, onScrollOffsetChange]
  );

  React.useEffect(() => {
    const node = root.current!;

    const wheel = (event: WheelEvent) => {
      if (cancelledWheel.current === event) {
        event.preventDefault();

        return;
      }

      if (!event.defaultPrevented && event.deltaY) {
        event.preventDefault();

        const amount =
          event.deltaMode === 1
            ? event.deltaY
            : event.deltaMode === 2
              ? event.deltaY * 7
              : event.deltaY / 100;

        changeOffset(Math.trunc(latestOffset.current + amount));
      }
    };

    node.addEventListener("wheel", wheel, { passive: false });

    return () => {
      node.removeEventListener("wheel", wheel);
    };
  }, [changeOffset]);

  const steps = maxOffset + 1;
  const delta = 139 - (27 + Math.trunc(((steps - 1) * 139) / steps));
  const step = 1 + Math.trunc(delta / steps) + Math.trunc(139 / steps);

  const thumbY =
    offset === maxOffset && maxOffset ? 113 : Math.min(113, offset * step);

  const dragThumb = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!maxOffset) {
      return;
    }

    const bounds = rail.current!.getBoundingClientRect();

    const f = Math.fround;
    const y = f((event.clientY - bounds.top) / scale + 18);
    const fraction = f(f(f(y - 18) - 13.5) / 112);

    changeOffset(Math.trunc(f(f(fraction * maxOffset) + 0.5)));
  };

  return (
    <TooltipProvider>
      <div
        {...props}
        ref={root}
        onWheelCapture={(event) => {
          onWheelCapture?.(event);
          cancelledWheel.current = event.defaultPrevented
            ? event.nativeEvent
            : null;
        }}
        data-slot="trading"
        role={props.role ?? "group"}
        aria-label={props["aria-label"] ?? title}
        className={cn(`mc-trading`, className)}
        style={minecraftStyle(
          style,
          (__style) =>
            ({
              "--mc-scale": scale,
              height: 166 * scale,
              width: 276 * scale,
              ...__style,
            }) as React.CSSProperties
        )}
      >
        <AdventureImage
          texture="gui/container/villager"
          scale={scale}
          style={{ left: 0, maxWidth: "none", position: "absolute", top: 0 }}
        />
        <MinecraftDocumentText
          text="Trades"
          width={96}
          scale={scale}
          align="center"
          color="#404040"
          style={{ left: 5 * scale, position: "absolute", top: 6 * scale }}
        />
        <MinecraftDocumentText
          text={title}
          width={162}
          scale={scale}
          align="center"
          color="#404040"
          style={{ left: 106 * scale, position: "absolute", top: 6 * scale }}
        />
        <MinecraftDocumentText
          text="Inventory"
          width={162}
          scale={scale}
          color="#404040"
          style={{ left: 107 * scale, position: "absolute", top: 72 * scale }}
        />
        <div
          id={listId}
          className="mc-trade-offers"
          role="group"
          aria-label="Trade offers"
          style={{
            height: 140 * scale,
            left: 5 * scale,
            top: 18 * scale,
            width: 88 * scale,
          }}
        >
          {offers.slice(offset, offset + 7).map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    scale={scale}
                    aria-label={item.label}
                    aria-pressed={offer?.id === item.id}
                    onClick={(event) => {
                      if (!event.defaultPrevented) {
                        choose(item.id);
                      }
                    }}
                    className="mc-trade-offer"
                    style={{
                      display: "block",
                      height: 20 * scale,
                      width: 88 * scale,
                    }}
                  />
                }
              >
                <span className="mc-trade-offer-content">
                  <span style={{ left: 5 * scale, top: scale }}>
                    <TradeItemGraphic item={item.cost} scale={scale} />
                  </span>
                  {item.secondCost && (
                    <span style={{ left: 35 * scale, top: scale }}>
                      <TradeItemGraphic item={item.secondCost} scale={scale} />
                    </span>
                  )}
                  <AdventureImage
                    texture={`gui/sprites/container/villager/trade_arrow${item.inStock === false ? "_out_of_stock" : ""}`}
                    scale={scale}
                    style={{
                      left: 55 * scale,
                      position: "absolute",
                      top: 4 * scale,
                    }}
                  />
                  <span style={{ left: 68 * scale, top: scale }}>
                    <TradeItemGraphic item={item.result} scale={scale} />
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent scale={scale}>
                {item.label}
                {item.inStock === false ? " — Out of stock" : ""}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div
          ref={rail}
          role="scrollbar"
          aria-label="Trade offers scroll"
          aria-controls={listId}
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={maxOffset}
          aria-valuenow={offset}
          aria-disabled={!maxOffset}
          tabIndex={maxOffset ? 0 : -1}
          className="mc-trade-scroll"
          style={{
            height: 140 * scale,
            left: 94 * scale,
            top: 18 * scale,
            width: 6 * scale,
          }}
          onKeyDown={(event) => {
            if (event.defaultPrevented) {
              return;
            }

            const next = (
              {
                ArrowDown: offset + 1,
                ArrowUp: offset - 1,
                End: maxOffset,
                Home: 0,
                PageDown: offset + 7,
                PageUp: offset - 7,
              } as Record<string, number>
            )[event.key];

            if (next !== undefined) {
              event.preventDefault();
              changeOffset(next);
            }
          }}
          onContextMenu={(event) => {
            event.preventDefault();
          }}
          onPointerDown={(event) => {
            if (event.defaultPrevented || !maxOffset) {
              return;
            }

            const bounds = event.currentTarget.getBoundingClientRect();

            if (
              event.clientX <= bounds.left ||
              event.clientX >= bounds.right ||
              event.clientY <= bounds.top ||
              event.clientY > bounds.bottom
            ) {
              return;
            }

            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              dragThumb(event);
            }
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
        >
          <AdventureImage
            texture={`gui/sprites/container/villager/scroller${maxOffset ? "" : "_disabled"}`}
            scale={scale}
            style={{ left: 0, position: "absolute", top: thumbY * scale }}
          />
        </div>
        {offer && (
          <>
            <span
              className="mc-trade-payment"
              style={{ left: 136 * scale, top: 37 * scale }}
            >
              <TradeItemGraphic item={offer.cost} scale={scale} />
            </span>
            {offer.secondCost && (
              <span
                className="mc-trade-payment"
                style={{ left: 162 * scale, top: 37 * scale }}
              >
                <TradeItemGraphic item={offer.secondCost} scale={scale} />
              </span>
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="mc-trade-result"
                    aria-label={`Trade for ${offer.result.label}`}
                    disabled={offer.inStock === false}
                    onClick={(event) => {
                      if (!event.defaultPrevented) {
                        onTrade?.(offer.id);
                        playTradingSound();
                      }
                    }}
                    style={{
                      height: 16 * scale,
                      left: 220 * scale,
                      top: 37 * scale,
                      width: 16 * scale,
                    }}
                  />
                }
              >
                {offer.inStock !== false && (
                  <TradeItemGraphic item={offer.result} scale={scale} />
                )}
              </TooltipTrigger>
              <TooltipContent scale={scale}>
                {offer.inStock === false ? "Out of stock" : offer.result.label}
              </TooltipContent>
            </Tooltip>
            {offer.inStock === false && (
              <AdventureImage
                texture="gui/sprites/container/villager/out_of_stock"
                scale={scale}
                style={{
                  left: 182 * scale,
                  position: "absolute",
                  top: 35 * scale,
                }}
              />
            )}
          </>
        )}
        <div
          className="mc-trade-inventory"
          style={{
            height: 76 * scale,
            left: 107 * scale,
            top: 83 * scale,
            width: 162 * scale,
          }}
        >
          {inventory}
        </div>
      </div>
    </TooltipProvider>
  );
};

export { Trading };

export type { TradeItem, TradeOffer, TradingProps };
