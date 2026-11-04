import {
  Attachment,
  AttachmentAction,
  AttachmentTrigger,
  AttachmentMedia,
  AttachmentTitle,
} from "@grasscn/web/ui/attachment";
import {
  Questionnaire,
  QuestionnaireProgress,
  QuestionnaireItem,
  QuestionnaireChoice,
  QuestionnaireInput,
  QuestionnairePrevious,
  QuestionnaireNext,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@grasscn/web/ui/questionnaire";
import * as React from "react";

const form = React.createRef<HTMLFormElement>();
const input = React.createRef<HTMLInputElement>();
const label = React.createRef<HTMLLabelElement>();

<Attachment state="uploading" orientation="vertical">
  <AttachmentMedia variant="image">
    <img alt="Custom preview" src="local.png" />
  </AttachmentMedia>
  <AttachmentTitle>
    <strong>Actual rich title</strong>
  </AttachmentTitle>
  <AttachmentTrigger
    render={<a href="#preview" aria-label="Preview attachment" />}
  >
    {undefined}
  </AttachmentTrigger>
  <AttachmentAction
    render={
      // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- AttachmentAction supplies the existing accessible name through its real children or labeling props; retain this empty render receiver to test that forwarding contract.
      <a href="#remove" />
    }
  >
    X
  </AttachmentAction>
</Attachment>;

<Questionnaire
  ref={form}
  items={[{ choices: [{ value: "one" }], name: "mode" }]}
  item="mode"
  onItemChange={(name) => {
    name.toUpperCase();
  }}
  shortcuts="numbers"
  onSubmit={(event) => {
    event.currentTarget satisfies HTMLFormElement;
  }}
>
  <QuestionnaireProgress
    render={(props, state) => (
      <output {...props}>
        {state.current}/{state.total}
      </output>
    )}
  />
  <QuestionnaireItem name="mode" multiple required>
    <QuestionnaireTitle>World mode</QuestionnaireTitle>
    <QuestionnaireChoice
      ref={label}
      value="one"
      onChange={(event) => {
        event.currentTarget.checked satisfies boolean;
      }}
    >
      One
    </QuestionnaireChoice>
    <QuestionnaireInput
      ref={input}
      type="password"
      spellCheck
      autoCorrect="on"
      onChange={(event) => {
        event.currentTarget.value satisfies string;
      }}
    />
  </QuestionnaireItem>
  <QuestionnairePrevious />
  <QuestionnaireNext />
  <QuestionnaireSubmit />
</Questionnaire>;

// @ts-expect-error Vanilla world-entry rows have no small visual variant.
<Attachment size="sm" />;

// @ts-expect-error The original Button does not have an outline variant.
<QuestionnairePrevious variant="outline" />;
