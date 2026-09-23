import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  publicRoutes,
  buyerRoutes,
  providerRoutes,
  adminRoutes,
  authRoutes,
} from "../../src/routes";
test("all requested routes and entity details render meaningful content", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const paths = [
    ...publicRoutes,
    ...buyerRoutes,
    ...providerRoutes,
    ...adminRoutes,
    ...authRoutes,
    "/use-cases/product-video-website",
    "/solution-stacks/product-video-website-stack",
    "/technologies/runway-video",
    "/categories/ai-software",
    "/providers/openai",
    "/integrators/partner-0",
    "/consultants/consultant-0",
    "/updates/evaluate-ai",
    "/resources/evaluate-ai",
    "/app/projects/sample-project",
    "/provider/listings/runway-video",
  ];
  for (const path of paths) {
    await page.goto("/OCNET" + path);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main")).not.toContainText("Page not found");
  }
  expect(errors).toEqual([]);
});
test("search, filters, save, persistence and comparison", async ({ page }) => {
  await page.goto("/OCNET/");
  await expect(page.locator("main h1")).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Search marketplace").fill("Runway");
  await page
    .getByRole("dialog")
    .getByRole("link")
    .filter({ hasText: "Runway" })
    .first()
    .click();
  await expect(page.locator("h1")).toContainText("Runway");
  await page
    .locator(".detail-hero")
    .getByRole("button", { name: "Save Runway", exact: true })
    .click();
  await page.reload();
  await expect(
    page
      .locator(".detail-hero")
      .getByRole("button", { name: "Unsave Runway", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Compare Runway", exact: true })
    .click();
  await page.goto("/OCNET/compare");
  await expect(page.locator("main")).toContainText("Runway");
  await page.goto("/OCNET/technologies");
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("robotics-hardware");
  await expect(page.locator(".technology-card")).toHaveCount(2);
  await page
    .getByRole("combobox", { name: "Deployment", exact: true })
    .selectOption("Cloud");
  await expect(
    page.getByText("No technologies match these filters"),
  ).toBeVisible();
});
test("project wizard validates, persists and opens the new project", async ({
  page,
}) => {
  await page.goto("/OCNET/app/projects/new");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Use at least 5 characters.")).toBeVisible();
  await page.getByLabel("Project title").fill("Test product video website");
  await page
    .getByLabel("Your requirements")
    .fill(
      "Create videos from our product photographs and publish them on a website.",
    );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Post project", exact: true }).click();
  await expect(page.locator("h1")).toContainText("Test product video website");
  await page.reload();
  await expect(page.locator("h1")).toContainText("Test product video website");
});
test("contact provider and message workflow", async ({ page }) => {
  await page.goto("/OCNET/providers/openai");
  await page
    .getByRole("button", { name: "Contact OpenAI", exact: true })
    .click();
  await page.getByLabel("Your name").fill("Test Buyer");
  await page.getByLabel("Email", { exact: true }).fill("demo@example.com");
  await page
    .getByLabel("What would you like to discuss?")
    .fill("We are exploring a product video website.");
  await page.getByRole("button", { name: "Save demo enquiry" }).click();
  await expect(page.locator(".thread-heading")).toContainText("OpenAI");
  await page
    .getByLabel("Message", { exact: true })
    .fill("Could we discuss the requirements?");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("log")).toContainText(
    "Could we discuss the requirements?",
  );
  await page.reload();
  await expect(page.getByRole("log")).toContainText(
    "Could we discuss the requirements?",
  );
});
test("provider listing edit, review moderation, notifications and settings", async ({
  page,
}) => {
  await page.goto("/OCNET/provider/listings/new");
  await page.getByLabel("Name", { exact: true }).fill("Test technology");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A sample capability to evaluate.");
  await page.getByRole("button", { name: "Create demo listing" }).click();
  await expect(page.getByRole("table")).toContainText("Test technology");
  await page.goto("/OCNET/technologies/runway-video");
  await page.getByRole("tab", { name: "Reviews", exact: true }).click();
  await page
    .getByLabel("Your experience")
    .fill("This is a demo evaluation with a clear outcome.");
  await page.getByRole("button", { name: "Submit demo review" }).click();
  await page.goto("/OCNET/admin/reviews");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByRole("table")).toContainText("published");
  await page.goto("/OCNET/app/notifications");
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.locator(".notification.unread")).toHaveCount(0);
  await page.goto("/OCNET/app/settings");
  await page.getByLabel("Email notifications preference").check();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page.reload();
  await expect(page.getByLabel("Email notifications preference")).toBeChecked();
});
for (const width of [1440, 1280, 1024, 768, 430, 390, 360])
  test(`responsive layout and screenshot at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of [
      "/",
      "/technologies",
      "/use-cases/product-video-website",
      "/app/projects/new",
      "/provider/listings",
      "/app/messages",
    ]) {
      await page.goto("/OCNET" + path);
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    await page.goto("/OCNET/");
    await page.screenshot({ path: `qa/home-${width}.png`, fullPage: true });
  });
for (const path of [
  "/",
  "/technologies",
  "/app/projects/new",
  "/sign-in",
  "/app/messages",
])
  test(`accessibility ${path}`, async ({ page }) => {
    await page.goto("/OCNET" + path);
    await expect(page.locator("main h1")).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  });
