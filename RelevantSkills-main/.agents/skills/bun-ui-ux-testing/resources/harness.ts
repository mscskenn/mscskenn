/**
 * Zero-dependency UI/UX test harness for Bun.WebView and bun:test.
 */

export interface WaitOptions {
  timeout?: number;
  interval?: number;
}

export interface TouchTargetViolation {
  selector: string;
  width: number;
  height: number;
  text: string;
}

export interface ActiveElementInfo {
  tag: string;
  id: string;
  role: string | null;
  ariaLabel: string | null;
  ariaExpanded: string | null;
  text: string;
}

/**
 * Polls until the given CSS selector matches an element in the DOM.
 */
export async function waitForSelector(
  view: Bun.WebView,
  selector: string,
  options: WaitOptions = {}
): Promise<void> {
  const timeout = options.timeout ?? 5000;
  const interval = options.interval ?? 50;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const exists = await view.evaluate<boolean>(
      `Boolean(document.querySelector(${JSON.stringify(selector)}))`
    );
    if (exists) return;
    await Bun.sleep(interval);
  }
  throw new Error(`Timeout waiting for selector "${selector}" after ${timeout}ms`);
}

/**
 * Polls until the document body includes the target text content.
 */
export async function waitForText(
  view: Bun.WebView,
  text: string,
  options: WaitOptions = {}
): Promise<void> {
  const timeout = options.timeout ?? 5000;
  const interval = options.interval ?? 50;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const found = await view.evaluate<boolean>(
      `document.body ? document.body.innerText.includes(${JSON.stringify(text)}) : false`
    );
    if (found) return;
    await Bun.sleep(interval);
  }
  throw new Error(`Timeout waiting for text "${text}" after ${timeout}ms`);
}

/**
 * Polls until a custom JavaScript predicate evaluates to true.
 */
export async function waitForCondition(
  view: Bun.WebView,
  predicateScript: string,
  options: WaitOptions = {}
): Promise<void> {
  const timeout = options.timeout ?? 5000;
  const interval = options.interval ?? 50;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const satisfied = await view.evaluate<boolean>(
      `Boolean(${predicateScript})`
    );
    if (satisfied) return;
    await Bun.sleep(interval);
  }
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Inspects all visible interactive controls for minimum touch target dimensions.
 */
export async function checkTouchTargets(
  view: Bun.WebView,
  minSize = 44
): Promise<TouchTargetViolation[]> {
  const script = `
    (() => {
      const controls = Array.from(document.querySelectorAll('button, a, input, select, textarea, [role="button"], [tabindex="0"]'));
      return controls
        .filter(el => {
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.width < ${minSize} || rect.height < ${minSize});
        })
        .map(el => {
          const rect = el.getBoundingClientRect();
          const id = el.id ? '#' + el.id : '';
          const cls = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : '';
          return {
            selector: el.tagName.toLowerCase() + id + cls,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            text: (el.textContent || '').trim().slice(0, 30)
          };
        });
    })()
  `;
  return await view.evaluate<TouchTargetViolation[]>(script);
}

/**
 * Retrieves tag, id, accessibility attributes, and text of document.activeElement.
 */
export async function getActiveElementInfo(
  view: Bun.WebView
): Promise<ActiveElementInfo | null> {
  const script = `
    (() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id,
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        ariaExpanded: el.getAttribute('aria-expanded'),
        text: (el.textContent || '').trim()
      };
    })()
  `;
  return await view.evaluate<ActiveElementInfo | null>(script);
}

/**
 * Compares current viewport or clip screenshot against baseline file on disk.
 */
export async function matchSnapshot(
  view: Bun.WebView,
  snapshotPath: string,
  options: { update?: boolean; clip?: { x: number; y: number; width: number; height: number } } = {}
): Promise<boolean> {
  const screenshot = await view.screenshot(options.clip ? { clip: options.clip } : undefined);
  const actualBuffer = Buffer.from(await screenshot.arrayBuffer());

  const file = Bun.file(snapshotPath);
  const exists = await file.exists();

  if (!exists || options.update || process.env.UPDATE_SNAPSHOTS === "1") {
    await Bun.write(snapshotPath, actualBuffer);
    return true;
  }

  const baselineBuffer = Buffer.from(await file.arrayBuffer());
  return actualBuffer.equals(baselineBuffer);
}

/**
 * Captures a screenshot of the current page or clip area and writes it to disk.
 */
