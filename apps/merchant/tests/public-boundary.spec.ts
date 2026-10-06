import {test,expect} from "@playwright/test";
test("public route uses published API content and ignores editor drafts",async({page})=>{
 await page.addInitScript(()=>{sessionStorage.setItem("eyn-design-draft:101",JSON.stringify({storefrontConfig:{heroTitle:"SECRET DRAFT"}}));});
 await page.route("**/api/v1/storefront/published-shop",route=>route.fulfill({json:{id:101,name:"Published shop",slug:"published-shop",currency:"MMK",description:"Published",theme:"eyn-light",products:[],bestSellerIds:[],storefrontConfig:{heroTitle:"Published title"}}}));
 await page.goto("/shop/published-shop");
 await expect(page.getByRole("heading",{name:"Published title"})).toBeVisible();
 await expect(page.getByText("SECRET DRAFT")).toHaveCount(0);
 await expect(page.locator("[contenteditable]")).toHaveCount(0);
});
test("unpublished store never renders a storefront",async({page})=>{
 await page.route("**/api/v1/storefront/private-shop",route=>route.fulfill({status:404,json:{message:"Store not found."}}));
 await page.goto("/shop/private-shop");
 await expect(page.getByRole("heading",{name:"This storefront is not available yet."})).toBeVisible();
 await expect(page.locator(".sf")).toHaveCount(0);
});
