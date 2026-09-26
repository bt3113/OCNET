import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = "/OCNET";

async function openCatalogueOnly(page: Page) {
  await page.goto(`${base}/solution-compiler`);
  await page.getByRole("button", { name: "Fill in the cards myself" }).click();
  await page.locator("#req-useCaseId").selectOption("plan-and-implement-code-changes");
}

test("a catalogue-only Use Case shows the coverage notice instead of candidates", async ({ page }) => {
  await openCatalogueOnly(page);
  await expect(page.locator("#req-useCaseId option:checked")).toHaveText("Plan and implement code changes · catalogue only");
  const notice = page.locator(".coverage-notice");
  await expect(notice.getByRole("heading", { name: "We don’t yet have a reusable Blueprint for this Use Case." })).toBeVisible();
  await expect(notice).toContainText("Oracnet does not invent solutions");
  await expect(notice.getByRole("link", { name: "View Use Case" })).toHaveAttribute("href", "/OCNET/use-cases/plan-and-implement-code-changes");
  await expect(notice.getByRole("link", { name: "Browse Builds" })).toHaveAttribute("href", "/OCNET/builds?useCase=plan-and-implement-code-changes");
  await expect(notice.getByRole("link", { name: "Browse technologies" })).toHaveAttribute("href", "/OCNET/use-cases/plan-and-implement-code-changes?tab=technologies");
  await expect(notice.getByRole("link", { name: /Post a Project \/ RFQ/ })).toHaveAttribute("href", "/OCNET/app/projects/new");
  await expect(notice.getByRole("link", { name: "Publish a Build" })).toHaveAttribute("href", "/OCNET/creator/builds/new?useCase=plan-and-implement-code-changes");
  const compile = page.getByRole("button", { name: "Compile feasible approaches" });
  await expect(compile).toBeDisabled();
  await expect(page.locator(".solution-candidate")).toHaveCount(0);
  await expect(page.locator("#compiler-results")).toHaveCount(0);
});

test("the Use Case select lists every approved Use Case, grouped by category", async ({ page }) => {
  await page.goto(`${base}/solution-compiler`);
  await page.getByRole("button", { name: "Fill in the cards myself" }).click();
  const select = page.locator("#req-useCaseId");
  await expect(select.locator("optgroup[label='Software Development'] option", { hasText: "Plan and implement code changes" })).toHaveCount(1);
  await expect(select.locator("optgroup[label='Customer Service'] option", { hasText: "Answer, qualify and book inbound enquiries · evidence available" })).toHaveCount(1);
  await expect(page.locator(".coverage-line")).toContainText("Choose a Use Case to compile");
  await expect(page.getByRole("button", { name: "Compile feasible approaches" })).toBeDisabled();
});

test("each enquiry-to-booking candidate shows its Blueprint, provider, Build and evidence", async ({ page }) => {
  await page.goto(`${base}/solution-compiler`);
  await page.getByRole("button", { name: /I run a property maintenance company/ }).click();
  await page.getByRole("button", { name: "Turn into requirement cards" }).click();
  await expect(page.locator(".coverage-line")).toContainText(/published Blueprints? match.*public Implementation Records? (is|are) available as evidence/);
  await page.getByRole("button", { name: "Compile feasible approaches" }).click();
  await expect(page.locator(".compiler-step-label", { hasText: "Solution approaches based on published Blueprints" })).toBeVisible();
  await expect(page.locator("#compiler-results")).toContainText(/Oracnet found \d+ published Blueprints? matching your requirement\./);
  const candidates = page.locator(".solution-candidate");
  await expect(candidates.first()).toBeVisible();
  const count = await candidates.count();
  for (let index = 0; index < count; index++) {
    const provenance = candidates.nth(index).locator(".candidate-provenance");
    await expect(provenance).toContainText("Source");
    await expect(provenance).toContainText("Published / maintained by");
    await expect(provenance).toContainText("Implementation Record");
  }
  const reference = candidates.filter({ hasText: "Service enquiry-to-booking reference Blueprint" }).first().locator(".candidate-provenance");
  await expect(reference.getByRole("link", { name: "Northstar Studio" })).toHaveAttribute("href", "/OCNET/solution-providers/northstar-studio");
  await expect(reference.getByRole("link", { name: "Service enquiry-to-booking reference Blueprint" })).toHaveAttribute("href", "/OCNET/blueprints/inquiry-booking-reference");
  await expect(reference.locator("a[href='/OCNET/builds/service-enquiry-booking-system']")).toHaveCount(1);
  await expect(reference).toContainText("Supported by 1 Implementation Record");
});

test("accessibility of the catalogue-only compiler state", async ({ page }) => {
  await openCatalogueOnly(page);
  await expect(page.locator(".coverage-notice")).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(" | ")}`)).toEqual([]);
});

test("catalogue-only notice fits a 360px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openCatalogueOnly(page);
  await expect(page.locator(".coverage-notice")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
