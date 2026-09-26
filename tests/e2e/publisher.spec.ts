import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = "/OCNET";

async function fillBasics(page: Page, name: string) {
  await page.goto(`${base}/creator/builds/new`);
  await page.getByLabel("Build name", { exact: true }).fill(name);
  await page.getByLabel("Short outcome / tagline").fill("Keeps finance follow-ups moving without manual chasing.");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Sends reminder emails for overdue invoices and logs replies in the accounting system for finance teams.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Choose the work it does" })).toBeVisible();
}

async function finishAndPublish(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Search technology catalogue").fill("Claude");
  await page.getByRole("button", { name: "Claude", exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox", { name: /I own this work/ }).check();
  await page.getByRole("button", { name: "Publish demo build", exact: true }).click();
  await expect(page).toHaveURL(/\/builds\//);
}

async function propose(page: Page, text: string) {
  await page.getByText("Can’t find the right Use Case? Propose one").click();
  await page.getByLabel("Describe the work in a few words").fill(text);
  await page.getByRole("button", { name: "Submit proposal for review" }).click();
  await expect(page.locator(".use-case-chip.proposal")).toContainText("Pending review");
}

const combobox = (page: Page) => page.getByRole("combobox", { name: "Search Use Cases" });

// A. Select up to three Use Cases; the fourth is refused.
test("publisher selects up to three Use Cases with an accessible combobox", async ({ page }) => {
  await fillBasics(page, "Finance follow-up kit");
  const input = combobox(page);
  await expect(input).toHaveAttribute("aria-expanded", "false");
  await input.fill("chase overdue");
  await expect(input).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", /option-0/);
  await expect(page.getByRole("option").first()).toContainText("Finance › Accounts Receivable");
  await page.keyboard.press("Enter");
  await expect(page.locator(".use-case-chip").first()).toContainText("Chase overdue invoices");
  await expect(page.locator(".use-case-chip").first()).toContainText("Primary");

  await input.fill("supplier invoices");
  await page.getByRole("option", { name: /Review supplier invoices/ }).click();
  await input.fill("extract documents");
  await page.getByRole("option").first().click();
  await expect(page.locator(".use-case-chip")).toHaveCount(3);
  await expect(page.getByText("3 of 3 selected")).toBeVisible();

  // Fourth: options are disabled, suggestion buttons disabled, proposal refused.
  await input.fill("booking");
  await expect(page.getByRole("option").first()).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator(".use-case-chip")).toHaveCount(3);
  await expect(page.getByText("You have chosen 3 Use Cases. Remove one to add another.")).toBeVisible();
  await page.keyboard.press("Escape");

  // Change the primary and remove one.
  await page.getByRole("button", { name: /Make Review supplier invoices before approval the primary Use Case/ }).click();
  await expect(page.locator(".use-case-chip").first()).toContainText("Review supplier invoices before approval");
  await page.getByRole("button", { name: "Remove Chase overdue invoices" }).click();
  await expect(page.locator(".use-case-chip")).toHaveCount(2);
  await expect(page.getByText("2 of 3 selected")).toBeVisible();
});

test("publisher refuses to publish without a Use Case", async ({ page }) => {
  await fillBasics(page, "Use case less build");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Search technology catalogue").fill("Claude");
  await page.getByRole("button", { name: "Claude", exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox", { name: /I own this work/ }).check();
  await page.getByRole("button", { name: "Publish demo build", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Choose at least one Use Case");
  await expect(page).toHaveURL(/creator\/builds\/new/);
});

// B. A proposal is mapped to an existing Use Case by a moderator.
test("a proposed Use Case stays private and can be mapped to an existing one", async ({ page }) => {
  await fillBasics(page, "Late payment nudger");
  await propose(page, "Follow up with customers about late payments");
  await expect(page.getByRole("note").filter({ hasText: "will not appear in discovery" })).toBeVisible();
  await finishAndPublish(page);
  const buildUrl = page.url();

  // Not public: the proposal is neither a Use Case page nor in discovery.
  await page.goto(`${base}/use-cases?q=late+payments`);
  await expect(page.locator(".use-case-card", { hasText: "Follow up with customers about late payments" })).toHaveCount(0);
  await page.goto(`${base}/builds?q=Late+payment+nudger`);
  await expect(page.locator(".build-card", { hasText: "Late payment nudger" })).toHaveCount(0);

  await page.goto(`${base}/admin/use-cases`);
  const card = page.locator(".moderation-card", { hasText: "Follow up with customers about late payments" });
  await expect(card).toContainText("Original wording");
  await card.getByRole("button", { name: "Map to existing" }).click();
  await card.getByLabel("Existing Use Case").selectOption({ label: "Chase overdue invoices" });
  await card.getByRole("button", { name: "Confirm mapping" }).click();
  await expect(page.locator(".moderation-card", { hasText: "Follow up with customers about late payments" })).toHaveCount(0);

  await page.goto(buildUrl);
  await expect(page.locator("main").getByRole("link", { name: /Chase overdue invoices/ }).first()).toBeVisible();
  await page.goto(`${base}/builds?q=Late+payment+nudger`);
  await expect(page.locator(".build-card", { hasText: "Late payment nudger" })).toHaveCount(1);
  // The provider's wording becomes a search label for the mapped Use Case.
  await page.goto(`${base}/search?q=customers+about+late+payments&type=Use+Case`);
  await expect(page.locator(".unified-search-result").first()).toContainText("Chase overdue invoices");
});

// C. A proposal with a typo is approved under an edited title; the original is kept.
test("a moderator approves a proposal with an edited title and keeps the original wording", async ({ page }) => {
  await fillBasics(page, "Payout reconciler");
  await propose(page, "Reconcile stripe payuots with bank deposits");
  await finishAndPublish(page);

  await page.goto(`${base}/admin/use-cases`);
  const card = page.locator(".moderation-card", { hasText: "payuots" });
  await card.getByRole("button", { name: "Edit and approve" }).click();
  await card.getByLabel("Public title").fill("Reconcile Stripe payouts with bank deposits");
  await card.getByLabel("Definition").fill("Match card processor payouts against bank deposits and flag differences for review.");
  await card.getByRole("combobox", { name: /^Category/ }).selectOption({ label: "Finance" });
  await card.getByRole("combobox", { name: /^Subcategory/ }).selectOption({ label: "Accounts Receivable" });
  await card.getByRole("button", { name: "Approve Use Case" }).click();
  await expect(page.locator(".moderation-card", { hasText: "payuots" })).toHaveCount(0);

  await page.goto(`${base}/use-cases/reconcile-stripe-payouts-with-bank-deposits`);
  await expect(page.locator("main h1")).toHaveText("Reconcile Stripe payouts with bank deposits");
  await expect(page.locator(".use-case-facts")).toContainText("Builds1");
  await page.getByRole("tab", { name: /Sources/ }).click();
  await expect(page.locator(".source-provenance")).toContainText("Reconcile stripe payuots with bank deposits");
});

// E. A Solution Provider's Build joins a vendor-origin Use Case: 0 → 1 Builds.
test("a Build can join a Use Case first listed by xAI", async ({ page }) => {
  await page.goto(`${base}/use-cases/internal-ai-assistants`);
  await expect(page.locator(".use-case-facts")).toContainText("Builds0");
  await expect(page.locator(".implementation-hero-actions")).toContainText("No Builds yet");
  await page.getByRole("link", { name: "Publish a Build for this Use Case" }).click();
  await page.getByLabel("Build name", { exact: true }).fill("Helpdesk assistant for internal wikis");
  await page.getByLabel("Short outcome / tagline").fill("Answers staff questions from the internal wiki.");
  await page.getByLabel("Description", { exact: true }).fill("An assistant connected to the company wiki and ticketing system that drafts answers for staff to review.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".use-case-chip").first()).toContainText("Build custom assistants connected to internal systems");
  await finishAndPublish(page);
  await page.goto(`${base}/use-cases/internal-ai-assistants`);
  await expect(page.locator(".use-case-facts")).toContainText("Builds1");
  await expect(page.locator(".use-case-origin")).toContainText("Originally listed by xAI");
  await expect(page.locator(".build-card", { hasText: "Helpdesk assistant for internal wikis" })).toBeVisible();
});

// F. Build detail: facts, provider, tabs, and proof from real deployments.
test("Build detail shows the provider, maturity, How it works and Proof", async ({ page }) => {
  await page.goto(`${base}/builds/service-enquiry-booking-system`);
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator("main")).toContainText("Build + deployment evidence");
  await expect(page.locator("main").getByRole("link", { name: /Northstar Studio/ }).first()).toBeVisible();
  await page.getByRole("tab", { name: "How it works" }).click();
  await expect(page).toHaveURL(/tab=how-it-works/);
  await page.getByRole("tab", { name: "Proof" }).click();
  await expect(page.locator(".build-implementation-list li").first()).toBeVisible();
  await page.goto(`${base}/builds/ai-dental-receptionist?tab=proof`);
  await expect(page.locator(".proof-empty")).toContainText("No real deployment has been linked to this Build yet");
});

test("provider dashboard shows supply gaps as supply, not demand", async ({ page }) => {
  await page.goto(`${base}/creator`);
  const gaps = page.locator(".supply-gaps");
  await expect(gaps.getByRole("heading", { name: "Use Cases with few or no Builds" })).toBeVisible();
  await expect(gaps).toContainText("not how many buyers are looking");
  await expect(gaps.getByRole("table")).toContainText("No Builds yet");
});

test("an Implementation started from a Build links back to it", async ({ page }) => {
  await page.goto(`${base}/implementation/new?build=missed-call-textback-kit`);
  await expect(page.getByRole("note").filter({ hasText: "Missed-call" })).toBeVisible();
});

test("accessibility of the Use Cases step with the listbox open", async ({ page }) => {
  await fillBasics(page, "Accessible finance kit");
  await combobox(page).fill("invoice");
  await expect(page.getByRole("listbox")).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(" | ")}`)).toEqual([]);
});
