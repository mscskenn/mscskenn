---
name: bun-ui-ux-testing
description: Drive headless Chromium via Bun.WebView to interact with live web pages, submit forms, click buttons, capture full-page and scrolled screenshots, and audit UI/UX compliance across standard viewports.
---

# Bun UI and UX automation

Drive live browser sessions using Bun native `Bun.WebView`. This skill executes actions directly against running applications: navigating pages, typing inputs, clicking buttons, scrolling through document depth, capturing full-page and stepped screenshots, and auditing design system compliance across screen resolutions.

## Core rule

When this skill is activated, do not generate abstract unit test files with mock servers unless explicitly asked for unit tests. Instead:

1. Write a concrete Bun driver script targeting the actual running application (for example `http://localhost:3000` or a specified URL).
2. Execute the script via `run_command` with `bun <script-path>`.
3. Capture both initial viewports and **full-page / scrolled document captures** (`takeFullPageScreenshot`, `scrollThroughPage`) across standard viewports.
4. Audit design and accessibility compliance across the entire scroll depth (font weights, text truncation, touch target dimensions, and layout overflow).
5. Embed the generated screenshot paths and report concrete findings directly in your response.

## Viewport matrix

Always test across these representative device profiles:

| Viewport | Dimensions | Target device / Profile | Focus checks |
| :--- | :--- | :--- | :--- |
| **Full HD Desktop** | `1920 x 1080` | High-res monitors | Edge-to-edge alignment, full-page scroll content, chart readability |
| **Standard Laptop** | `1366 x 768` | 13"-14" laptops | Below-the-fold cards, currency truncation (`scrollWidth > clientWidth`) |
| **Compact Desktop** | `1280 x 800` | MacBook / 13" laptop | 4-column reflow, sidebars, header navigation pills |
| **Tablet Portrait** | `768 x 1024` | iPad / Tablet | 2-column grid adaptation, mobile drawer triggers |
| **Mobile Portrait** | `375 x 812` | iPhone / Modern mobile | Single-column stacking, full mobile scroll depth, 44px touch target bounds |

## Standard runner script pattern

Create a script in a scratch directory (or project test directory) and execute it:

```typescript
import {
  takeScreenshot,
  takeFullPageScreenshot,
  scrollThroughPage,
  scrollToElement,
  fillField,
  inspectPage,
  checkTouchTargets,
  auditFontWeights,
  auditTextTruncation,
  auditLayoutOverflow,
  waitForSelector,
} from "/home/schwi/.gemini/config/skills/bun-ui-ux-testing/resources/harness";

const targetUrl = "http://localhost:3000/dashboard";
const outputDir = "./artifacts/screenshots";

await Bun.write(`${outputDir}/.gitkeep`, "");

await using view = new Bun.WebView({ width: 1920, height: 1080 });
await view.navigate(targetUrl);

// 1. Initial desktop viewport and Full-Page Document capture
await takeScreenshot(view, `${outputDir}/01-desktop-viewport.png`);
await takeFullPageScreenshot(view, `${outputDir}/01-desktop-fullpage.png`);

// 2. Standard Laptop Viewport (1366x768)
await view.resize(1366, 768);
await Bun.sleep(400);
await takeScreenshot(view, `${outputDir}/02-laptop-1366.png`);
const truncationIssues = await auditTextTruncation(view);

// 3. Scroll through document to audit below-the-fold content
await scrollThroughPage(view, { step: 500, delay: 150 });

// 4. Tablet
await view.resize(768, 1024);
await Bun.sleep(400);
await takeFullPageScreenshot(view, `${outputDir}/03-tablet-fullpage.png`);

// 5. Mobile & Touch Targets (Audited across full page height)
await view.resize(375, 812);
await Bun.sleep(400);
await takeFullPageScreenshot(view, `${outputDir}/04-mobile-fullpage.png`);
const touchViolations = await checkTouchTargets(view, 44);

// 6. Typography and Overflow Audits
const fontViolations = await auditFontWeights(view);
const overflowCheck = await auditLayoutOverflow(view);
```

