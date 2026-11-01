import assert from "node:assert/strict"
import path from "node:path"

// Resolve CLI target placeholders using the fixture's configured UI location.
export function installedRegistryFile(entry, consumer, settings, uiDirectory = "src/components/ui") {
  const root = path.resolve(consumer)
  const uiAlias = settings.aliases.ui.replace(/^[@~]\//, "")
  const ui = path.resolve(root, uiDirectory)
  assert.ok(ui.endsWith(path.normalize(uiAlias)), "UI directory must agree with components.json")
  const sourceRoot = ui.slice(0, -path.normalize(uiAlias).length)
  const aliases = { components: "components", ui: "ui", hooks: "hooks", lib: "lib" }
  let target
  const placeholder = /^@(components|ui|hooks|lib)\/(.+)$/.exec(entry.target ?? "")
  if (placeholder) {
    const alias = settings.aliases[aliases[placeholder[1]]]
    assert.ok(alias, `Missing ${placeholder[1]} alias`)
    target = path.resolve(sourceRoot, alias.replace(/^[@~]\//, ""), placeholder[2])
  } else if (entry.target) target = path.resolve(root, entry.target.replace(/^~\//, ""))
  else {
    const kind = entry.type === "registry:hook" ? "hooks" : entry.type === "registry:lib" ? "lib" : "ui"
    const directory = kind === "ui" ? ui : path.resolve(sourceRoot, settings.aliases[kind].replace(/^[@~]\//, ""))
    target = path.join(directory, path.basename(entry.path))
  }
  assert.ok(target.startsWith(root + path.sep), "Installed registry file must stay inside the consumer")
  return target
}
