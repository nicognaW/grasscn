import { DatePickerDemo } from "@grasscn/web/blocks/date-picker";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from "@grasscn/web/ui/avatar";
import { Calendar } from "@grasscn/web/ui/calendar";
import * as React from "react";

const imageRef = React.createRef<HTMLImageElement>();
const rootRef = React.createRef<HTMLSpanElement>();

<Avatar render={<a href="#profile" />} ref={rootRef} size="sm">
  <>
    <AvatarImage
      ref={imageRef}
      alt="Steve"
      skin="wide/steve"
      onLoadingStatusChange={(status) => {
        status.toUpperCase();
      }}
    />
    <AvatarFallback delay={100}>玩家</AvatarFallback>
    <AvatarBadge>1</AvatarBadge>
  </>
</Avatar>;

<AvatarGroup>
  <AvatarGroupCount>+2</AvatarGroupCount>
</AvatarGroup>;

<Calendar
  mode="single"
  selected={new Date()}
  onSelect={(value) => {
    value?.getDate();
  }}
/>;

<Calendar
  mode="multiple"
  onSelect={(value) => {
    value?.map((date) => date.getDate());
  }}
/>;

<Calendar
  mode="range"
  required
  selected={{ from: new Date() }}
  onSelect={(range) => {
    range.from?.getDate();
  }}
/>;

<DatePickerDemo scale={2} />;

// @ts-expect-error Native Avatar exposes only verified square sizes.
<Avatar size="xl" />;

// @ts-expect-error Unknown original skin names cannot silently render a placeholder.
<AvatarImage skin="wide/fake" />;

// @ts-expect-error Minecraft has no ghost button skin.
<Calendar buttonVariant="ghost" />;
