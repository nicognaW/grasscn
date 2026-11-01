import { test, expect } from "./verified-test";

import { minecraftClickSound } from "../../../apps/web/registry/ui/minecraft-sound-assets";

test("AlertDialog follows Base UI initial focus, traps focus, dismisses on Escape and restores its trigger",async({page})=>{
  await page.goto("/?component=alert-dialog")
  const trigger=page.getByRole("button",{name:"Open confirmation",exact:true}),dialog=page.getByRole("alertdialog",{name:"Are you sure?",exact:true})
  await trigger.click();await expect(dialog).toBeVisible();await expect(dialog).toHaveAccessibleDescription("This action cannot be undone.")
  const cancel=dialog.getByRole("button",{name:"No",exact:true}),action=dialog.getByRole("button",{name:"Yes",exact:true})
  await expect(action).toBeFocused();await page.keyboard.press("Tab");await expect(cancel).toBeFocused();await page.keyboard.press("Tab");await expect(action).toBeFocused()
  await page.keyboard.press("Escape");await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused()
})

test("AlertDialog outside clicks retain the modal and cancel does not confirm",async({page})=>{
  await page.goto("/?component=alert-dialog&open")
  const dialog=page.getByRole("alertdialog")
  await expect(dialog).toBeVisible();await page.mouse.click(5,5);await expect(dialog).toBeVisible()
  await dialog.getByRole("button",{name:"No",exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByLabel("Confirmations")).toHaveText("0")
})

test("AlertDialog action confirms once and closes",async({page})=>{
  await page.goto("/?component=alert-dialog&open")
  await page.getByRole("alertdialog").getByRole("button",{name:"Yes",exact:true}).click()
  await expect(page.getByRole("alertdialog")).toHaveCount(0);await expect(page.getByLabel("Confirmations")).toHaveText("1")
})

test("AlertDialog disabled action is inert and consumers can prevent action dismissal",async({page})=>{
  await page.goto("/?component=alert-dialog&open&disabledIndex=0")
  const dialog=page.getByRole("alertdialog"),action=dialog.getByRole("button",{name:"Yes",exact:true})
  await expect(action).toBeDisabled();await action.dispatchEvent("click");await expect(page.getByLabel("Confirmations")).toHaveText("0");await expect(dialog).toBeVisible()
  await page.goto("/?component=alert-dialog&open&preventAction")
  await action.click();await expect(dialog).toBeVisible();await expect(page.getByLabel("Confirmations")).toHaveText("1")
})

test("AlertDialog respects a controlled parent rejecting open changes",async({page})=>{
  await page.goto("/?component=alert-dialog&reject")
  await page.getByRole("button",{name:"Open confirmation",exact:true}).click();await expect(page.getByRole("alertdialog")).toHaveCount(0)
})

test("AlertDialog composes elements, preserves forms and forwards DOM refs without duplicate button skins",async({page})=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message))
  await page.goto("/?component=alert-dialog-composition")
  const trigger=page.getByRole("button",{name:"Composed confirmation",exact:true})
  await trigger.click();const dialog=page.getByRole("alertdialog",{name:"Composed title",exact:true})
  await expect(dialog).toHaveAccessibleDescription("Composed description");expect(await dialog.evaluate(node=>node.tagName)).toBe("SECTION")
  await dialog.getByRole("button",{name:"Inspect confirmation refs",exact:true}).click();await expect(page.getByLabel("Confirmation refs")).toHaveText("BUTTON,SECTION,A,BUTTON")
  await dialog.getByRole("textbox",{name:"Confirmation form input",exact:true}).fill("World");await page.keyboard.press("Enter");await expect(page.getByLabel("Confirmation submissions")).toHaveText("1");await expect(dialog).toBeVisible()
  const link=dialog.getByRole("button",{name:"Confirm link",exact:true}),cancel=dialog.getByRole("button",{name:"Cancel composed",exact:true})
  await expect(link).toHaveCSS("height","40px");await expect(link.locator(".mc-button-surface")).toHaveCount(1);await expect(cancel.locator(".mc-button-surface")).toHaveCount(1)
  await cancel.click();await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();await trigger.click();await link.click();await expect(dialog).toBeVisible();await cancel.click();await expect(dialog).toHaveCount(0);expect(errors).toEqual([])
})

test("AlertDialog uses one original click per button activation and keeps hover and Escape silent",async({page})=>{
  await page.addInitScript(()=>{(window as any).__confirmationSounds=[];HTMLMediaElement.prototype.play=function(){(window as any).__confirmationSounds.push({source:this.src,volume:this.volume,rate:this.playbackRate});return Promise.resolve()}})
  const sounds=()=>page.evaluate(()=>(window as any).__confirmationSounds)
  await page.goto("/?component=alert-dialog")
  const trigger=page.getByRole("button",{name:"Open confirmation",exact:true})
  await trigger.hover();expect(await sounds()).toHaveLength(0);await trigger.click();expect(await sounds()).toEqual([{source:minecraftClickSound,volume:.25,rate:1}])
  await page.keyboard.press("Escape");expect(await sounds()).toHaveLength(1)
  await trigger.click();await page.getByRole("alertdialog").getByRole("button",{name:"Yes",exact:true}).click();expect(await sounds()).toHaveLength(3)
})
