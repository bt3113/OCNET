import { chromium } from "playwright";
import { createServer } from "vite";
import AxeBuilder from "@axe-core/playwright";
const server = await createServer({
  server: { host: "127.0.0.1", port: 5173 },
});
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-zygote",
  ],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
for (const path of [
  "/",
  "/technologies",
  "/app/projects/new",
  "/sign-in",
  "/builds",
  "/builds/ai-dental-receptionist",
  "/creator/builds/new",
  "/creators/alex-chen",
  "/app/messages",
]) {
  await page.goto("http://127.0.0.1:5173/OCNET" + path);
  await page.waitForSelector("h1");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  console.log(
    JSON.stringify({
      path,
      violations: results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    }),
  );
}
for (const width of [1440, 1280, 1024, 768, 430, 390, 360]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto("http://127.0.0.1:5173/OCNET/");
  await page.waitForSelector("h1");
  await page.screenshot({ path: "qa/home-" + width + ".png", fullPage: true });
  console.log(
    JSON.stringify({
      width,
      overflow: await page.evaluate(() =>
        [...document.querySelectorAll("body *")]
          .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
          .map((el) => ({
            tag: el.tagName,
            cls: el.className,
            right: el.getBoundingClientRect().right,
          }))
          .slice(0, 10),
      ),
    }),
  );
}
for (const [label, path] of [
  ["build", "/builds/ai-dental-receptionist"],
  ["graph", "/builds/ai-dental-receptionist?tab=Stack+%26+architecture"],
  ["discovery", "/builds"],
  ["publish", "/creator/builds/new"],
  ["creator", "/creators/alex-chen"],
]) {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("http://127.0.0.1:5173/OCNET" + path);
    await page.waitForSelector("h1");
    if (label === "graph") await page.waitForSelector(".architecture-shell");
    await page.screenshot({ path: `qa/${label}-${width}.png`, fullPage: true });
  }
}
console.log({ errors });
await browser.close();
await server.close();
