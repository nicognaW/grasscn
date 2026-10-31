import { Separator } from "../registry/ui/separator";
export function SeparatorApiContract() {
    const supported = <Separator orientation="horizontal" edge="footer" role="separator" scale={3} aria-label="Settings"/>;
    const composed = <Separator render={<hr />}>{undefined}</Separator>;
    // @ts-expect-error No native vertical separator is established.
    const vertical = <Separator orientation="vertical"/>;
    // @ts-expect-error Only original header/footer surfaces are available.
    const invented = <Separator edge="outline"/>;
    return [supported, composed, vertical, invented];
}