## Auditing and design rules

### 1. Full-page and scrolled content inspection
- Never evaluate only the top fold. Use `takeFullPageScreenshot(view, path)` to capture complete document flows from header to footer.
- Use `await scrollThroughPage(view)` to trigger scroll reveals, lazy components, and dynamic table rows before assertions.
- Use `await scrollToElement(view, selector)` to center specific components into view for focused screenshots.

### 2. Typography and weight ceilings (`frontend-design`)
- Headings use `font-semibold` (600), section titles use `font-medium` (500), body text uses `font-normal` (400).
- Elements must never compute to `font-weight > 600` (e.g. `font-bold` or unstyled browser `<th>` defaults).
- Run `await auditFontWeights(view)` to catch heavy font-weight violations across all rendered DOM nodes.

### 3. Text and number truncation
- Cards, lists, and metric summaries must not clip or truncate monetary values (e.g. `₱9,166,350.00`) on standard laptop widths (1366x768 and 1280x800).
- Run `await auditTextTruncation(view)` to detect clipped nodes.

### 4. Touch target sizing (`modern-web-guidance`)
- All interactive controls on mobile viewports must maintain a minimum bounding box of 44px by 44px (`size-11` or `min-h-[44px] min-w-[44px]`).
- Run `await checkTouchTargets(view, 44)` to verify compliance across the entire scroll height.

### 5. Responsive sweep calculator (breakpoint failure finder)
- Rather than testing only a few fixed screen sizes, sweep through CSS breakpoint boundaries ($\pm 1\text{px}$) to identify exact failure widths (such as `1024px` where grid column switches can cramp cards or headers).
- Use `await sweepBreakpoints(view, { captureFailures: true, outputDir })` to automatically find and capture any viewport widths that trigger truncation, horizontal overflow, or touch violations:

```typescript
import { sweepBreakpoints } from "/home/schwi/.gemini/config/skills/bun-ui-ux-testing/resources/harness";

const sweep = await sweepBreakpoints(view, {
  captureFailures: true,
  outputDir: "./artifacts/screenshots",
});

if (failures.length > 0) {
  console.log(`Found ${failures.length} breaking viewport widths:`);
  for (const f of failures) {
    console.log(`- ${f.width}px: ${f.truncations.length} truncations, overflow: ${f.hasOverflow}`);
    // Embed failure screenshot: ![Failure at ${f.width}px](${f.screenshotPath})
  }
}
```

### 6. Component-level and interactive state auditing
- Always test interactive states on micro-components (chart taps, slice selections, dropdown triggers, popovers, tabs, and form validations).
- **Charts & Tooltips**: Verify that tapping/hovering chart slices does not collide with centered labels or overflow the card container. Prefer dynamic center text for donut charts with centered metrics.
- **Overlays & Portals**: Check that modals, dropdowns, and sheets render with correct z-indices and never cause horizontal scrollbars when open.
- Use `await tapElement(view, selector)` or `await hoverElement(view, selector)` to test component states before taking interactive screenshots.

### 7. Layout overflow and container consistency
- Layouts must align consistently with the application header and gutter padding across viewports (`w-full` with standard responsive gutters).
- Document scroll width must never exceed inner viewport width (`hasHorizontalOverflow: false`).

## Helper references

- `resources/harness.ts`: Full suite of driver and audit methods (`takeScreenshot`, `takeFullPageScreenshot`, `scrollThroughPage`, `scrollToElement`, `scrollToPosition`, `sweepBreakpoints`, `hoverElement`, `tapElement`, `auditInteractiveStates`, `fillField`, `inspectPage`, `checkTouchTargets`, `auditFontWeights`, `auditTextTruncation`, `auditLayoutOverflow`, `waitForSelector`, `waitForText`, `waitForCondition`, `getActiveElementInfo`).
- `references/api-reference.md`: Native `Bun.WebView` constructor options and CDP methods.
- `examples/live-driver.ts`: Standalone script demonstrating live browser navigation, scroll capture, and screenshot export.


