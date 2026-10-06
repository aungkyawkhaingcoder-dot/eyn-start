import { test, expect } from "@playwright/test";
test("independent settings fields submit the latest draft values", async ({page}) => {
 let saved: Record<string, unknown> | undefined;
 const store={id:1,name:"Studio",slug:"studio",description:"Original",currency:"MMK",published:false,theme:"eyn-light",storefrontConfig:{},updatedAt:"2026-09-29T00:00:00Z"};
 await page.route("**/api/v1/stores**",async route=>{
  if(route.request().method()==="PUT") saved=route.request().postDataJSON();
  const url=route.request().url();
  await route.fulfill({json:url.includes("/products")?[]:url.endsWith("/stores")?[store]:{...store,...saved}});
 });
 await page.goto("/stores/1/settings");
 await page.getByLabel("Store name",{exact:true}).fill("New studio");
 await page.getByLabel("Store URL",{exact:true}).fill("NEW-STUDIO");
 await expect(page.getByText("Your storefront: /shop/new-studio",{exact:false})).toBeVisible();
 await page.getByLabel("About your store",{exact:true}).fill("Updated description");
 await page.getByRole("combobox",{name:/Currency/}).selectOption("USD");
 await page.getByRole("switch",{name:"Publish store"}).press("Space");
 await page.locator('button[type="submit"]').click();
 await expect.poll(()=>saved).toEqual({name:"New studio",slug:"new-studio",description:"Updated description",currency:"USD",published:true});
});
