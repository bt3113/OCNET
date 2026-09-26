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
  await expect(page.locator(".vendor-use-case-list > li")).toHaveCount(15);
  await expect(page.locator("main")).toContainText("These are vendor statements, not Builds");
  await expect(page.locator("main")).toContainText("Synthesize research across sources");
  await expect(page.locator("main")).toContainText("Edit and restyle existing images");
  await expect(tabs.getByRole("tab", { name: /Independent Builds/ })).toBeVisible();

  await tabs.getByRole("tab", { name: /Products/ }).click();
  await expect(page).toHaveURL(/tab=products/);
  await expect(page.locator("main")).toContainText("Grok Voice Agent API");

  await tabs.getByRole("tab", { name: /About & sources/ }).click();
  await expect(page.getByRole("link", { name: /Grok use cases/ })).toHaveAttribute("href", "https://x.ai/grok/use-cases");
  await expect(page.locator("main")).toContainText("does not let the vendor delete or rewrite independent Builds");
});

test("a vendor-origin Use Case keeps attribution and live source wording", async ({ page }) => {
  await page.goto(`${base}/use-cases/handle-customer-inquiries-with-voice-agents`);
  await expect(page.locator("main h1")).toHaveText("Automate workflows with voice agents");
  const origin = page.locator(".use-case-origin");
  await expect(origin).toContainText("Originally listed by xAI");
  await expect(origin.getByRole("link", { name: "source" })).toHaveAttribute("href", "https://x.ai/grok/use-cases/voice-agents");
  await expect(origin).toContainText("does not own it");
  await page.getByRole("tab", { name: /Sources/ }).click();
  const source = page.locator(".source-provenance");
  await expect(source).toContainText("Technology vendor · xAI");
  await expect(source).toContainText("Original title: “Automate workflows with voice agents”");
  await expect(source).toContainText("Verified against the live xAI use-case index");
  await expect(source).not.toContainText("Wording to be verified");
  await expect(source.getByRole("link", { name: "Open source page" })).toHaveAttribute("href", "https://x.ai/grok/use-cases/voice-agents");
});

test("legacy xAI URLs redirect to the new concepts", async ({ page }) => {
  await page.goto(`${base}/providers/xai`);
  await expect(page).toHaveURL(/\/technology-vendors\/xai$/);
  await page.goto(`${base}/builds/xai-voice-customer-support`);
  await expect(page).toHaveURL(/\/use-cases\/handle-customer-inquiries-with-voice-agents$/);
  await expect(page.locator("main h1")).toHaveText("Automate workflows with voice agents");
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

test("a vendor claims its profile with a DNS record and a reviewer approves it", async ({ page }) => {
  let txt: string[] = [];
  await page.route("https://cloudflare-dns.com/dns-query**", (route) =>
    route.fulfill({ contentType: "application/dns-json", body: JSON.stringify({ Status: 0, Answer: txt.map((data) => ({ type: 16, data: `"${data}"` })) }) }),
  );
  await page.goto(`${base}/technology-vendors/xai?tab=about`);
  await page.getByRole("link", { name: /Claim this profile/ }).click();
  await expect(page).toHaveURL(/\/provider\/claims\?vendor=xai/);
  await expect(page.getByLabel("Company domain")).toHaveValue("x.ai");
  await page.getByLabel("Work email").fill("me@gmail.com");
  await page.getByLabel("Your role").fill("I lead developer relations at xAI.");
  await page.getByRole("button", { name: "Submit claim" }).click();
  await expect(page.getByRole("alert")).toContainText("Use an email address at x.ai");
  await page.getByLabel("Work email").fill("me@x.ai");
  await page.getByRole("button", { name: "Submit claim" }).click();
  const value = page.locator(".dns-instructions code").nth(1);
  await expect(page.locator(".dns-instructions code").first()).toHaveText("_oracnet-verification.x.ai");
  const record = (await value.textContent()) ?? "";
  expect(record).toMatch(/^oracnet-verification=[0-9a-f]{32}$/);

  await page.goto(`${base}/admin/vendor-claims`);
  const card = page.locator(".moderation-card", { hasText: "xAI" });
  await expect(card).toContainText("matches the vendor website");
  await expect(card.getByRole("button", { name: "Approve claim" })).toBeDisabled();
  await card.getByRole("button", { name: "Check DNS record" }).click();
  await expect(card).toContainText("DNS record not found yet");
  txt = ["v=spf1 -all", record];
  await card.getByRole("button", { name: "Check DNS record" }).click();
  await expect(card).toContainText("DNS record verified");
  await card.getByRole("button", { name: "Approve claim" }).click();
  await expect(page.locator(".moderation-history")).toContainText("approved");

  await page.goto(`${base}/technology-vendors/xai?tab=about`);
  await expect(page.locator("main")).toContainText("MAINTAINED BY THE VENDOR");
  await expect(page.locator("main")).toContainText("xAI has claimed this profile");
  await expect(page.getByRole("link", { name: /Claim this profile/ })).toHaveCount(0);
});
