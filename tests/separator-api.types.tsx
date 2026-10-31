import { Separator } from "../registry/ui/separator"

export function SeparatorApiContract() {
  const supported = <Separator orientation="horizontal" edge="footer" decorative={false} scale={3} aria-label="Settings" />
  const composed = <Separator asChild><hr /></Separator>
  // @ts-expect-error No native vertical separator is established.
  const vertical = <Separator orientation="vertical" />
  // @ts-expect-error Only original header/footer surfaces are available.
  const invented = <Separator edge="outline" />
  return [supported, composed, vertical, invented]
}
