import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = "/OCNET";

test("xAI profile shows its sourced use-case listings, grouped like the source page", async ({ page }) => {
  await page.goto(`${base}/providers/xai`);
  await expect(page.locator("main h1")).toHaveText("xAI");
  await expect(page.getByRole("note").filter({ hasText: "has not reviewed this profile" })).toBeVisible();
  const tabs = page.getByRole("tablist", { name: "xAI profile sections" });
  await expect(tabs.getByRole("tab", { name: /Use cases/ })).toHaveAttribute("aria-selected", "true");
  for (const section of ["Business operations", "Development & engineering", "Content creation", "Visual content", "Integration & customization"])
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
  await expect(page.locator(".build-card")).toHaveCount(11);
  await expect(page.locator(".build-card").first()).toContainText("Listed by xAI");

  await tabs.getByRole("tab", { name: /Products/ }).click();
  await expect(page).toHaveURL(/tab=products/);
  await expect(page.locator("main")).toContainText("Grok Voice Agent API");

  await tabs.getByRole("tab", { name: /About & sources/ }).click();
  await expect(page.getByRole("link", { name: /Grok use cases/ })).toHaveAttribute("href", "https://x.ai/grok/use-cases");
});

test("a provider listing links its source and makes no outcome claim", async ({ page }) => {
  await page.goto(`${base}/builds/xai-voice-customer-support`);
  await expect(page.locator("main h1")).toHaveText("Voice agents for customer support");
  const note = page.getByRole("note").filter({ hasText: "Not tested by Oracnet" });
  await expect(note.getByRole("link", { name: "source" })).toHaveAttribute("href", "https://x.ai/grok/use-cases");
  await expect(page.getByRole("button", { name: "Remix build" })).toHaveCount(0);
  await page.getByRole("link", { name: "View provider profile" }).click();
  await expect(page).toHaveURL(/\/providers\/xai/);
});

test("Grok appears in use cases, technologies and search", async ({ page }) => {
  await page.goto(`${base}/use-cases/software-development`);
  await expect(page.locator("main h1")).toContainText("coding agents");
  await page.goto(`${base}/technologies/grok-build`);
  await expect(page.locator("main")).toContainText("What xAI lists it for");
  await expect(page.locator("main")).toContainText("Plan and implement code changes");
  await page.goto(`${base}/search?q=grok`);
  await expect(page.locator("main")).toContainText("Grok");
});

for (const path of ["/providers/xai", "/providers/xai?tab=about", "/builds/xai-document-processing"]) {
  test(`accessibility ${path}`, async ({ page }) => {
    await page.goto(base + path);
    await expect(page.locator("main h1")).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
}
