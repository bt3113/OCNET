import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = "/OCNET";
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const demoToken = "demo-attestation-token-illustrative-only-not-a-secret";

test("implementation discovery filters persist in the URL and feed comparison", async ({ page }) => {
  await page.goto(`${base}/implementations`);
  await expect(page.locator("main h1")).toContainText("comparable businesses");
  await expect(page.getByRole("status").filter({ hasText: "implementation records" })).toContainText("5 implementation records");
  await page.locator(".discovery-filters").getByRole("combobox", { name: "Technology" }).selectOption("hubspot");
  await expect(page).toHaveURL(/tech=hubspot/);
  await expect(page.getByRole("status").filter({ hasText: "implementation record" })).toContainText("2 implementation records");
  await page.reload();
  await expect(page.locator(".discovery-filters").getByRole("combobox", { name: "Technology" })).toHaveValue("hubspot");
  await page.getByRole("button", { name: /Remove filter Technology/ }).click();
  await expect(page).not.toHaveURL(/tech=/);
  const cards = page.locator(".implementation-card");
  // Selection lives in the URL, so the checkbox state follows navigation.
  await cards.nth(0).getByRole("checkbox", { name: "Compare" }).click();
  await expect(cards.nth(0).getByRole("checkbox", { name: "Compare" })).toBeChecked();
  await cards.nth(2).getByRole("checkbox", { name: "Compare" }).click();
  await expect(cards.nth(2).getByRole("checkbox", { name: "Compare" })).toBeChecked();
  await expect(page).toHaveURL(/compare=/);
  await page.getByRole("region", { name: "Comparison tray" }).getByRole("link", { name: /Compare/ }).click();
  await expect(page.locator("main h1")).toContainText("Compare the context");
  await expect(page.locator(".comparison-table")).toBeVisible();
  await expect(page.locator(".missing-value").first()).toBeVisible();
});

test("comparison labels undisclosed and incomparable values explicitly", async ({ page }) => {
  await page.goto(`${base}/compare/implementations?ids=property-enquiry-automation,agency-lead-routing`);
  const setup = page.getByRole("row", { name: /Setup cost/ });
  await expect(setup).toContainText("NOT DISCLOSED");
  await expect(page.getByRole("row", { name: /Booking rate/ })).toContainText("MISSING");
  await expect(page.locator("main")).not.toContainText(/winner is|best option|overall score/i);
});

test("implementation detail exposes metric provenance, claim evidence and an accessible architecture", async ({ page }) => {
  await page.goto(`${base}/implementations/property-enquiry-automation`);
  await expect(page.locator("main h1")).toContainText("Multi-location property maintenance");
  await expect(page.getByRole("note").first()).toContainText("ILLUSTRATIVE RECORD");
  await expect(page.locator("main")).not.toContainText(/caused|resulted in|thanks to/i);
  await page.locator(".metric-card").filter({ hasText: "Median first-response time" }).getByRole("button", { name: /Provenance/ }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("Observed after implementation");
  await expect(drawer).toContainText("Evidence method");
  await expect(drawer).toContainText("not a forecast");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Evidence for Booking rate" }).click();
  await expect(page.getByRole("dialog")).toContainText("needs more evidence");
  await page.keyboard.press("Escape");
  const map = page.locator(".architecture-map");
  await expect(map).toBeVisible();
  await map.getByRole("button", { name: /CRM: HubSpot CRM/ }).focus();
  await page.keyboard.press("Enter");
  await expect(map.locator(".architecture-inspector-panel")).toContainText("HubSpot CRM");
  await map.getByRole("button", { name: /Connection Create contact/ }).click();
  await expect(map.locator(".architecture-inspector-panel")).toContainText("Connector available");
  await map.getByRole("button", { name: "List view" }).click();
  await expect(map.locator(".architecture-list")).toContainText("Connections");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export W3C PROV-JSON" }).click()]);
  expect(download.suggestedFilename()).toBe("property-enquiry-automation-prov.json");
});

test("request something similar creates a private procurement project", async ({ page }) => {
  await page.goto(`${base}/implementations/property-enquiry-automation#request`);
  await page.getByRole("button", { name: /Create a private requirement/ }).click();
  await expect(page).toHaveURL(/\/app\/projects\//);
  await expect(page.locator("main")).toContainText("Something like: Multi-location property maintenance");
});

test("Blueprint detail keeps versions, rights and manifests separate from evidence", async ({ page }) => {
  await page.goto(`${base}/blueprints/inquiry-booking-reference`);
  await expect(page.locator("main h1")).toContainText("Service enquiry-to-booking reference Blueprint");
  await expect(page.locator(".blueprint-action-card")).toContainText("Not granted");
  await page.getByRole("combobox", { name: "Version" }).selectOption({ index: 1 });
  await expect(page.locator(".blueprint-version-bar")).toContainText("historical version");
  await expect(page.locator(".architecture-map")).toContainText("v1.0");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /CycloneDX/ }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.cdx\.json$/);
  // Drafts are hidden from the public list; the demo persona owns the seed draft, so
  // its detail page is visible to them but marked as not public.
  await page.goto(`${base}/blueprints`);
  await expect(page.locator("main")).not.toContainText("Salon follow-up Blueprint (draft)");
  await page.goto(`${base}/blueprints/salon-followup-draft`);
  await expect(page.locator("main")).toContainText("DRAFT · not public");
  await expect(page.locator("main")).toContainText("cannot be published");
});

