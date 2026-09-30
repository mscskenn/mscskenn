import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { checkTouchTargets, getActiveElementInfo } from "../resources/harness";

describe("Responsive layout and accessibility suite", () => {
  let server: ReturnType<typeof Bun.serve>;
  let baseUrl: string;
  let view: Bun.WebView;

  beforeAll(async () => {
    server = Bun.serve({
      port: 0,
      fetch(req) {
        return new Response(
          `<!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Dashboard</title>
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: sans-serif; }
                .layout { display: flex; min-height: 100vh; flex-direction: row; }
                .sidebar { display: flex; width: 240px; background: #f4f4f5; padding: 1rem; }
                .mobile-header { display: none; padding: 1rem; background: #e4e4e7; width: 100%; }
                .touch-btn { min-width: 44px; min-height: 44px; padding: 0.5rem 1rem; }
                .text-input { min-height: 44px; padding: 0.5rem; }
                .main-content { flex: 1; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; }

                @media (max-width: 768px) {
                  .layout { flex-direction: column; }
                  .sidebar { display: none; }
                  .mobile-header { display: block; }
                }
              </style>
            </head>
            <body>
              <header id="mobile-nav" class="mobile-header">
                <button id="menu-btn" class="touch-btn" aria-label="Open navigation menu">Menu</button>
              </header>

              <div class="layout">
                <aside id="desktop-sidebar" class="sidebar">
                  <nav>
                    <a href="#overview" class="touch-btn">Overview</a>
                  </nav>
                </aside>

                <main class="main-content">
                  <input id="first-name" class="text-input" placeholder="First Name" />
                  <input id="last-name" class="text-input" placeholder="Last Name" />
                  <button id="submit-action" class="touch-btn">Continue</button>
                </main>
              </div>
            </body>
          </html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      },
    });
    baseUrl = `http://localhost:${server.port}`;
    view = new Bun.WebView({ width: 1280, height: 800 });
  });

  beforeEach(async () => {
    await view.navigate(baseUrl);
    await view.resize(1280, 800);
  });

  afterAll(() => {
    view.close();
    server.stop();
  });

  test("adapts layout across mobile and desktop breakpoints", async () => {
    // Desktop check
    let isSidebarVisible = await view.evaluate<boolean>(
      "window.getComputedStyle(document.getElementById('desktop-sidebar')).display !== 'none'"
    );
    let isMobileNavVisible = await view.evaluate<boolean>(
      "window.getComputedStyle(document.getElementById('mobile-nav')).display !== 'none'"
    );
    expect(isSidebarVisible).toBe(true);
    expect(isMobileNavVisible).toBe(false);

    // Mobile check
    await view.resize(375, 667);
    isSidebarVisible = await view.evaluate<boolean>(
      "window.getComputedStyle(document.getElementById('desktop-sidebar')).display !== 'none'"
    );
    isMobileNavVisible = await view.evaluate<boolean>(
      "window.getComputedStyle(document.getElementById('mobile-nav')).display !== 'none'"
    );
    expect(isSidebarVisible).toBe(false);
    expect(isMobileNavVisible).toBe(true);
  });

  test("verifies 44px touch targets on mobile", async () => {
    await view.resize(375, 667);
    const violations = await checkTouchTargets(view, 44);
    expect(violations).toEqual([]);
  });

  test("verifies keyboard focus progression with Tab", async () => {
    await view.click("#first-name");
    let active = await getActiveElementInfo(view);
    expect(active?.id).toBe("first-name");

    await view.press("Tab");
    active = await getActiveElementInfo(view);
    expect(active?.id).toBe("last-name");

    await view.press("Tab");
    active = await getActiveElementInfo(view);
    expect(active?.id).toBe("submit-action");
  });
});
