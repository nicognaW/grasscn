"use client";

import { Questionnaire as Primitive } from "@shadcn/react/questionnaire";
import * as React from "react";

import { Button } from "./button";
import { Input } from "./input";
import { MinecraftProse } from "./minecraft-prose";
import { minecraftClasses as cn, minecraftStyle } from "./minecraft-render";
import { playMinecraftClick } from "./minecraft-sound";

import "./minecraft-checkbox.css";
import "./minecraft-questionnaire.css";

const QuestionnaireScale = React.createContext<1 | 2 | 3>(2);

interface TextProps {
  maxWidth?: number;
  align?: "left" | "center";
}

const Questionnaire = ({
  scale = 2,
  className,
  style,
  ...props
}: React.ComponentProps<typeof Primitive.Root> & {
  scale?: 1 | 2 | 3;
}) => (
  <QuestionnaireScale value={scale}>
    <Primitive.Root
      data-slot="questionnaire"
      className={cn(`mc-questionnaire`, className)}
      style={minecraftStyle(
        style,
        (__style) =>
          ({ "--mc-scale": scale, ...__style }) as React.CSSProperties
      )}
      {...props}
    />
  </QuestionnaireScale>
);

const QuestionnaireProgress = ({
  className,
  render,
  maxWidth,
  align,
  ...props
}: React.ComponentProps<typeof Primitive.Progress> & TextProps) => {
  const scale = React.useContext(QuestionnaireScale);

  return (
    <Primitive.Progress
      data-slot="questionnaire-progress"
      className={cn(`mc-questionnaire-progress`, className)}
      render={
        render ?? (
          <MinecraftProse
            as="div"
            scale={scale}
            maxWidth={maxWidth}
            align={align}
          />
        )
      }
      {...props}
    />
  );
};