test("Solution Compiler turns text into editable requirements and explains feasible options", async ({ page }) => {
  await page.goto(`${base}/solution-compiler`);
  await expect(page.locator("main h1")).toHaveText("What are you trying to improve?");
  await page.getByRole("button", { name: /I run a property maintenance company/ }).click();
  await page.getByRole("button", { name: "Turn into requirement cards" }).click();
  const mustKeep = page.locator(".requirement-card").filter({ hasText: "Must keep" });
  await expect(mustKeep).toContainText("HubSpot CRM");
  await expect(mustKeep.getByRole("button", { name: /inferred/i })).toBeVisible();
  await mustKeep.getByRole("button", { name: /inferred/i }).click();
  await expect(mustKeep.getByRole("button", { name: /inferred/i })).toHaveCount(0);
  await expect(page.locator("#req-locations")).toHaveValue("3");
  await page.getByRole("button", { name: "Compile feasible approaches" }).click();
  await expect(page.locator(".compiler-progress li")).toHaveCount(6);
  const candidates = page.locator(".solution-candidate");
  await expect(candidates.first()).toBeVisible();
  expect(await candidates.count()).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".tradeoff-label", { hasText: "Lower estimated setup cost" })).toHaveCount(1);
  await expect(page.locator(".tradeoff-label", { hasText: /best/i })).toHaveCount(0);
  const reference = candidates.filter({ hasText: "Service enquiry-to-booking reference Blueprint" });
  await reference.getByRole("combobox", { name: /Workflow orchestration/ }).selectOption("flow-agent");
  // Re-running Pareto after the change can surface other variants of the same Blueprint.
  const modified = candidates.filter({ hasText: "Modified by you" });
  await expect(modified).toHaveCount(1);
  await expect(modified.getByRole("combobox", { name: /Workflow orchestration/ })).toHaveValue("flow-agent");
  await modified.getByRole("button", { name: "Why this appears" }).click();
  await expect(page.getByRole("dialog")).toContainText("Hard constraints unknown");
  await expect(page.getByRole("dialog")).toContainText("No recorded relationship");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Decision trace" }).click();
  await page.getByRole("button", { name: "Re-run and compare" }).click();
  await expect(page.getByRole("dialog")).toContainText("identical result digest");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save run" }).click();
  await page.goto(`${base}/app/solution-runs`);
  await expect(page.locator(".run-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Verify reproducibility" }).click();
  await expect(page.locator(".run-row")).toContainText("identical result digest");
});

test("hard constraints exclude options with reasons instead of being ignored", async ({ page }) => {
  await page.goto(`${base}/solution-compiler`);
  await page.getByRole("button", { name: /I run a property maintenance company/ }).click();
  await page.getByRole("button", { name: "Turn into requirement cards" }).click();
  await page.getByLabel("Minimum setup budget (GBP)").fill("");
  await page.getByLabel("Maximum setup budget (GBP)").fill("500");
  await page.getByRole("radiogroup", { name: "Setup budget strength" }).getByRole("radio", { name: "Hard" }).click();
  await page.getByRole("button", { name: "Compile feasible approaches" }).click();
  await expect(page.locator(".compiler-no-candidates")).toContainText("No approach satisfies every hard constraint");
  await page.locator("details.excluded-candidates summary").click();
  await expect(page.locator("details.excluded-candidates")).toContainText("starts at");
});

