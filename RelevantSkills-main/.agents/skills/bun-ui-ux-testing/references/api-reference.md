# Bun.WebView API Reference

`Bun.WebView` is Bun native headless browser automation engine available in Bun 1.4+. It drives native OS engines without third-party npm packages.

## Constructor

```typescript
const view = new Bun.WebView(options?: {
  width?: number;       // Default: 1280
  height?: number;      // Default: 800
  url?: string;         // Initial URL to load
  html?: string;        // Initial HTML content string
  headless?: boolean;   // Headless mode flag
  preload?: string;     // Path to preload script
});
```

### Lifecycle and resource management

`Bun.WebView` implements `Symbol.asyncDispose` and `Symbol.dispose`. Use `await using` or `using` for automatic cleanup at scope exit.

```typescript
// Auto-disposed at block exit
{
  await using view = new Bun.WebView({ width: 1024, height: 768 });
  await view.navigate("http://localhost:3000");
}

// Manual cleanup
view.close();
Bun.WebView.closeAll();
```

## Instance properties

- `view.url`: Current URL string loaded in the webview.
- `view.title`: Current document title string.
- `view.loading`: Boolean indicating if navigation or asset loading is in progress.
- `view.onNavigated`: Callback fired when navigation completes.
- `view.onNavigationFailed`: Callback fired when navigation fails.

## Navigation methods

- `await view.navigate(url: string)`: Navigates to the specified URL or `data:` URI.
- `await view.reload()`: Reloads the current page.
- `await view.goBack()`: Navigates back in browser history.
- `await view.goForward()`: Navigates forward in browser history.

## Interaction methods

All interactions dispatch native OS hardware events (`isTrusted: true`).

- `await view.click(selector: string, options?: { button?: "left" | "right" | "middle", clickCount?: number })`: Clicks element matching CSS selector.
- `await view.type(text: string, options?: { delay?: number })`: Types text into currently focused element.
- `await view.press(key: string)`: Sends key event (e.g. `"Tab"`, `"Enter"`, `"Escape"`, `"ArrowDown"`).
- `await view.scroll(dx: number, dy: number)`: Scrolls viewport by relative pixel offset.
- `await view.scrollTo(x: number, y: number)`: Scrolls viewport to absolute pixel position.
- `await view.resize(width: number, height: number)`: Resizes viewport dimensions.

## Evaluation and capture

- `await view.evaluate<T>(script: string): Promise<T>`: Executes JavaScript in the page context and returns serializable result. Use IIFE syntax for multi-statement scripts: `await view.evaluate("(() => { return 1 + 1; })()")`.
- `await view.screenshot(options?: { format?: "png" | "jpeg" | "webp", quality?: number, clip?: { x: number, y: number, width: number, height: number } }): Promise<Blob>`: Captures page or clip rectangle to a Web `Blob`. Save with `await Bun.write("image.png", blob)`.
- `await view.cdp(method: string, params?: object)`: Executes Chrome DevTools Protocol command directly.