const QuestionnaireItem = ({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Item>) => (
  <Primitive.Item
    data-slot="questionnaire-item"
    className={cn(`mc-questionnaire-item`, className)}
    {...props}
  />
);

const QuestionnaireTitle = ({
  className,
  render,
  maxWidth,
  align,
  ...props
}: React.ComponentProps<typeof Primitive.Title> & TextProps) => {
  const scale = React.useContext(QuestionnaireScale);

  return (
    <Primitive.Title
      data-slot="questionnaire-title"
      className={cn(`mc-questionnaire-title`, className)}
      render={
        render ?? (
          <MinecraftProse
            as="legend"
            scale={scale}
            maxWidth={maxWidth}
            align={align}
          />
        )
      }
      {...props}
    />
  );
};

const QuestionnaireDescription = ({
  className,
  render,
  maxWidth,
  align,
  ...props
}: React.ComponentProps<typeof Primitive.Description> & TextProps) => {
  const scale = React.useContext(QuestionnaireScale);

  return (
    <Primitive.Description
      data-slot="questionnaire-description"
      className={cn(`mc-questionnaire-description`, className)}
      render={
        render ?? (
          <MinecraftProse
            as="p"
            scale={scale}
            maxWidth={maxWidth}
            align={align}
          />
        )
      }
      {...props}
    />
  );
};

const QuestionnaireChoices = ({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Choices>) => (
  <Primitive.Choices
    data-slot="questionnaire-choices"
    className={cn(`mc-questionnaire-choices`, className)}
    {...props}
  />
);

const QuestionnaireChoice = ({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Choice>) => {
  const scale = React.useContext(QuestionnaireScale);

  return (
    <Primitive.Choice
      data-slot="questionnaire-choice"
      className={cn(`mc-questionnaire-choice`, className)}
      {...props}
    >
      <Primitive.ChoiceInput
        data-slot="questionnaire-choice-input"
        render={(native, state) => {
          const input = native as React.ComponentPropsWithRef<"input">;

          return (
            <input
              {...input}
              data-checked={state.checked ? "" : undefined}
              className={`mc-checkbox ${input.className ?? ""}`}
              style={minecraftStyle(
                input.style,
                (__style) =>
                  ({
                    "--mc-checkbox-checked": `var(--mc-checkbox-selected-native-s${scale})`,
                    "--mc-checkbox-checked-focused": `var(--mc-checkbox-selected-highlighted-native-s${scale})`,
                    "--mc-checkbox-focused": `var(--mc-checkbox-highlighted-native-s${scale})`,
                    "--mc-checkbox-normal": `var(--mc-checkbox-native-s${scale})`,
                    "--mc-scale": scale,
                    appearance: "none",
                    ...__style,
                  }) as React.CSSProperties
              )}
              onClick={(event) => {
                input.onClick?.(event);
                queueMicrotask(() => {
                  if (!event.defaultPrevented && !state.disabled) {
                    playMinecraftClick();
                  }
                });
              }}
            />
          );
        }}
      />
      <Primitive.ChoiceLabel
        data-slot="questionnaire-choice-label"
        render={<MinecraftProse as="span" scale={scale} />}
      >
        {children}
      </Primitive.ChoiceLabel>
      <Primitive.ChoiceShortcut
        data-slot="questionnaire-choice-shortcut"
        render={<MinecraftProse as="span" scale={scale} />}
      />
    </Primitive.Choice>
  );
};

const QuestionnaireChoiceDescription = ({
  className,
  ...props
}: React.ComponentProps<"span">) => {
  const scale = React.useContext(QuestionnaireScale);

  return (
    <MinecraftProse
      as="span"
      scale={scale}
      data-slot="questionnaire-choice-description"
      className={cn(`mc-questionnaire-choice-description`, className)}
      {...props}
    />
  );
};

const QuestionnaireInput = ({
  className,
  render,
  spellCheck = false,
  autoCorrect = "off",
  ...props
}: React.ComponentProps<typeof Primitive.Input>) => {
  const scale = React.useContext(QuestionnaireScale);

  return (
    <Primitive.Input
      data-slot="questionnaire-input"
      className={cn(`mc-questionnaire-input`, className)}
      spellCheck={spellCheck}
      autoCorrect={autoCorrect}
      render={render ?? <Input scale={scale} />}
      {...props}
    />
  );
};

const QuestionnaireError = ({
  className,
  render,
  maxWidth,
  align,
  ...props
}: React.ComponentProps<typeof Primitive.Error> & TextProps) => {
  const scale = React.useContext(QuestionnaireScale);

  return (
    <Primitive.Error
      data-slot="questionnaire-error"
      className={cn(`mc-questionnaire-error`, className)}
      render={
        render ?? (
          <MinecraftProse
            as="p"
            scale={scale}
            maxWidth={maxWidth}
            align={align}
          />
        )
      }
      {...props}
    />
  );
};

const QuestionnaireActions = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="questionnaire-actions"
    className={cn(`mc-questionnaire-actions`, className)}
    {...props}
  />
);

type NavigationSkin = Pick<
  React.ComponentProps<typeof Button>,
  "variant" | "size"
>;

const QuestionnairePrevious = ({
  className,
  render,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof Primitive.Previous> & NavigationSkin) => {
  const scale = React.useContext(QuestionnaireScale);

  return (
    <Primitive.Previous
      data-slot="questionnaire-previous"
      className={cn(`mc-questionnaire-action`, className)}
      render={render ?? <Button scale={scale} variant={variant} size={size} />}
      {...props}
    />
  );
};

const QuestionnaireSkip = ({
  className,
  render,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof Primitive.Skip> & NavigationSkin) => {
  const scale = React.useContext(QuestionnaireScale);

  return (
    <Primitive.Skip
      data-slot="questionnaire-skip"
      className={cn(`mc-questionnaire-action`, className)}
      render={render ?? <Button scale={scale} variant={variant} size={size} />}
      {...props}
    />
  );
};

const QuestionnaireNext = ({
  className,
  render,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof Primitive.Next> & NavigationSkin) => {
  const scale = React.useContext(QuestionnaireScale);

  return (
    <Primitive.Next
      data-slot="questionnaire-next"
      className={cn(`mc-questionnaire-action`, className)}
      render={render ?? <Button scale={scale} variant={variant} size={size} />}
      {...props}
    />
  );
};

const QuestionnaireSubmit = ({
  className,
  render,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof Primitive.Submit> & NavigationSkin) => {
  const scale = React.useContext(QuestionnaireScale);

  return (
    <Primitive.Submit
      data-slot="questionnaire-submit"
      className={cn(`mc-questionnaire-action`, className)}
      render={render ?? <Button scale={scale} variant={variant} size={size} />}
      {...props}
    />
  );
};

export {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
};
