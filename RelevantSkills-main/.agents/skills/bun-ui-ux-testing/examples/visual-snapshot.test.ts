import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { matchSnapshot } from "../resources/harness";

describe("Visual snapshot testing suite", () => {
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
              <title>Card Snapshot</title>
              <style>
                body { margin: 0; padding: 2rem; background: #ffffff; font-family: sans-serif; }
                .card { width: 300px; padding: 1.5rem; border: 1px solid #e4e4e7; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .card h2 { font-size: 1.25rem; margin-bottom: 0.5rem; }
                .card p { color: #71717a; font-size: 0.875rem; }
              </style>
            </head>
            <body>
              <div id="card" class="card">
                <h2>Account Summary</h2>
                <p>All services are running normally.</p>
              </div>
            </body>
          </html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      },
    });
    baseUrl = `http://localhost:${server.port}`;
    view = new Bun.WebView({ width: 800, height: 600 });
  });

  afterAll(() => {
    view.close();
    server.stop();
  });

  test("captures and verifies visual snapshot match", async () => {
    await view.navigate(baseUrl);

    const snapshotPath = "/tmp/test-card-snapshot.png";
    const firstRunMatches = await matchSnapshot(view, snapshotPath, { update: true });
    expect(firstRunMatches).toBe(true);

    const secondRunMatches = await matchSnapshot(view, snapshotPath);
    expect(secondRunMatches).toBe(true);
  });
});
