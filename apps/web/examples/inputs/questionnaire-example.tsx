"use client";
import { useState } from "react";

import { Label } from "@/components/ui/label";
import {
  Questionnaire,
  QuestionnaireItem,
  QuestionnaireTitle,
  QuestionnaireChoices,
  QuestionnaireChoice,
  QuestionnaireInput,
  QuestionnaireError,
  QuestionnaireActions,
  QuestionnairePrevious,
  QuestionnaireNext,
  QuestionnaireSubmit,
} from "@/components/ui/questionnaire";
const items = [
  {
    name: "mode",
    required: true,
    choices: [{ value: "survival" }, { value: "creative" }],
  },
  { name: "name", required: true },
] as const;
export default function QuestionnaireExample() {
  const [result, setResult] = useState("");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Questionnaire
        items={items}
        shortcuts="numbers"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setResult(`${data.get("name")}: ${data.get("mode")}`);
        }}
      >
        <QuestionnaireItem name="mode" required>
          <QuestionnaireTitle>Choose a world mode</QuestionnaireTitle>
          <QuestionnaireChoices>
            <QuestionnaireChoice value="survival">Survival</QuestionnaireChoice>
            <QuestionnaireChoice value="creative">Creative</QuestionnaireChoice>
          </QuestionnaireChoices>
          <QuestionnaireError />
        </QuestionnaireItem>
        <QuestionnaireItem name="name" required>
          <QuestionnaireTitle>Name your world</QuestionnaireTitle>
          <QuestionnaireInput aria-label="World name" placeholder="New World" />
          <QuestionnaireError />
        </QuestionnaireItem>
        <QuestionnaireActions>
          <QuestionnairePrevious />
          <QuestionnaireNext />
          <QuestionnaireSubmit>Save world</QuestionnaireSubmit>
        </QuestionnaireActions>
      </Questionnaire>
      <output aria-label="World setup result">
        <Label>{result || "World not saved"}</Label>
      </output>
    </div>
  );
}