export async function takeScreenshot(
  view: Bun.WebView,
  outputPath: string,
  options: { clip?: { x: number; y: number; width: number; height: number }; format?: "png" | "jpeg" | "webp" } = {}
): Promise<string> {
  const blob = await view.screenshot({
    format: options.format ?? "png",
    clip: options.clip,
  });
  const buffer = Buffer.from(await blob.arrayBuffer());
  await Bun.write(outputPath, buffer);
  return outputPath;
}

/**
 * Focuses an input, clears existing content, and types the given value.
 */
export async function fillField(
  view: Bun.WebView,
  selector: string,
  value: string
): Promise<void> {
  await view.click(selector);
  await view.evaluate(`
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (el) {
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `);
  await view.type(value);
}

/**
 * Extracts visible interactive controls and basic page metadata.
 */
export async function inspectPage(view: Bun.WebView): Promise<{
  url: string;
  title: string;
  buttons: string[];
  inputs: Array<{ id: string; name: string; type: string; value: string }>;
}> {
  return await view.evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"]'))
        .map(b => (b.textContent || b.value || '').trim())
        .filter(Boolean);
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
        .map(i => ({
          id: i.id || '',
          name: i.name || '',
          type: i.type || i.tagName.toLowerCase(),
          value: i.value || ''
        }));
      return {
        url: window.location.href,
        title: document.title,
        buttons,
        inputs
      };
    })()
  `);
}

/**
 * Audits page elements for computed font weights exceeding 600 (semibold).
 */
export async function auditFontWeights(view: Bun.WebView): Promise<Array<{
  tag: string;
  cls: string;
  weight: string;
  text: string;
}>> {
  return await view.evaluate(`
    (() => {
      const all = Array.from(document.querySelectorAll('*'));
      return all
        .filter(el => {
          const weight = parseInt(window.getComputedStyle(el).fontWeight, 10);
          return weight > 600;
        })
        .map(el => ({
          tag: el.tagName.toLowerCase(),
          cls: el.className ? String(el.className).slice(0, 50) : '',
          weight: window.getComputedStyle(el).fontWeight,
          text: (el.textContent || '').trim().slice(0, 30)
        }));
    })()
  `);
}

/**
 * Audits cards and monetary elements for scrollWidth > clientWidth text truncation.
 */
export async function auditTextTruncation(view: Bun.WebView): Promise<Array<{
  selector: string;
  text: string;
  scrollWidth: number;
  clientWidth: number;
}>> {
  return await view.evaluate(`
    (() => {
      const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, p, span, div, td, th'))
        .filter(el => el.children.length === 0 && (el.textContent || '').trim().length > 0);
      return elements
        .filter(el => el.scrollWidth > el.clientWidth + 1)
        .map(el => ({
          selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''),
          text: (el.textContent || '').trim(),
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth
        }));
    })()
  `);
}

/**
 * Audits horizontal document overflow against window inner width.
 */
export async function auditLayoutOverflow(view: Bun.WebView): Promise<{
  hasHorizontalOverflow: boolean;
  docScrollWidth: number;
  windowWidth: number;
}> {
  return await view.evaluate(`
    (() => {
      const docScrollWidth = document.documentElement.scrollWidth;
      const windowWidth = window.innerWidth;
      return {
        hasHorizontalOverflow: docScrollWidth > windowWidth,
        docScrollWidth,
        windowWidth
      };
    })()
  `);
}

/**
 * Captures a full-page screenshot from top to bottom of the scrollable document.
 */
export async function takeFullPageScreenshot(
  view: Bun.WebView,
  outputPath: string,
  options: { format?: "png" | "jpeg" | "webp" } = {}
): Promise<string> {
  const { width, scrollHeight, originalHeight } = await view.evaluate(`
    (() => ({
      width: window.innerWidth,
      scrollHeight: Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      ),
      originalHeight: window.innerHeight
    }))()
  `);

  // Scroll through page to trigger lazy loading / animations
  await scrollThroughPage(view, { step: 600, delay: 100 });
  await view.evaluate("window.scrollTo(0, 0)");
  await Bun.sleep(200);

  // Resize to full scroll height and capture
  await view.resize(width, scrollHeight);
  await Bun.sleep(400);

  const blob = await view.screenshot({
    format: options.format ?? "png",
  });
  const buffer = Buffer.from(await blob.arrayBuffer());
  await Bun.write(outputPath, buffer);

  // Restore original viewport dimensions
  await view.resize(width, originalHeight);
  await Bun.sleep(200);

  return outputPath;
}

/**
 * Scrolls smoothly/incrementally through the entire page depth.
 */
export async function scrollThroughPage(
  view: Bun.WebView,
  options: { step?: number; delay?: number } = {}
): Promise<void> {
  const step = options.step ?? 400;
  const delay = options.delay ?? 100;

  const totalHeight = await view.evaluate<number>(
    "Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)"
  );

  let currentY = 0;
  while (currentY < totalHeight) {
    currentY += step;
    await view.evaluate(`window.scrollTo(0, ${currentY})`);
    await Bun.sleep(delay);
  }
}

/**
 * Scrolls the page to make a specific element centered in the viewport.
 */
export async function scrollToElement(
  view: Bun.WebView,
  selector: string
): Promise<void> {
  await view.evaluate(`
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    })()
  `);
  await Bun.sleep(200);
}

/**
 * Scrolls the page to a specific Y coordinate.
 */
export async function scrollToPosition(
  view: Bun.WebView,
  y: number
): Promise<void> {
  await view.evaluate(`window.scrollTo(0, ${y})`);
  await Bun.sleep(200);
}

export interface BreakpointSweepResult {
  width: number;
  height: number;
  truncations: Array<{ selector: string; text: string; scrollWidth: number; clientWidth: number }>;
  hasOverflow: boolean;
  touchViolations: TouchTargetViolation[];
  screenshotPath?: string;
}

/**
 * Sweeps through standard CSS breakpoint transitions (320px to 1920px),
 * calculates UI breaking points, and captures visual failure screenshots.
 */
export async function sweepBreakpoints(
  view: Bun.WebView,
  options: {
    widths?: number[];
    height?: number;
    captureFailures?: boolean;
    outputDir?: string;
  } = {}
): Promise<{
  testedCount: number;
  failures: BreakpointSweepResult[];
}> {
  const standardBreakpoints = [
    320, 375, 414, 639, 640, 767, 768, 834, 1023, 1024, 1152, 1279, 1280, 1366, 1440, 1536, 1920,
  ];
  const testWidths = options.widths ?? standardBreakpoints;
  const height = options.height ?? 800;
  const failures: BreakpointSweepResult[] = [];

  for (const width of testWidths) {
    await view.resize(width, height);
    await Bun.sleep(150);

    const truncations = await auditTextTruncation(view);
    const overflow = await auditLayoutOverflow(view);
    const touchViolations = width <= 768 ? await checkTouchTargets(view, 44) : [];

    const isBroken =
      truncations.length > 0 || overflow.hasHorizontalOverflow || touchViolations.length > 0;

    if (isBroken) {
      let screenshotPath: string | undefined;
      if (options.captureFailures && options.outputDir) {
        screenshotPath = `${options.outputDir}/break-${width}px.png`;
        await takeScreenshot(view, screenshotPath);
      }

      failures.push({
        width,
        height,
        truncations,
        hasOverflow: overflow.hasHorizontalOverflow,
        touchViolations,
        screenshotPath,
      });
    }
  }

  return {
    testedCount: testWidths.length,
    failures,
  };
}

/**
 * Simulates hovering over an element to trigger interactive state / tooltip.
 */
export async function hoverElement(
  view: Bun.WebView,
  selector: string
): Promise<void> {
  await view.evaluate(`
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (el) {
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      }
    })()
  `);
  await Bun.sleep(200);
}

/**
 * Simulates tapping / clicking on a component (chart slice, pill, row, button).
 */
export async function tapElement(
  view: Bun.WebView,
  selector: string
): Promise<void> {
  await view.evaluate(`
    (() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (el) {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    })()
  `);
  await Bun.sleep(200);
}

/**
 * Audits a set of interactive components by triggering tap / hover and checking for text collision or layout shifts.
 */
export async function auditInteractiveStates(
  view: Bun.WebView,
  selectors: string[],
  options: { captureScreenshots?: boolean; outputDir?: string } = {}
): Promise<Array<{
  selector: string;
  screenshotPath?: string;
  truncations: any[];
}>> {
  const results = [];
  let step = 1;

  for (const selector of selectors) {
    await tapElement(view, selector);
    await Bun.sleep(200);

    const truncations = await auditTextTruncation(view);
    let screenshotPath: string | undefined;

    if (options.captureScreenshots && options.outputDir) {
      screenshotPath = `${options.outputDir}/interaction-${step}-${selector.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30)}.png`;
      await takeScreenshot(view, screenshotPath);
    }

    results.push({
      selector,
      screenshotPath,
      truncations,
    });

    step++;
  }

  return results;
}





