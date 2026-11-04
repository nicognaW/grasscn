"use client";

import * as React from "react";

import { Button } from "../../registry/ui/button";
import { Card } from "../../registry/ui/card";
import { DocumentText } from "../document-text";

export const Panel = ({
  title,
  description,
  tag,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  tag?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <Card
    scale={2}
    className={`grass-panel ${className}`}
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- This region belongs to Card's div-based artwork and scale API; replacing the component with section drops the card contract.
    role="region"
    aria-label={title}
  >
    <div className="grass-panel-heading">
      {(tag ?? "") !== "" && (
        <span className="grass-kicker">
          <DocumentText>{tag}</DocumentText>
        </span>
      )}
      <h3>
        <DocumentText>{title}</DocumentText>
      </h3>
      {(description ?? "") !== "" && (
        <p>
          <DocumentText>{description}</DocumentText>
        </p>
      )}
    </div>
    {children}
  </Card>
);

export const Action = ({
  children,
  ...props
}: React.ComponentProps<typeof Button>) => (
  <Button
    scale={2}
    {...props}
    className={`grass-action ${props.className ?? ""}`}
  >
    {children}
  </Button>
);
