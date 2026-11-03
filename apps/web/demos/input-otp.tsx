import type { DemoVariables } from "../demo-variables";
import * as React from "react"
import {InputOTP,InputOTPGroup,InputOTPSlot,InputOTPSeparator} from "../registry/ui/input-otp"
import {Button} from "../registry/ui/button"
import type {DemoProps} from "../types"
import {useDemoWidth} from "../use-demo-width"

const InputOTPDemo = ({ scale }: DemoProps) => {
  const stage = useDemoWidth(scale);

  const slotWidth = Math.min(
    20,
    Math.max(12, Math.floor((stage.width - 6 - 24 / scale) / 6))
  );

  const [value, setValue] = React.useState("");
  const [complete, setComplete] = React.useState(0);

  return (
    <>
      <div className="demo-options">
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
            setValue("世界你好中文");
          }}
        >
          CJK sample
        </Button>
        <Button
          scale={scale}
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${65 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
          onClick={() => {
            setValue("");
          }}
        >
          Clear
        </Button>
      </div>
      <div ref={stage.ref} className="demo-stage" data-stage="input-otp">
        <div>
          ONE-TIME CODE
          <InputOTP
            aria-label="One-time code demo"
            scale={scale}
            maxLength={6}
            value={value}
            onChange={setValue}
            onComplete={() => {
              setComplete((count) => count + 1);
            }}
            inputMode="text"
            pushPasswordManagerStrategy="none"
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, index) => (
                <React.Fragment key={index}>
                  {index === 3 ? <InputOTPSeparator /> : null}
                  <InputOTPSlot
                    index={index}
                    style={{ width: slotWidth * scale }}
                  />
                </React.Fragment>
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <div>
          READ ONLY
          <InputOTP
            aria-label="Read-only one-time code"
            scale={scale}
            maxLength={6}
            value="123456"
            readOnly
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  style={{ width: slotWidth * scale }}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <div>
          DISABLED
          <InputOTP
            aria-label="Disabled one-time code"
            scale={scale}
            maxLength={6}
            value="ABC123"
            disabled
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  style={{ width: slotWidth * scale }}
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="OTP completions">{complete} complete codes</output>
        <span>Type or paste Latin and CJK text</span>
      </div>
    </>
  );
};

export { InputOTPDemo as default };
