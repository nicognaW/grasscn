"use client";

import { OTPInput, OTPInputContext } from "input-otp";
import * as React from "react";

import { attachMinecraftOTPSlot } from "./minecraft-otp-paint";
import { MinecraftProse } from "./minecraft-prose";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";

import "./minecraft-input.css";
import "./minecraft-input-otp.css";

type Scale = 1 | 2 | 3;

const OTPStyle = React.createContext<{
  disabled: boolean;
  readOnly: boolean;
  scale: Scale;
}>({
  disabled: false,
  readOnly: false,
  scale: 2,
});

const InputOTP = ({
  scale = 2,
  className,
  containerClassName,
  spellCheck = false,
  autoCorrect = "off",
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  scale?: Scale;
}) => (
  <OTPStyle.Provider
    value={{ disabled: !!props.disabled, readOnly: !!props.readOnly, scale }}
  >
    <OTPInput
      spellCheck={spellCheck}
      autoCorrect={autoCorrect}
      data-slot="input-otp"
      containerClassName={`mc-otp ${containerClassName ?? ""}`}
      className={className}
      {...props}
    />
  </OTPStyle.Provider>
);

const InputOTPGroup = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="input-otp-group"
    className={cn(`mc-otp-group`, className)}
    {...props}
  />
);

const InputOTPSlot = ({
  index,
  className,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  index: number;
}) => {
  const { scale, disabled, readOnly } = React.useContext(OTPStyle);
  const context = React.useContext(OTPInputContext);
  const slot = context?.slots[index];
  const node = React.useRef<HTMLInputElement>(null);
  const active = React.useRef(false);

  active.current = slot?.isActive && context?.isFocused;
  React.useEffect(
    () =>
      node.current
        ? attachMinecraftOTPSlot(node.current, scale, () => active.current)
        : undefined,
    [scale]
  );
  React.useLayoutEffect(() => {
    if (node.current) {
      const pos = (slot?.char ?? "").length;
      node.current.setSelectionRange(pos, pos);
    }
  }, [slot?.char, slot?.isActive]);

  return (
    <div
      data-slot="input-otp-slot"
      data-active={active.current}
      className={cn(`mc-otp-slot`, className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
      )}
      {...props}
    >
      <input
        ref={node}
        className="mc-input"
        tabIndex={-1}
        maxLength={1}
        aria-hidden="true"
        value={slot?.char ?? ""}
        placeholder={slot?.placeholderChar ?? ""}
        disabled={disabled}
        readOnly={readOnly}
        onChange={() => {}}
        spellCheck={false}
        autoCorrect="off"
      />
    </div>
  );
};

const InputOTPSeparator = ({
  children = "-",
  ...props
}: React.ComponentProps<"div">) => {
  const { scale } = React.useContext(OTPStyle);

  return (
    <div
      data-slot="input-otp-separator"
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Preserve shadcn InputOTPSeparator's div separator and composition contract.
      role="separator"
      {...props}
    >
      <MinecraftProse scale={scale}>{children}</MinecraftProse>
    </div>
  );
};

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
