import { AspectRatio } from "@grasscn/web/ui/aspect-ratio";
import {
  ButtonGroup,
  ButtonGroupText,
  ButtonGroupSeparator,
  buttonGroupVariants,
} from "@grasscn/web/ui/button-group";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@grasscn/web/ui/pagination";
import * as React from "react";

const StructuralTypes = () => {
  const div = React.createRef<HTMLDivElement>();
  const anchor = React.createRef<HTMLAnchorElement>();

  return (
    <>
      <AspectRatio ref={div} ratio={16 / 9} style={{ overflow: "hidden" }}>
        <img alt="Pixel art" />
      </AspectRatio>
      <ButtonGroup
        ref={div}
        orientation="vertical"
        scale={3}
        className={buttonGroupVariants({ orientation: "horizontal" })}
      >
        <ButtonGroupText maxWidth={100} align="center" scale={3}>
          世界
        </ButtonGroupText>
        <ButtonGroupText render={<span />}>Rich content</ButtonGroupText>
        <ButtonGroupSeparator
          ref={div}
          orientation="vertical"
          role="separator"
        />
      </ButtonGroup>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink
              ref={anchor}
              href="#2"
              isActive
              scale={3}
              size="default"
            >
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationPrevious href="#1" />
          <PaginationNext href="#3" />
          <PaginationEllipsis />
        </PaginationContent>
      </Pagination>
    </>
  );
};

// @ts-expect-error Minecraft provides no icon-sized visual variant.
const unsupported = <PaginationLink size="icon" />;

void StructuralTypes;

void unsupported;
