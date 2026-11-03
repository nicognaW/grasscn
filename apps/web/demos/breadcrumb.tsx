import * as React from "react";

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "../registry/ui/breadcrumb";
import { Input } from "../registry/ui/input";
import type { DemoProps } from "../types";

const BreadcrumbDemo = ({ scale }: DemoProps) => {
  const [current, setCurrent] = React.useState("My world");
  const [visited, setVisited] = React.useState("None");

  return (
    <>
      <div className="demo-options">
        <label>
          Current page
          <Input
            aria-label="Breadcrumb current page"
            value={current}
            scale={scale}
            onChange={(event) => {
              setCurrent(event.target.value);
            }}
            className="w-70"
          />
        </label>
      </div>
      <div className="demo-stage" data-stage="breadcrumb">
        <Breadcrumb scale={scale}>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="#breadcrumb"
                onClick={() => {
                  setVisited("Worlds");
                }}
              >
                Worlds
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                render={
                  <a
                    href="#breadcrumb"
                    onClick={() => {
                      setVisited("Saved games");
                    }}
                  />
                }
              >
                {"Saved games"}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{current}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="demo-result">
        <span />
        <output aria-label="Breadcrumb last destination">
          Visited: {visited}
        </output>
        <span>Tab to a link, then press Enter</span>
      </div>
    </>
  );
};

export { BreadcrumbDemo as default };
