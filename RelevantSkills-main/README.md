# Relevant skills for relevant workflows

A collection of agent skills for coding, design, modeling, and automated testing.

## Runtime requirements for bun-ui-ux-testing

The `bun-ui-ux-testing` skill uses `Bun.WebView` to drive headless browser sessions and capture UI/UX audits.

### Target project runtime vs test runner runtime

- **Your target project**: Runs on any runtime (Node.js, Bun, Deno, Python, Go, Ruby, or static files). It only needs an active HTTP port or local URL (for example `http://localhost:3000`).
- **The test driver script**: Requires **Bun 1.4 or higher** on your machine. `Bun.WebView` is built directly into the Bun runtime starting from version 1.4.

## Installing Bun

Install Bun 1.4+ for your operating system:

### macOS

Run in Terminal:

```bash
curl -fsSL https://bun.sh/install | bash
```

Or install via Homebrew:

```bash
brew install bun
```

Verify the installation:

```bash
bun --version
```

### Linux

Run in your shell:

```bash
curl -fsSL https://bun.sh/install | bash
```

Add Bun to your PATH if not automatically loaded:

```bash
source ~/.bashrc
# or
source ~/.zshrc
```

Verify the version:

```bash
bun --version
```

### Windows Subsystem for Linux (WSL / WSL2)

Open your WSL terminal (e.g. Ubuntu on WSL2) and run:

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

### Windows (Native PowerShell)

Open PowerShell and run:

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Or install via Winget or Scoop:

```powershell
# Winget
winget install Oven-sh.Bun

# Scoop
scoop install bun
```

Verify the installation in a new PowerShell window:

```powershell
bun --version
```

## Installing Chromium and browser runtimes

`Bun.WebView` drives native OS webview engines and headless Chromium.

### macOS

macOS includes WebKit (`WKWebView`) natively. To install Chromium or Google Chrome for Chromium-specific testing:

```bash
brew install --cask google-chrome
# or
brew install --cask chromium
```

### Linux

Install Chromium through your distribution package manager:

#### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y chromium-browser
```

If your distribution requires a direct `.deb` package (avoiding snap in containerized setups):

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt-get install -f -y
```

#### Fedora / RHEL

```bash
sudo dnf install -y chromium
```

#### Arch Linux

```bash
sudo pacman -S chromium
```

### Windows Subsystem for Linux (WSL / WSL2)

Inside WSL, install Chromium or Google Chrome using apt:

```bash
sudo apt update
sudo apt install -y chromium-browser
```

For WSL2 instances requiring Chrome directly:

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb
sudo apt-get install -f -y
```

WSLg handles visual windows automatically if running in headed mode on Windows 11. Headless mode runs without display servers.

### Windows (Native)

Windows 10 and 11 come with the Microsoft Edge WebView2 runtime pre-installed. If missing or damaged, install it via Winget:

```powershell
winget install Microsoft.EdgeWebView2Runtime
```

To install Google Chrome or Chromium:

```powershell
winget install Google.Chrome
# or
winget install Hibbiki.Chromium
```

## Running UI/UX tests

Start your application server in one terminal (for example, a Node.js project):

```bash
npm run dev
```

Invoke the skill using your favorite agent:

```
/bun-ui-ux-testing <target>
```