test("contributor wizard submits a moderation-pending record without leaking private identity", async ({ page }) => {
  await page.goto(`${base}/implementation/new`);
  await page.evaluate(() => localStorage.removeItem("oracnet:implementation-draft:v2"));
  await page.reload();
  const next = () => page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/Customer or organization name/).fill("Hidden Customer Ltd");
  await page.getByLabel(/The customer has given permission/).check();
  await next();
  await page.getByLabel(/Record name/).fill("Test enquiry automation record");
  await page.getByLabel(/Business type/).fill("Property maintenance services");
  await page.getByRole("textbox", { name: /^Business context/ }).fill("A test business with two branches and a small office team.");
  await next();
  await page.getByLabel(/What problem existed before/).fill("Calls went unanswered and enquiries were re-keyed by hand.");
  await page.getByLabel("Baseline Median first-response time").fill("60");
  await next();
  await page.getByLabel(/Process before/).fill("Call arrives\nStaff call back");
  await next();
  await page.getByLabel(/What changed/).fill("Automated acknowledgement");
  await next();
  await page.getByLabel(/Process after/).fill("Call arrives\nAutomatic SMS\nStaff review exceptions");
  await next();
  await page.getByRole("button", { name: "Add component" }).click();
  await page.getByRole("button", { name: "Add component" }).click();
  await page.getByLabel("Component 1 product").selectOption("twilio");
  await page.getByLabel("Component 2 product").selectOption("make");
  await next();
  await next();
  await page.getByLabel(/Median first-response time — observed/).fill("5");
  await next();
  await expect(page.locator(".claim-editor")).toHaveCount(2);
  await next();
  await next();
  await page.getByLabel(/Public fields contain no credentials/).check();
  await next();
  await next();
  await next();
  await expect(page.locator(".review-private")).toContainText("Hidden Customer Ltd");
  await expect(page.locator(".review-public")).not.toContainText("Hidden Customer Ltd");
  await page.getByLabel(/I confirm this describes a real implementation/).check();
  await page.getByRole("button", { name: "Submit for moderation" }).click();
  await expect(page.locator(".wizard-done")).toContainText("Submitted for moderation");
  await page.getByRole("link", { name: "View your record" }).click();
  await expect(page.locator("main h1")).toContainText("Test enquiry automation record");
  await expect(page.locator("main")).not.toContainText("Hidden Customer Ltd");
  await expect(page.locator("main")).toContainText("Creator reported");
  await page.goto(`${base}/implementations`);
  await expect(page.locator("main")).not.toContainText("Test enquiry automation record");
});

test("customer attestation is scoped, single-use and records claim events", async ({ page }) => {
  await page.goto(`${base}/verify/not-a-real-token`);
  await expect(page.locator("main")).toContainText("This attestation link is not valid");
  await page.goto(`${base}/admin/attestations`);
  await page.getByRole("link", { name: "Open demo walkthrough" }).click();
  await expect(page.locator("main")).toContainText("DEMO ATTESTATION");
  await expect(page.locator(".attestation-claim")).toHaveCount(4);
  await page.getByRole("radio", { name: "Private to Oracnet" }).check();
  await page.getByRole("radiogroup", { name: /Your decision for Architecture as recorded/ }).getByRole("radio", { name: "Confirm" }).click();
  await page.getByRole("radiogroup", { name: /Your decision for Implementation dates/ }).getByRole("radio", { name: "Reject" }).click();
  await page.getByRole("button", { name: "Submit my review" }).click();
  await expect(page.locator("main")).toContainText("demo attestation recorded");
  await page.goto(`${base}/verify/${demoToken}`);
  await expect(page.locator("main")).toContainText("already been submitted");
  await page.goto(`${base}/implementations/property-enquiry-automation#evidence`);
  await expect(page.locator(".claim-row").filter({ hasText: "Architecture as recorded" })).toContainText("Customer attested · demo");
});

