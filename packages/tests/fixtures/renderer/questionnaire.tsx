import {
  Questionnaire,
  QuestionnaireItem,
  QuestionnaireTitle,
  QuestionnaireDescription,
  QuestionnaireChoices,
  QuestionnaireChoice,
  QuestionnaireInput,
  QuestionnaireError,
  QuestionnaireActions,
  QuestionnairePrevious,
  QuestionnaireSkip,
  QuestionnaireNext,
  QuestionnaireSubmit,
  QuestionnaireProgress,
  QuestionnaireChoiceDescription,
} from "@grasscn/web/ui/questionnaire";
import type { ReactNode } from "react";
import * as React from "react";

export const QuestionnaireFixture = () => {
  const q = new URLSearchParams(location.search);

  // SAFETY: owned fixture callers select the public GUI scales 1, 2, or 3; retain this query parse and its scale-2 default.
  const scale =
    // SAFETY: owned fixture callers serialize the public GUI scales 1, 2, or 3; the existing Number conversion, default and component validation remain unchanged.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
    Number(q.get("scale") ?? 2) as 1 | 2 | 3;

  const [result, setResult] = React.useState("");
  const [item, setItem] = React.useState("");
  const [tag, setTag] = React.useState("");
  const [forced, setForced] = React.useState("mode");
  const ref = React.useRef<HTMLFormElement>(null);

  React.useLayoutEffect(() => {
    const chainedBackgroundOuter = document.documentElement.style;
    const chainedBackgroundInner = document.body.style;
    const chainedBackgroundValue = q.get("background") ?? "#202020";
    chainedBackgroundInner.background = chainedBackgroundValue;
    chainedBackgroundOuter.background = chainedBackgroundValue;
  }, []);

  const bounds = {
    border: 0,
    height: Number(q.get("height") ?? 20) * scale,
    left: Number(q.get("x") ?? 16) * scale,
    margin: 0,
    padding: 0,
    position: "fixed",
    top: Number(q.get("y") ?? 16) * scale,
    width: Number(q.get("width") ?? 200) * scale,
  } satisfies React.CSSProperties;

  if (q.has("native")) {
    const part = q.get("part") ?? "title";
    const text = q.get("label") ?? "Hello Minecraft";

    const textProps = {
      align:
        // SAFETY: owned fixture callers serialize the align option from the actual component protocol ("left" | "center"); preserve this URL read, original default and component handling.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Exact owned fixture URL producer boundary; no runtime narrowing or validation added.
        (q.get("align") ?? "left") as "left" | "center",
      "data-subject": "true",
      id: "subject",
      maxWidth: q.has("wrapWidth") ? Number(q.get("wrapWidth")) : undefined,
      style: bounds,
    };

    if (part === "input") {
      return (
        <Questionnaire scale={scale} items={[{ name: "input" }]}>
          <QuestionnaireItem name="input">
            <QuestionnaireInput
              id="subject"
              aria-label="Native input"
              defaultValue={q.get("text") ?? ""}
              disabled={q.get("state") === "disabled"}
              readOnly={q.get("state")?.includes("readonly")}
              maxLength={
                q.has("maxLength") ? Number(q.get("maxLength")) : undefined
              }
              placeholder={q.get("placeholder") ?? undefined}
              style={bounds}
              data-subject="true"
            />
          </QuestionnaireItem>
        </Questionnaire>
      );
    }

    if (part === "checkbox") {
      return (
        <Questionnaire
          scale={scale}
          items={[
            {
              name: "check",
              choices: [
                { value: "yes", disabled: q.get("state") === "disabled" },
              ],
            },
          ]}
        >
          <QuestionnaireItem name="check" multiple={!q.has("radio")}>
            <QuestionnaireChoices>
              <QuestionnaireChoice
                id="subject"
                value="yes"
                checked={q.get("checked") === "true"}
                disabled={q.get("state") === "disabled"}
                className="fixture-questionnaire-native-choice"
                style={{ ...bounds }}
                data-subject="true"
              />
            </QuestionnaireChoices>
          </QuestionnaireItem>
        </Questionnaire>
      );
    }

    if (part === "action") {
      const action = q.get("action") ?? "next";

      let Action:
        | typeof QuestionnairePrevious
        | typeof QuestionnaireSkip
        | typeof QuestionnaireSubmit
        | typeof QuestionnaireNext;

      if (action === "previous") {
        Action = QuestionnairePrevious;
      } else if (action === "skip") {
        Action = QuestionnaireSkip;
      } else if (action === "submit") {
        Action = QuestionnaireSubmit;
      } else {
        Action = QuestionnaireNext;
      }

      const active = action === "submit" ? "third" : "second";

      return (
        <Questionnaire
          scale={scale}
          defaultItem={active}
          items={[{ name: "first" }, { name: "second" }, { name: "third" }]}
        >
          <QuestionnaireItem name="first" />
          <QuestionnaireItem name="second" />
          <QuestionnaireItem name="third" />
          <Action
            id="subject"
            style={bounds}
            disabled={q.get("state") === "disabled"}
            data-subject="true"
          >
            {text}
          </Action>
        </Questionnaire>
      );
    }

    let selectedFixtureBranch1: ReactNode;

    if (part === "description") {
      selectedFixtureBranch1 = (
        <QuestionnaireDescription {...textProps}>
          {text}
        </QuestionnaireDescription>
      );
    } else if (part === "error") {
      selectedFixtureBranch1 = (
        <QuestionnaireError {...textProps}>{text}</QuestionnaireError>
      );
    } else {
      selectedFixtureBranch1 =
        part === "progress" ? (
          <QuestionnaireProgress {...textProps}>{text}</QuestionnaireProgress>
        ) : (
          <QuestionnaireTitle {...textProps}>{text}</QuestionnaireTitle>
        );
    }

    return (
      <Questionnaire scale={scale} items={[{ name: "text" }]}>
        <QuestionnaireItem name="text" invalid={part === "error"}>
          {selectedFixtureBranch1}
        </QuestionnaireItem>
      </Questionnaire>
    );
  }

  const items = [
    {
      choices: [{ value: "survival" }, { value: "creative" }],
      name: "mode",
      required: true,
    },
    {
      choices: [{ value: "caves" }, { value: "villages" }],
      name: "features",
      required: false,
    },
    { name: "name", required: true },
  ] as const;

  return (
    <>
      <Questionnaire
        ref={ref}
        scale={scale}
        items={items}
        {...(q.has("controlled") ? { item: forced } : {})}
        shortcuts="numbers"
        onItemChange={setItem}
        onSubmit={(event) => {
          event.preventDefault();
          setResult(
            JSON.stringify([...new FormData(event.currentTarget).entries()])
          );
        }}
      >
        <QuestionnaireProgress
          id="progress"
          render={
            q.has("customRender")
              ? (props, state) => (
                  <output {...props} id="custom-progress">
                    {state.current}/{state.total}
                  </output>
                )
              : undefined
          }
        />
        <QuestionnaireItem name="mode" required>
          <QuestionnaireTitle>Choose mode 世界</QuestionnaireTitle>
          <QuestionnaireDescription>
            Select a mode, or enter another answer.
          </QuestionnaireDescription>
          <QuestionnaireChoices>
            <QuestionnaireChoice value="survival">
              Survival
              <QuestionnaireChoiceDescription>
                Gather and build
              </QuestionnaireChoiceDescription>
            </QuestionnaireChoice>
            <QuestionnaireChoice value="creative">Creative</QuestionnaireChoice>
            <QuestionnaireInput
              aria-label="Other mode"
              placeholder="Another mode"
            />
          </QuestionnaireChoices>
          <QuestionnaireError />
        </QuestionnaireItem>
        <QuestionnaireItem name="features" multiple>
          <QuestionnaireTitle>World features</QuestionnaireTitle>
          <QuestionnaireChoices>
            <QuestionnaireChoice value="caves">Caves</QuestionnaireChoice>
            <QuestionnaireChoice value="villages">Villages</QuestionnaireChoice>
          </QuestionnaireChoices>
          <QuestionnaireError />
        </QuestionnaireItem>
        <QuestionnaireItem name="name" required>
          <QuestionnaireTitle>World name</QuestionnaireTitle>
          <QuestionnaireInput aria-label="World name" />
          <QuestionnaireError />
        </QuestionnaireItem>
        <QuestionnaireActions>
          <QuestionnairePrevious />
          <QuestionnaireSkip />
          <QuestionnaireNext />
          <QuestionnaireSubmit>Save world</QuestionnaireSubmit>
        </QuestionnaireActions>
      </Questionnaire>
      <button
        type="button"
        id="read-questionnaire-ref"
        onClick={() => {
          setTag(ref.current?.tagName ?? "");
        }}
      >
        Read ref
      </button>
      <output id="questionnaire-ref">{tag}</output>
      <button
        type="button"
        id="force-features"
        onClick={() => {
          setForced("features");
        }}
      >
        External step
      </button>
      <output id="active">{item}</output>
      <output id="result">{result}</output>
    </>
  );
};
