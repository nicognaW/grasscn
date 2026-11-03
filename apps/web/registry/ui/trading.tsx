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

interface TradingLayoutStyle1 extends React.CSSProperties {
  "--mc-dynamic-trading-1-height": number;
  "--mc-dynamic-trading-1-width": number;
}

interface TradingLayoutStyle2 extends React.CSSProperties {
  "--mc-dynamic-trading-2-left": number;
  "--mc-dynamic-trading-2-top": number;
}

interface TradingLayoutStyle3 extends React.CSSProperties {
  "--mc-dynamic-trading-3-left": number;
  "--mc-dynamic-trading-3-top": number;
}

interface TradingLayoutStyle4 extends React.CSSProperties {
  "--mc-dynamic-trading-4-left": number;
  "--mc-dynamic-trading-4-top": number;
}

interface TradingLayoutStyle5 extends React.CSSProperties {
  "--mc-dynamic-trading-5-height": number;
  "--mc-dynamic-trading-5-left": number;
  "--mc-dynamic-trading-5-top": number;
  "--mc-dynamic-trading-5-width": number;
}

interface TradingLayoutStyle6 extends React.CSSProperties {
  "--mc-dynamic-trading-6-height": number;
  "--mc-dynamic-trading-6-width": number;
}

interface TradingLayoutStyle7 extends React.CSSProperties {
  "--mc-dynamic-trading-7-left": number;
  "--mc-dynamic-trading-7-top": number;
}

interface TradingLayoutStyle8 extends React.CSSProperties {
  "--mc-dynamic-trading-8-left": number;
  "--mc-dynamic-trading-8-top": number;
}

interface TradingLayoutStyle9 extends React.CSSProperties {
  "--mc-dynamic-trading-9-left": number;
  "--mc-dynamic-trading-9-top": number;
}

interface TradingLayoutStyle10 extends React.CSSProperties {
  "--mc-dynamic-trading-10-left": number;
  "--mc-dynamic-trading-10-top": number;
}

interface TradingLayoutStyle11 extends React.CSSProperties {
  "--mc-dynamic-trading-11-height": number;
  "--mc-dynamic-trading-11-left": number;
  "--mc-dynamic-trading-11-top": number;
  "--mc-dynamic-trading-11-width": number;
}

interface TradingLayoutStyle12 extends React.CSSProperties {
  "--mc-dynamic-trading-12-top": number;
}

interface TradingLayoutStyle13 extends React.CSSProperties {
  "--mc-dynamic-trading-13-left": number;
  "--mc-dynamic-trading-13-top": number;
}

interface TradingLayoutStyle14 extends React.CSSProperties {
  "--mc-dynamic-trading-14-left": number;
  "--mc-dynamic-trading-14-top": number;
}

interface TradingLayoutStyle15 extends React.CSSProperties {
  "--mc-dynamic-trading-15-height": number;
  "--mc-dynamic-trading-15-left": number;
  "--mc-dynamic-trading-15-top": number;
  "--mc-dynamic-trading-15-width": number;
}

interface TradingLayoutStyle16 extends React.CSSProperties {
  "--mc-dynamic-trading-16-left": number;
  "--mc-dynamic-trading-16-top": number;
}

interface TradingLayoutStyle17 extends React.CSSProperties {
  "--mc-dynamic-trading-17-height": number;
  "--mc-dynamic-trading-17-left": number;
  "--mc-dynamic-trading-17-top": number;
  "--mc-dynamic-trading-17-width": number;
}

