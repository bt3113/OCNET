import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = "/OCNET";

// D. xAI is a Technology Vendor. Its statements are sourced Use Cases, not Builds.
test("xAI is a Technology Vendor whose statements are sourced Use Cases", async ({ page }) => {
  await page.goto(`${base}/technology-vendors/xai`);
  await expect(page.locator("main h1")).toHaveText("xAI");
  await expect(page.getByRole("note").filter({ hasText: "has not reviewed this profile" })).toBeVisible();
  const tabs = page.getByRole("tablist", { name: "xAI profile sections" });
  await expect(tabs.getByRole("tab", { name: /Vendor-stated Use Cases/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".vendor-use-case-list > li")).toHaveCount(11);
  await expect(page.locator("main")).toContainText("These are vendor statements, not Builds");
  await expect(tabs.getByRole("tab", { name: /Independent Builds/ })).toBeVisible();

  await tabs.getByRole("tab", { name: /Products/ }).click();
  await expect(page).toHaveURL(/tab=products/);
  await expect(page.locator("main")).toContainText("Grok Voice Agent API");

  await tabs.getByRole("tab", { name: /About & sources/ }).click();
  await expect(page.getByRole("link", { name: /Grok use cases/ })).toHaveAttribute("href", "https://x.ai/grok/use-cases");
  await expect(page.locator("main")).toContainText("does not let the vendor delete or rewrite independent Builds");
});

test("a vendor-origin Use Case keeps attribution and the original statement", async ({ page }) => {
  await page.goto(`${base}/use-cases/handle-customer-inquiries-with-voice-agents`);
  await expect(page.locator("main h1")).toHaveText("Handle customer inquiries with voice agents");
  const origin = page.locator(".use-case-origin");
  await expect(origin).toContainText("Originally listed by xAI");
  await expect(origin.getByRole("link", { name: "source" })).toHaveAttribute("href", "https://x.ai/grok/use-cases");
  await expect(origin).toContainText("does not own it");
  await page.getByRole("tab", { name: /Sources/ }).click();
  await expect(page.locator(".source-provenance")).toContainText("Technology vendor · xAI");
  await expect(page.locator(".source-provenance")).toContainText("Retrieved");
  await expect(page.locator(".source-provenance")).toContainText("Wording to be verified");
});

test("legacy xAI URLs redirect to the new concepts", async ({ page }) => {
  await page.goto(`${base}/providers/xai`);
  await expect(page).toHaveURL(/\/technology-vendors\/xai$/);
  await page.goto(`${base}/builds/xai-voice-customer-support`);
  await expect(page).toHaveURL(/\/use-cases\/handle-customer-inquiries-with-voice-agents$/);
  await expect(page.locator("main h1")).toHaveText("Handle customer inquiries with voice agents");
  // A broad vendor area became a category, not a Use Case.
  await page.goto(`${base}/use-cases/software-development`);
  await expect(page).toHaveURL(/\/use-cases\?category=/);
  await expect(page.locator(".use-case-card").first()).toBeVisible();
});

test("vendor-stated Use Cases do not count as Builds", async ({ page }) => {
  await page.goto(`${base}/builds`);
  await expect(page.locator(".build-card", { hasText: /Listed by xAI/ })).toHaveCount(0);
  await page.goto(`${base}/technologies/grok-build`);
  await expect(page.locator("main")).toContainText("Plan and implement code changes");
  await page.goto(`${base}/search?q=grok`);
  await expect(page.locator("main")).toContainText("Grok");
});

for (const path of ["/technology-vendors/xai", "/technology-vendors/xai?tab=about", "/use-cases/document-data-extraction"]) {
  test(`accessibility ${path}`, async ({ page }) => {
    await page.goto(base + path);
    await expect(page.locator("main h1")).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
}
