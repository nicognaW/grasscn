import { Button, buttonVariants } from "@grasscn/web/ui/button";
// Compile-time contract: only native visual variants, with standard web props.
export function ButtonApiContract() {
    const supported = <Button render={<a href="#inventory"/>} variant="default" size="default" scale={3} style={{ width: 309 }}>{"Inventory"}</Button>;
    // @ts-expect-error Minecraft has no shadcn outline button.
    const outline = <Button variant="outline">Outline</Button>;
    // @ts-expect-error Minecraft has no shadcn destructive color variant.
    const destructive = buttonVariants({ variant: "destructive" });
    // @ts-expect-error Minecraft GUI scaling replaces shadcn size presets.
    const small = <Button size="sm">Small</Button>;
    // @ts-expect-error Icon presets do not describe a native button size.
    const icon = buttonVariants({ size: "icon" });
    return [supported, outline, destructive, small, icon];
}
