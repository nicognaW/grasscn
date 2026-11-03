"use client";

import * as React from "react";

import { Button } from "../../registry/ui/button";
import { Card } from "../../registry/ui/card";
import { DocumentText } from "../document-text";

export function Panel({
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
}) {
  return (
    <Card
      scale={2}
      className={`grass-panel ${className}`}
      role="region"
      aria-label={title}
    >
      <div className="grass-panel-heading">
        {tag && (
          <span className="grass-kicker">
            <DocumentText>{tag}</DocumentText>
          </span>
        )}
        <h3>
          <DocumentText>{title}</DocumentText>
        </h3>
        {description && (
          <p>
            <DocumentText>{description}</DocumentText>
          </p>
        )}
      </div>
      {children}
    </Card>
  );
}

export function Action({
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      scale={2}
      {...props}
      className={`grass-action ${props.className ?? ""}`}
    >
      {children}
    </Button>
  );
}