test("reviewer decisions are claim-level and appear in the audit history", async ({ page }) => {
  await page.goto(`${base}/admin/claims`);
  const row = page.locator(".admin-intelligence-row").filter({ hasText: "£3,500–£5,000" });
  await row.getByLabel("Reviewer note").fill("Invoice summary checked");
  await row.getByRole("button", { name: "Evidence sufficient" }).click();
  await expect(row).toContainText("Evidence reviewed · demo");
  await row.getByRole("button", { name: "Revoke" }).click();
  await expect(page.getByRole("status").filter({ hasText: /revocation needs a recorded reason|Verification revoked/ })).toBeVisible();
  await page.goto(`${base}/admin/audit`);
  await expect(page.locator("main")).toContainText("claim-review-sufficient");
  await page.goto(`${base}/admin/blueprints`);
  const draft = page.locator(".admin-intelligence-row").filter({ hasText: "Salon follow-up Blueprint (draft)" });
  await draft.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("status").filter({ hasText: /sanitization/ })).toBeVisible();
});

test("unified search answers outcome queries and 404s are explicit", async ({ page }) => {
  await page.goto(`${base}/search?q=automate%20missed%20calls`);
  await expect(page.locator(".unified-search-results")).toContainText("Plumbing & heating missed-call text-back");
  await page.goto(`${base}/implementations/does-not-exist`);
  await expect(page.locator("main")).toContainText("Implementation record not found");
  await page.goto(`${base}/no-such-page`);
  await expect(page.locator("main")).toContainText("Page not found");
});

test("mobile: filters open in a bottom sheet and core flows fit 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`${base}/implementations`);
  await page.getByRole("button", { name: /^Filters/ }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("combobox", { name: "Region" }).selectOption("Europe");
  await sheet.getByRole("button", { name: /Show 1 record/ }).click();
  await expect(page).toHaveURL(/region=Europe/);
  for (const path of ["/implementations/property-enquiry-automation", "/solution-compiler", "/blueprints/inquiry-booking-reference", "/compare/implementations?ids=property-enquiry-automation,salon-booking-followup", "/implementation/new", "/admin/claims"]) {
    await page.goto(base + path);
    await expect(page.locator("main h1")).toBeVisible();
    expect(await noOverflow(page)).toBe(true);
  }
  await page.goto(`${base}/implementations/property-enquiry-automation`);
  await expect(page.locator(".architecture-list")).toBeVisible();
});

for (const path of [
  "/implementations",
  "/implementations/property-enquiry-automation",
  "/compare/implementations?ids=property-enquiry-automation,salon-booking-followup",
  "/blueprints",
  "/blueprints/inquiry-booking-reference",
  "/solution-compiler",
  "/use-cases/enquiry-to-booking",
  "/technologies/hubspot",
  "/implementers/partner-0",
  "/implementation/new",
  `/verify/${demoToken}`,
  "/admin/claims",
])
  test(`accessibility ${path}`, async ({ page }) => {
    await page.goto(base + path);
    await expect(page.locator("main h1")).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(" | ")}`)).toEqual([]);
  });

test("accessibility of the compiler results state", async ({ page }) => {
  await page.goto(`${base}/solution-compiler`);
  await page.getByRole("button", { name: /I run a property maintenance company/ }).click();
  await page.getByRole("button", { name: "Turn into requirement cards" }).click();
  await page.getByRole("button", { name: "Compile feasible approaches" }).click();
  await expect(page.locator(".solution-candidate").first()).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations.map((violation) => `${violation.id}: ${violation.nodes.slice(0, 3).map((node) => node.target.join(" ")).join(" | ")}`)).toEqual([]);
});

test("homepage outcome entry hands the intent to the Solution Compiler", async ({ page }) => {
  await page.goto(`${base}/`);
  await expect(page.locator("main h1")).toHaveText("What are you trying to improve?");
  await page.getByPlaceholder(/Respond to enquiries faster/).fill("Salon with two sites wants faster replies to booking messages");
  await page.getByRole("button", { name: /Structure the problem/ }).click();
  await expect(page).toHaveURL(/solution-compiler\?intent=/);
  await expect(page.locator(".requirement-card").filter({ hasText: "Business" }).first()).toContainText("INFERRED");
  await expect(page.locator("#req-businessType")).toHaveValue("Salon and beauty services");
});
