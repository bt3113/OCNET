import { test, expect } from "@playwright/test";
test("build discovery, graph, alternatives and collection persistence", async ({
  page,
}) => {
  await page.goto("/OCNET/builds");
  await page
    .getByRole("combobox", { name: "Technology used", exact: true })
    .selectOption("vapi");
  // Vapi appears in the dental receptionist and in the missed-call kit.
  await expect(page.locator(".build-card")).toHaveCount(2);
  await page.locator(".build-card h3 a", { hasText: /dental/i }).click();
  await expect(page.locator("h1")).toContainText(/dental/i);
  await page.getByRole("button", { name: "Collect", exact: true }).click();
  await page.getByLabel("New collection name").fill("Voice research");
  await page
    .getByRole("button", { name: "Create collection", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Voice research", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("tab", { name: "How it works" }).click();
  await expect(page.locator(".architecture-shell")).toBeVisible();
  await page.goto("/OCNET/collections");
  await page.getByRole("link", { name: /Voice research/ }).click();
  await expect(page.locator(".build-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".build-card")).toHaveCount(1);
});
test("publish wizard validates, autosaves and publishes a usable blueprint", async ({
  page,
}) => {
  await page.goto("/OCNET/creator/builds/new");
  await page.getByLabel("Build name", { exact: true }).fill("QA support blueprint");
  await page.getByLabel("Short outcome / tagline").fill("Answer support questions from approved knowledge.");
  await page
    .getByLabel("Description", { exact: true })
    .fill(
      "A demonstration implementation that connects approved support knowledge with a language model and a reviewed response workflow.",
    );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Add Answer customer support questions with AI assistance" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Search technology catalogue").fill("Claude");
  await page.getByRole("button", { name: "Claude", exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Publish demo build", exact: true }).click();
  await expect(page.getByText(/Confirm your rights to publish this work/)).toBeVisible();
  await page.getByRole("checkbox", { name: /I own this work/ }).check();
  await page.getByRole("button", { name: "Publish demo build", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("QA support blueprint");
  await page.reload();
  await expect(page.locator("h1")).toHaveText("QA support blueprint");
});
test("remix retains attribution and RFQ remains a separate procurement flow", async ({
  page,
}) => {
  await page.goto("/OCNET/builds/ai-dental-receptionist");
  await page
    .getByRole("button", { name: "Build something like this", exact: true })
    .click();
  await page.getByRole("link", { name: "Create project from build" }).click();
  await expect(page.getByLabel("Project title")).toHaveValue(/Adapt .*dental/i);
  await page.goto("/OCNET/builds/ai-dental-receptionist");
  await page.getByRole("button", { name: "Remix build", exact: true }).click();
  await expect(page).toHaveURL(/creator\/builds\/.*\/edit/);
  await expect(page.getByLabel("Build name", { exact: true })).toHaveValue(
    /remix/,
  );
});
