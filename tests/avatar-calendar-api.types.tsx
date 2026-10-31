import*as React from'react';import{Avatar,AvatarImage,AvatarFallback,AvatarBadge,AvatarGroup,AvatarGroupCount}from'../registry/ui/avatar';import{Calendar,CalendarDayButton}from'../registry/ui/calendar';import{DatePicker}from'../registry/ui/date-picker';const imageRef=React.createRef<HTMLImageElement>(),rootRef=React.createRef<HTMLSpanElement>();<Avatar ref={rootRef} asChild size="sm"><a href="#profile"><AvatarImage ref={imageRef} alt="Steve" skin="wide/steve" onLoadingStatusChange={status=>status.toUpperCase()}/><AvatarFallback delayMs={100}>玩家</AvatarFallback><AvatarBadge>1</AvatarBadge></a></Avatar>;<AvatarGroup><AvatarGroupCount>+2</AvatarGroupCount></AvatarGroup>;<Calendar mode="single" selected={new Date()} onSelect={value=>value?.getDate()}/>;<Calendar mode="multiple" onSelect={value=>value?.map(date=>date.getDate())}/>;<Calendar mode="range" required selected={{from:new Date()}} onSelect={range=>range.from?.getDate()}/>;<DatePicker mode="range" selected={{from:new Date()}} onSelect={range=>range?.from?.getDate()} triggerProps={{ref:React.createRef<HTMLButtonElement>()}}/>;
// @ts-expect-error Native Avatar exposes only verified square sizes.
<Avatar size="xl"/>;
// @ts-expect-error Unknown original skin names cannot silently render a placeholder.
<AvatarImage skin="wide/fake"/>;
// @ts-expect-error Minecraft has no ghost button skin.
<Calendar buttonVariant="ghost"/>;
