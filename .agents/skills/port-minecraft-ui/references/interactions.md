# Interaction coverage

Choose sequences applicable to the element. Separate native behavior, browser normalization and accessible web additions.

## Dragging with selectable children

Exercise click without motion, jitter below threshold, drag starting on a child, release outside, pointer cancellation, subsequent click, keyboard selection after drag, and tooltip visibility. Verify callbacks as well as visible state. A web drag threshold is not a native guarantee without evidence.

Advancement Tree passed 12 pixel cases before selection/panning conflicts surfaced. `packages/tests/tests/advancement-gestures.spec.ts` retains the regressions.

## Scroll controls

Recover wheel, press, drag and visual thumb arithmetic independently. Cover empty/one/full/overflow and large lists, fractional input, boundaries, delta modes, consecutive events in one React batch, and controlled/uncontrolled usage. Synthetic wheel normalization does not prove hardware behavior.

Trading's thumb travels 113 logical pixels but drag divides by 112. Press only arms dragging. Wheel uses clamp(trunc(current-nativeVerticalAmount),0,maxOffset), with float32 drag arithmetic. These are Trading-specific rules. See `packages/tests/tests/reference/trading/scrollbar/scroll-rules.json`, `trading-scroll-events.json`, and `interaction-repeatability.json`.

`packages/tests/tests/trading-scroll.spec.ts` drives those native traces. Its burst regression caught expected offset 2 becoming 1 through stale React state.

## Replaceable content

Test A → B → A in one mounted component, explicit overrides, loading/failure/recovery, and stale asynchronous responses where relevant. Freeze external bytes for repeatable tests. Cold navigation for each input cannot prove replacement.

Player Preview inherited the last preset's arm model. Cover custom wide/slim skins after both presets and front/back/exact 180-degree views. `packages/tests/tests/player-custom-skin.spec.ts` and `packages/tests/tests/reference/player-preview/custom-skins/` retain the checks. Auto-versus-explicit web output is regression evidence; a captured reference comes from Minecraft itself.
