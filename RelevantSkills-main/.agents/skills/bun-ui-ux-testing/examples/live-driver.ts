import {
  takeScreenshot,
  takeFullPageScreenshot,
  scrollThroughPage,
  fillField,
  inspectPage,
  waitForSelector,
} from "../resources/harness";

const targetUrl = process.env.TARGET_URL || "http://localhost:3000";
const outputDir = process.env.OUTPUT_DIR || "./tests/screenshots";

// Ensure output directory exists
await Bun.write(`${outputDir}/.gitkeep`, "");

await using view = new Bun.WebView({ width: 1280, height: 800 });
console.log(`[Bun.WebView] Navigating to: ${targetUrl}`);
await view.navigate(targetUrl);

// 1. Capture initial viewport and full-page scroll capture
const initialScreenshot = `${outputDir}/01-viewport.png`;
const fullpageScreenshot = `${outputDir}/01-fullpage.png`;
await takeScreenshot(view, initialScreenshot);
await takeFullPageScreenshot(view, fullpageScreenshot);
console.log(`[Bun.WebView] Saved viewport screenshot: ${initialScreenshot}`);
console.log(`[Bun.WebView] Saved full-page screenshot: ${fullpageScreenshot}`);

// 2. Scroll through page depth
await scrollThroughPage(view, { step: 500, delay: 150 });

// 3. Inspect active DOM and controls
const metadata = await inspectPage(view);
console.log(`[Bun.WebView] Page Title: ${metadata.title}`);
console.log(`[Bun.WebView] Found ${metadata.buttons.length} buttons, ${metadata.inputs.length} inputs`);
