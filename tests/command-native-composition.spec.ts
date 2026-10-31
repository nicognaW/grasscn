import {test, expect} from "./verified-test"

test("Command infers rich item values and hides groups without matching items", async ({page}) => {
  await page.goto("/?component=command&implicit=1")
  const input=page.getByRole("combobox", {name:"Search commands"})
  await input.fill("calendar")
  await expect(page.getByRole("option", {name:"Calendar", exact:true})).toBeVisible()
  const groups=page.locator('[data-slot="command-group"]')
  await expect(groups.filter({hasText:"Tools"})).toBeVisible()
  await expect(groups.filter({hasText:"World"})).toBeHidden()
  await input.press("Enter")
  await expect(page.getByLabel("Selected command")).toHaveText("Calendar")
  await input.fill("no matching action")
  await expect(groups.filter({hasText:"Tools"})).toBeHidden()
  await expect(page.getByRole("status", {name:""}).filter({hasText:"No commands found."})).toBeVisible()
})

 test("Command force-mounted groups keep their items keyboard actionable", async ({page}) => {
  await page.goto("/?component=command&implicit=1&force=1")
  const input=page.getByRole("combobox", {name:"Search commands"})
  await input.fill("no matching action")
  await expect(page.getByRole("option")).toHaveCount(2)
  await input.press("ArrowDown")
  await input.press("Enter")
  await expect(page.getByLabel("Selected command")).not.toHaveText("")
 })
