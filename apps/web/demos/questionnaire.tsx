import type { DemoVariables } from "../demo-variables";
import * as React from "react"
import {Questionnaire,QuestionnaireProgress,QuestionnaireItem,QuestionnaireTitle,QuestionnaireDescription,QuestionnaireChoices,QuestionnaireChoice,QuestionnaireInput,QuestionnaireError,QuestionnaireActions,QuestionnairePrevious,QuestionnaireSkip,QuestionnaireNext,QuestionnaireSubmit} from "../registry/ui/questionnaire"
import {Label} from "../registry/ui/label"
import {Button} from "../registry/ui/button"
import type {DemoProps} from "../types"

export default function QuestionnaireDemo({ scale }: DemoProps) {
  const [result, setResult] = React.useState(""),
    [session, setSession] = React.useState(0),
    [width, setWidth] = React.useState(180),
    form = React.useRef<HTMLFormElement>(null),
    items = [
      {
        name: "mode",
        required: true,
        choices: [{ value: "survival" }, { value: "creative" }],
      },
      {
        name: "features",
        required: false,
        choices: [{ value: "caves" }, { value: "villages" }],
      },
      { name: "name", required: true },
    ] as const;

  React.useLayoutEffect(() => {
    const node = form.current!;

    const measure = () =>
      { setWidth(Math.max(1, Math.floor(node.clientWidth / scale))); };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, [scale, session]);

  return (
    <>
      <div className="demo-options">
        <Button
          scale={scale}
          className="w-(--demo-width)"
          style={
            /* SAFETY: satisfies checks --demo-width against the owned variable types; the DemoVariables view exposes their CSSProperties base to React's style prop. */
            {
              "--demo-width": `${110 * scale}px`,
            } satisfies DemoVariables as DemoVariables
          }
          onClick={() => {
            setResult("");
            setSession((value) => value + 1);
          }}
        >
          Start again
        </Button>
      </div>
      <div className="demo-stage" data-stage="questionnaire">
        <Questionnaire
          ref={form}
          key={session}
          scale={scale}
          style={{ width: "100%", maxWidth: 600 }}
          items={items}
          shortcuts="numbers"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setResult(`World created: ${data.get("name")}`);
          }}
        >
          <QuestionnaireProgress maxWidth={width} align="center" />
          <QuestionnaireItem name="mode" required>
            <QuestionnaireTitle maxWidth={width} align="center">
              Choose a world mode
            </QuestionnaireTitle>
            <QuestionnaireDescription maxWidth={width} align="center">
              Choose a mode or write another answer.
            </QuestionnaireDescription>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="survival">
                Survival
              </QuestionnaireChoice>
              <QuestionnaireChoice value="creative">
                Creative
              </QuestionnaireChoice>
              <QuestionnaireInput
                aria-label="Another mode"
                placeholder="Another answer"
              />
            </QuestionnaireChoices>
            <QuestionnaireError maxWidth={width} />
          </QuestionnaireItem>
          <QuestionnaireItem name="features" multiple>
            <QuestionnaireTitle maxWidth={width} align="center">
              World features
            </QuestionnaireTitle>
            <QuestionnaireChoices>
              <QuestionnaireChoice value="caves">Caves</QuestionnaireChoice>
              <QuestionnaireChoice value="villages">
                Villages
              </QuestionnaireChoice>
            </QuestionnaireChoices>
            <QuestionnaireError maxWidth={width} />
          </QuestionnaireItem>
          <QuestionnaireItem name="name" required>
            <QuestionnaireTitle maxWidth={width} align="center">
              Name your world
            </QuestionnaireTitle>
            <QuestionnaireInput
              aria-label="World name"
              placeholder="New World"
            />
            <QuestionnaireError maxWidth={width} />
          </QuestionnaireItem>
          <QuestionnaireActions style={{ justifyContent: "center" }}>
            <QuestionnairePrevious />
            <QuestionnaireSkip />
            <QuestionnaireNext />
            <QuestionnaireSubmit>Save world</QuestionnaireSubmit>
          </QuestionnaireActions>
        </Questionnaire>
      </div>
      <div className="demo-result">
        <span />
        {result ? (
          <Label
            scale={1}
            maxWidth={Math.max(80, width)}
            aria-label="World setup result"
          >
            {result}
          </Label>
        ) : (
          <span>Use the keyboard or choose an option</span>
        )}
      </div>
    </>
  );
}
