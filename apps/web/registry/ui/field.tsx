"use client";

import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { useMemo } from "react";

import { Label } from "./label";
import { MinecraftProse } from "./minecraft-prose";
import type { MinecraftProseProps } from "./minecraft-prose";

import "./minecraft-field.css";
import {
  isMinecraftTextContent,
  minecraftClasses as cn,
} from "./minecraft-render";
import { Separator } from "./separator";

const FieldSet = ({
  className,
  ...props
}: React.ComponentProps<"fieldset">) => (
  <fieldset
    data-slot="field-set"
    className={cn("mc-field-set", className)}
    {...props}
  />
);

const FieldLegend = ({
  className,
  variant = "legend",
  ...props
}: MinecraftProseProps & {
  variant?: "legend" | "label";
}) => (
  <MinecraftProse
    as="legend"
    data-slot="field-legend"
    data-variant={variant}
    className={cn("mc-field-legend", className)}
    {...props}
  />
);

const FieldGroup = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="field-group"
    className={cn("mc-field-group", className)}
    {...props}
  />
);

const fieldVariants = cva("mc-field", {
  defaultVariants: { orientation: "vertical" },
  variants: {
    orientation: {
      horizontal: "mc-field-horizontal",
      responsive: "mc-field-responsive",
      vertical: "mc-field-vertical",
    },
  },
});

const Field = ({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) => (
  <div
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Preserve shadcn Field's div group and div props/ref contract.
    role="group"
    data-slot="field"
    data-orientation={orientation}
    className={cn(fieldVariants({ orientation }), className)}
    {...props}
  />
);

const FieldContent = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="field-content"
    className={cn("mc-field-content", className)}
    {...props}
  />
);

const FieldLabel = ({
  className,
  ...props
}: React.ComponentProps<typeof Label>) => (
  <Label
    data-slot="field-label"
    className={cn("mc-field-label", className)}
    {...props}
  />
);

const FieldTitle = ({ className, ...props }: MinecraftProseProps) => (
  <MinecraftProse
    as="div"
    data-slot="field-label"
    className={cn("mc-field-label", className)}
    {...props}
  />
);

const FieldDescription = ({ className, ...props }: MinecraftProseProps) => (
  <MinecraftProse
    as="p"
    data-slot="field-description"
    className={cn("mc-field-description", className)}
    {...props}
  />
);

const FieldSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode;
}) => (
  <div
    data-slot="field-separator"
    data-content={!!children}
    className={cn("mc-field-separator", className)}
    {...props}
  >
    <Separator className="mc-field-divider" />
    {children && (
      <span
        className="mc-field-divider-content"
        data-slot="field-separator-content"
      >
        <MinecraftProse>{children}</MinecraftProse>
      </span>
    )}
  </div>
);

const FieldError = ({
  className,
  children,
  errors,
  scale = 2,
  ...props
}: React.ComponentProps<"div"> & {
  scale?: 1 | 2 | 3;
  errors?: (
    | {
        message?: string;
      }
    | undefined
  )[];
}) => {
  const content = useMemo((): React.ReactNode => {
    if (children) {
      return children;
    }

    if (!errors?.length) {
      return null;
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ];

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message;
    }

    return (
      <ul className="mc-field-error-list">
        {uniqueErrors.map(
          (error, index) =>
            error?.message && (
              <li key={index}>
                <MinecraftProse scale={scale}>{error.message}</MinecraftProse>
              </li>
            )
        )}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn("mc-field-error", className)}
      {...props}
    >
      {isMinecraftTextContent(content) ? (
        <MinecraftProse scale={scale}>{content}</MinecraftProse>
      ) : (
        content
      )}
    </div>
  );
};

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
};
