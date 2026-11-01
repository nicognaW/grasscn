import * as React from "react";
import { Toaster, toast as sonner } from "../../../apps/web/registry/ui/sonner";
const host = React.createRef<HTMLElement>();
sonner("Saved", { description: "Hello", action: { label: "Undo", onClick: () => { } } });
sonner.success("Success");
sonner.promise(Promise.resolve(1), { loading: "Loading", success: value => String(value), error: "Failed" });
const toaster = <Toaster ref={host} scale={1} position="top-right" gap={4} duration={5000} richColors={false} expand={true}/>;

// @ts-expect-error Minecraft notifications use their native palette.
const richColors = <Toaster richColors/>;
// @ts-expect-error Minecraft notifications have no collapsed stack appearance.
const collapsed = <Toaster expand={false}/>;
void [toaster, richColors, collapsed];
