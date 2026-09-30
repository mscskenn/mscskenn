import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { waitForText } from "../resources/harness";

describe("Interactive flow and form validation suite", () => {
  let server: ReturnType<typeof Bun.serve>;
  let baseUrl: string;
  let view: Bun.WebView;

  beforeAll(async () => {
    server = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname === "/") {
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <title>Account Settings</title>
                <style>
                  body { font-family: sans-serif; margin: 2rem; }
                  .field[data-invalid] input { border: 2px solid #ef4444; }
                  .field[data-invalid] .error-msg { display: block; color: #ef4444; }
                  .error-msg { display: none; font-size: 0.875rem; }
                </style>
              </head>
              <body>
                <h1>Account Settings</h1>
                <form id="settings-form" onsubmit="event.preventDefault(); handleSubmit();">
                  <div id="email-field" class="field" data-field="email">
                    <label for="email">Email Address</label>
                    <input id="email" name="email" type="email" aria-describedby="email-error" />
                    <span id="email-error" class="error-msg">Please enter a valid email.</span>
                  </div>

                  <button id="save-btn" type="submit" style="min-width: 44px; min-height: 44px; margin-top: 1rem;">
                    Save Changes
                  </button>
                </form>

                <div id="status-toast" style="display: none; margin-top: 1rem; color: #15803d;">
                  Profile updated successfully.
                </div>

                <script>
                  function handleSubmit() {
                    const field = document.getElementById('email-field');
                    const input = document.getElementById('email');
                    const toast = document.getElementById('status-toast');

                    if (!input.value || !input.value.includes('@')) {
                      field.setAttribute('data-invalid', 'true');
                      input.setAttribute('aria-invalid', 'true');
                      toast.style.display = 'none';
                    } else {
                      field.removeAttribute('data-invalid');
                      input.removeAttribute('aria-invalid');
                      toast.style.display = 'block';
                    }
                  }
                </script>
              </body>
            </html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        }
        return new Response("Not Found", { status: 404 });
      },
    });
    baseUrl = `http://localhost:${server.port}`;
    view = new Bun.WebView({ width: 1024, height: 768 });
  });

  beforeEach(async () => {
    await view.navigate(baseUrl);
  });

  afterAll(() => {
    view.close();
    server.stop();
  });

  test("initial state is valid and clean", async () => {
    const isInvalid = await view.evaluate<boolean>(
      "document.getElementById('email-field')?.hasAttribute('data-invalid') ?? false"
    );
    expect(isInvalid).toBe(false);
  });

  test("validates required fields and applies shadcn data-invalid and aria-invalid contracts", async () => {
    // Attempt empty submit
    await view.click("#save-btn");

    let isInvalid = await view.evaluate<boolean>(
      "document.getElementById('email-field')?.hasAttribute('data-invalid') ?? false"
    );
    let ariaInvalid = await view.evaluate<string | null>(
      "document.getElementById('email')?.getAttribute('aria-invalid')"
    );
    expect(isInvalid).toBe(true);
    expect(ariaInvalid).toBe("true");

    // Enter valid email and resubmit
    await view.click("#email");
    await view.type("admin@example.org");
    await view.click("#save-btn");

    await waitForText(view, "Profile updated successfully.");

    isInvalid = await view.evaluate<boolean>(
      "document.getElementById('email-field')?.hasAttribute('data-invalid') ?? false"
    );
    ariaInvalid = await view.evaluate<string | null>(
      "document.getElementById('email')?.getAttribute('aria-invalid')"
    );
    expect(isInvalid).toBe(false);
    expect(ariaInvalid).toBe(null);
  });
});