interface TradingScaleStyle extends React.CSSProperties {
  "--mc-scale": number;
}

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
    className="mc-trade-item mc-dynamic-layout-trading-1"
    aria-label={`${item.count ?? 1} ${item.label}`}
    style={
      /* SAFETY: The owned mc-dynamic-layout-trading-1 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
      {
        "--mc-dynamic-trading-1-height": 16 * scale,
        "--mc-dynamic-trading-1-width": 16 * scale,
      } satisfies TradingLayoutStyle1 as TradingLayoutStyle1
    }
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

        let selectedAmount: number;

        if (event.deltaMode === 1) {
          selectedAmount = event.deltaY;
        } else if (event.deltaMode === 2) {
          selectedAmount = event.deltaY * 7;
        } else {
          selectedAmount = event.deltaY / 100;
        }

        const amount = selectedAmount;

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
        style={minecraftStyle(style, (__style): TradingScaleStyle => ({
          "--mc-scale": scale,
          height: 166 * scale,
          width: 276 * scale,
          ...__style,
        }))}
      >
        <AdventureImage
          texture="gui/container/villager"
          scale={scale}
          className="mc-layout-trading-2"
        />
        <MinecraftDocumentText
          text="Trades"
          width={96}
          scale={scale}
          align="center"
          color="#404040"
          className="mc-layout-trading-3 mc-dynamic-layout-trading-2"
          style={
            /* SAFETY: The owned mc-dynamic-layout-trading-2 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
            {
              "--mc-dynamic-trading-2-left": 5 * scale,
              "--mc-dynamic-trading-2-top": 6 * scale,
            } satisfies TradingLayoutStyle2 as TradingLayoutStyle2
          }
        />
        <MinecraftDocumentText
          text={title}
          width={162}
          scale={scale}
          align="center"
          color="#404040"
          className="mc-layout-trading-4 mc-dynamic-layout-trading-3"
          style={
            /* SAFETY: The owned mc-dynamic-layout-trading-3 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
            {
              "--mc-dynamic-trading-3-left": 106 * scale,
              "--mc-dynamic-trading-3-top": 6 * scale,
            } satisfies TradingLayoutStyle3 as TradingLayoutStyle3
          }
        />
        <MinecraftDocumentText
          text="Inventory"
          width={162}
          scale={scale}
          color="#404040"
          className="mc-layout-trading-5 mc-dynamic-layout-trading-4"
          style={
            /* SAFETY: The owned mc-dynamic-layout-trading-4 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
            {
              "--mc-dynamic-trading-4-left": 107 * scale,
              "--mc-dynamic-trading-4-top": 72 * scale,
            } satisfies TradingLayoutStyle4 as TradingLayoutStyle4
          }
        />
        <div
          id={listId}
          className="mc-trade-offers mc-dynamic-layout-trading-5"
          role="group"
          aria-label="Trade offers"
          style={
            /* SAFETY: The owned mc-dynamic-layout-trading-5 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
            {
              "--mc-dynamic-trading-5-height": 140 * scale,
              "--mc-dynamic-trading-5-left": 5 * scale,
              "--mc-dynamic-trading-5-top": 18 * scale,
              "--mc-dynamic-trading-5-width": 88 * scale,
            } satisfies TradingLayoutStyle5 as TradingLayoutStyle5
          }
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
                    className="mc-trade-offer block mc-layout-trading-7 mc-dynamic-layout-trading-6"
                    style={
                      /* SAFETY: The owned mc-dynamic-layout-trading-6 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                      {
                        "--mc-dynamic-trading-6-height": 20 * scale,
                        "--mc-dynamic-trading-6-width": 88 * scale,
                      } satisfies TradingLayoutStyle6 as TradingLayoutStyle6
                    }
                  />
                }
              >
                <span className="mc-trade-offer-content">
                  <span
                    className="mc-dynamic-layout-trading-7"
                    style={
                      /* SAFETY: The owned mc-dynamic-layout-trading-7 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                      {
                        "--mc-dynamic-trading-7-left": 5 * scale,
                        "--mc-dynamic-trading-7-top": scale,
                      } satisfies TradingLayoutStyle7 as TradingLayoutStyle7
                    }
                  >
                    <TradeItemGraphic item={item.cost} scale={scale} />
                  </span>
                  {item.secondCost && (
                    <span
                      className="mc-dynamic-layout-trading-8"
                      style={
                        /* SAFETY: The owned mc-dynamic-layout-trading-8 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                        {
                          "--mc-dynamic-trading-8-left": 35 * scale,
                          "--mc-dynamic-trading-8-top": scale,
                        } satisfies TradingLayoutStyle8 as TradingLayoutStyle8
                      }
                    >
                      <TradeItemGraphic item={item.secondCost} scale={scale} />
                    </span>
                  )}
                  <AdventureImage
                    texture={`gui/sprites/container/villager/trade_arrow${item.inStock === false ? "_out_of_stock" : ""}`}
                    scale={scale}
                    className="mc-layout-trading-10 mc-dynamic-layout-trading-9"
                    style={
                      /* SAFETY: The owned mc-dynamic-layout-trading-9 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                      {
                        "--mc-dynamic-trading-9-left": 55 * scale,
                        "--mc-dynamic-trading-9-top": 4 * scale,
                      } satisfies TradingLayoutStyle9 as TradingLayoutStyle9
                    }
                  />
                  <span
                    className="mc-dynamic-layout-trading-10"
                    style={
                      /* SAFETY: The owned mc-dynamic-layout-trading-10 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                      {
                        "--mc-dynamic-trading-10-left": 68 * scale,
                        "--mc-dynamic-trading-10-top": scale,
                      } satisfies TradingLayoutStyle10 as TradingLayoutStyle10
                    }
                  >
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
          className="mc-trade-scroll mc-dynamic-layout-trading-11"
          style={
            /* SAFETY: The owned mc-dynamic-layout-trading-11 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
            {
              "--mc-dynamic-trading-11-height": 140 * scale,
              "--mc-dynamic-trading-11-left": 94 * scale,
              "--mc-dynamic-trading-11-top": 18 * scale,
              "--mc-dynamic-trading-11-width": 6 * scale,
            } satisfies TradingLayoutStyle11 as TradingLayoutStyle11
          }
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
            className="mc-layout-trading-13 mc-dynamic-layout-trading-12"
            style={
              /* SAFETY: The owned mc-dynamic-layout-trading-12 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
              {
                "--mc-dynamic-trading-12-top": thumbY * scale,
              } satisfies TradingLayoutStyle12 as TradingLayoutStyle12
            }
          />
        </div>
        {offer && (
          <>
            <span
              className="mc-trade-payment mc-dynamic-layout-trading-13"
              style={
                /* SAFETY: The owned mc-dynamic-layout-trading-13 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                {
                  "--mc-dynamic-trading-13-left": 136 * scale,
                  "--mc-dynamic-trading-13-top": 37 * scale,
                } satisfies TradingLayoutStyle13 as TradingLayoutStyle13
              }
            >
              <TradeItemGraphic item={offer.cost} scale={scale} />
            </span>
            {offer.secondCost && (
              <span
                className="mc-trade-payment mc-dynamic-layout-trading-14"
                style={
                  /* SAFETY: The owned mc-dynamic-layout-trading-14 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                  {
                    "--mc-dynamic-trading-14-left": 162 * scale,
                    "--mc-dynamic-trading-14-top": 37 * scale,
                  } satisfies TradingLayoutStyle14 as TradingLayoutStyle14
                }
              >
                <TradeItemGraphic item={offer.secondCost} scale={scale} />
              </span>
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="mc-trade-result mc-dynamic-layout-trading-15"
                    aria-label={`Trade for ${offer.result.label}`}
                    disabled={offer.inStock === false}
                    onClick={(event) => {
                      if (!event.defaultPrevented) {
                        onTrade?.(offer.id);
                        playTradingSound();
                      }
                    }}
                    style={
                      /* SAFETY: The owned mc-dynamic-layout-trading-15 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                      {
                        "--mc-dynamic-trading-15-height": 16 * scale,
                        "--mc-dynamic-trading-15-left": 220 * scale,
                        "--mc-dynamic-trading-15-top": 37 * scale,
                        "--mc-dynamic-trading-15-width": 16 * scale,
                      } satisfies TradingLayoutStyle15 as TradingLayoutStyle15
                    }
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
                className="mc-layout-trading-17 mc-dynamic-layout-trading-16"
                style={
                  /* SAFETY: The owned mc-dynamic-layout-trading-16 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
                  {
                    "--mc-dynamic-trading-16-left": 182 * scale,
                    "--mc-dynamic-trading-16-top": 35 * scale,
                  } satisfies TradingLayoutStyle16 as TradingLayoutStyle16
                }
              />
            )}
          </>
        )}
        <div
          className="mc-trade-inventory mc-dynamic-layout-trading-17"
          style={
            /* SAFETY: The owned mc-dynamic-layout-trading-17 rule consumes exactly these CSS variables; satisfies checks the finite map and this CSSProperties view passes it to React without changing the original value expressions. */
            {
              "--mc-dynamic-trading-17-height": 76 * scale,
              "--mc-dynamic-trading-17-left": 107 * scale,
              "--mc-dynamic-trading-17-top": 83 * scale,
              "--mc-dynamic-trading-17-width": 162 * scale,
            } satisfies TradingLayoutStyle17 as TradingLayoutStyle17
          }
        >
          {inventory}
        </div>
      </div>
    </TooltipProvider>
  );
};

export { Trading };

export type { TradeItem, TradeOffer, TradingProps };
