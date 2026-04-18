#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import net from "node:net";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_CHROME_PATH =
  process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : "google-chrome";

const PAGE_ROUTES = [
  ["dashboard", "dashboard"],
  ["users", "users"],
  ["reports", "reports"],
  ["billing", "billing"],
  ["services", "services"],
  ["assets", "assets"],
  ["hr", "hr"],
  ["inventory", "inventory"],
  ["promotions", "promotions"],
  ["pos", "pos"],
  ["pos-sales", "pos/sales"],
  ["pos-returns", "pos/returns"],
  ["loyalty", "loyalty"],
  ["crm", "crm"],
  ["appointments", "appointments"],
  ["sales", "sales"],
  ["job-orders", "job-orders"],
  ["settings", "settings"],
];

const AUTH_ROUTES = [
  ["login", "login"],
  ["forgot-password", "forgot-password"],
  ["reset-password", "reset-password"],
];

const DIALOG_SCENARIOS = [
  {
    name: "users-new-user",
    route: "users",
    action: { kind: "match", type: "text", text: "New", index: -1 },
  },
  {
    name: "services-new-service",
    route: "services",
    action: { kind: "match", type: "text", text: "New", index: -1 },
  },
  {
    name: "billing-new-invoice",
    route: "billing",
    action: { kind: "match", type: "text", text: "New", index: -1 },
  },
  {
    name: "billing-invoice-detail",
    route: "billing",
    action: { kind: "selector", selector: 'tr[id^="invoice-row-"]' },
  },
  {
    name: "assets-new-asset",
    route: "assets",
    action: { kind: "match", type: "text", text: "New", index: -1 },
  },
  {
    name: "hr-new-employee",
    route: "hr",
    action: { kind: "match", type: "text", text: "New", index: -1 },
  },
  {
    name: "inventory-add-item",
    route: "inventory",
    action: { kind: "match", type: "text", text: "Add", index: -1 },
  },
  {
    name: "promotions-new-promotion",
    route: "promotions",
    action: { kind: "match", type: "text", text: "New", index: -1 },
  },
  {
    name: "loyalty-settings",
    route: "loyalty",
    action: { kind: "match", type: "text", text: "Settings", index: -1 },
  },
  {
    name: "loyalty-new-card",
    route: "loyalty",
    action: { kind: "match", type: "text", text: "New Card", index: -1 },
  },
  {
    name: "crm-new-customer",
    route: "crm",
    action: { kind: "match", type: "text", text: "New", index: -1 },
  },
  {
    name: "appointments-new-appointment",
    route: "appointments",
    action: { kind: "match", type: "text", text: "New", index: -1 },
  },
  {
    name: "appointments-event-detail",
    route: "appointments",
    action: { kind: "match", type: "contains", text: "Haircut" },
  },
  {
    name: "job-orders-workflow",
    route: "job-orders",
    action: { kind: "match", type: "text", text: "Workflow", index: -1 },
  },
  {
    name: "job-orders-new-order",
    route: "job-orders",
    action: { kind: "match", type: "text", text: "New", index: -1 },
  },
];

function printHelp() {
  console.log(`
Capture tenant app page and dialog screenshots with headless Chrome.

Usage:
  node scripts/capture-tenant-screenshots.mjs --tenant <slug> --email <email> --password <password> [options]

Options:
  --tenant <slug>         Tenant slug to capture.
  --email <email>         Login email for the tenant.
  --password <password>   Login password for the tenant.
  --base-url <url>        App base URL. Default: ${DEFAULT_BASE_URL}
  --output-dir <path>     Root output directory. Default: artifacts/tenant-app-screenshots
  --chrome-path <path>    Chrome executable path.
  --width <px>            Screenshot width. Default: 1440
  --height <px>           Screenshot height. Default: 1200
  --pages-only            Capture only page screenshots.
  --dialogs-only          Capture only dialog screenshots.
  --help                  Show this help.

Examples:
  node scripts/capture-tenant-screenshots.mjs --tenant retail-company-1 --email retail1@example.com --password 'Summer1$'
  npm run screenshots:tenant -- --tenant retail-company-1 --email retail1@example.com --password 'Summer1$'
`);
}

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    outputDir: "artifacts/tenant-app-screenshots",
    chromePath: DEFAULT_CHROME_PATH,
    width: 1440,
    height: 1200,
    capturePages: true,
    captureDialogs: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];

    if (current === "--help") {
      args.help = true;
      continue;
    }
    if (current === "--tenant") {
      args.tenant = next;
      i += 1;
      continue;
    }
    if (current === "--email") {
      args.email = next;
      i += 1;
      continue;
    }
    if (current === "--password") {
      args.password = next;
      i += 1;
      continue;
    }
    if (current === "--base-url") {
      args.baseUrl = next;
      i += 1;
      continue;
    }
    if (current === "--output-dir") {
      args.outputDir = next;
      i += 1;
      continue;
    }
    if (current === "--chrome-path") {
      args.chromePath = next;
      i += 1;
      continue;
    }
    if (current === "--width") {
      args.width = Number(next);
      i += 1;
      continue;
    }
    if (current === "--height") {
      args.height = Number(next);
      i += 1;
      continue;
    }
    if (current === "--pages-only") {
      args.captureDialogs = false;
      continue;
    }
    if (current === "--dialogs-only") {
      args.capturePages = false;
      continue;
    }

    throw new Error(`Unknown argument: ${current}`);
  }

  return args;
}

function requireArgs(args) {
  if (args.help) return;
  const missing = ["tenant", "email", "password"].filter((key) => !args[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required arguments: ${missing.join(", ")}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to allocate a free port."));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

async function waitForJson(port, route, attempts = 80) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${route}`);
      if (response.ok) return response.json();
    } catch {
      // Keep polling while Chrome starts.
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for Chrome DevTools endpoint: ${route}`);
}

function chromeArgs({ port, userDataDir, width, height }) {
  return [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`,
    "about:blank",
  ];
}

async function launchChrome(options) {
  const port = await getFreePort();
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "tenant-screenshots-"));
  const chrome = spawn(options.chromePath, chromeArgs({ port, userDataDir, ...options }), {
    stdio: ["ignore", "ignore", "pipe"],
  });

  let stderr = "";
  chrome.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    const targets = await waitForJson(port, "/json/list");
    return {
      chrome,
      port,
      userDataDir,
      stderr,
      target: targets.find((item) => item.type === "page") ?? targets[0],
    };
  } catch (error) {
    chrome.kill("SIGTERM");
    await fs.rm(userDataDir, { recursive: true, force: true });
    throw error;
  }
}

async function cleanupChrome(instance) {
  instance.chrome.kill("SIGTERM");
  await new Promise((resolve) => {
    instance.chrome.once("exit", () => resolve());
    setTimeout(resolve, 1000);
  });
  await fs.rm(instance.userDataDir, { recursive: true, force: true });
}

class CdpSession {
  constructor(target, viewport) {
    this.target = target;
    this.viewport = viewport;
    this.id = 0;
    this.pending = new Map();
  }

  async connect() {
    if (!this.target?.webSocketDebuggerUrl) {
      throw new Error("No debuggable Chrome page target found.");
    }

    this.ws = new WebSocket(this.target.webSocketDebuggerUrl);
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        return;
      }
      pending.resolve(message.result);
    };

    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    await this.send("Page.enable");
    await this.send("Runtime.enable");
    await this.send("Emulation.setDeviceMetricsOverride", {
      width: this.viewport.width,
      height: this.viewport.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
    });
  }

  async navigate(url, delay = 2200) {
    await this.send("Page.navigate", { url });
    await sleep(delay);
  }

  async evaluate(expression, { awaitPromise = true } = {}) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise,
    });
    return result.result?.value;
  }

  async screenshot(outputPath) {
    const image = await this.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
    });
    await fs.writeFile(outputPath, Buffer.from(image.data, "base64"));
  }

  async close() {
    this.ws.close();
  }
}

function buildTenantUrl(baseUrl, tenant, route) {
  return `${baseUrl.replace(/\/$/, "")}/${tenant}/${route}`;
}

async function login(session, args) {
  await session.navigate(buildTenantUrl(args.baseUrl, args.tenant, "login"), 2000);
  await session.evaluate(`(() => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    const email = document.querySelector("#email");
    const password = document.querySelector("#password");
    const button = document.querySelector('button[type="submit"]');
    if (!email || !password || !button) throw new Error("Login form not ready.");
    setValue.call(email, ${JSON.stringify(args.email)});
    email.dispatchEvent(new Event("input", { bubbles: true }));
    setValue.call(password, ${JSON.stringify(args.password)});
    password.dispatchEvent(new Event("input", { bubbles: true }));
    button.click();
    return true;
  })()`);

  for (let i = 0; i < 120; i += 1) {
    const href = await session.evaluate("location.href");
    if (String(href).includes("/dashboard")) return;
    await sleep(250);
  }

  throw new Error("Login did not redirect to the dashboard. Check the credentials and base URL.");
}

function clickByMatchExpression(action) {
  return `(() => {
    const normalize = (value) => (value || "").replace(/\\s+/g, " ").trim();
    const visible = (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const matcher = ${JSON.stringify(action)};
    const candidates = Array.from(document.querySelectorAll('button,[role="button"],a,[data-slot="dialog-trigger"]'))
      .filter(visible)
      .map((el) => ({
        el,
        text: normalize(el.innerText || el.textContent),
        aria: normalize(el.getAttribute("aria-label")),
        title: normalize(el.getAttribute("title")),
      }));

    const matches = candidates.filter((item) => {
      const fields = [item.text, item.aria, item.title].filter(Boolean);
      if (matcher.type === "text") return fields.some((field) => field === matcher.text);
      if (matcher.type === "startsWith") return fields.some((field) => field.startsWith(matcher.text));
      if (matcher.type === "contains") return fields.some((field) => field.includes(matcher.text));
      return false;
    });

    if (matches.length === 0) {
      return {
        ok: false,
        available: candidates.map((candidate) => candidate.text || candidate.aria || candidate.title).slice(0, 40),
      };
    }

    const index =
      matcher.index === undefined
        ? 0
        : matcher.index < 0
          ? matches.length + matcher.index
          : matcher.index;

    const target = matches[index] || matches[0];
    target.el.click();
    return { ok: true, picked: target.text || target.aria || target.title };
  })()`;
}

function clickBySelectorExpression(action) {
  return `(() => {
    const target = document.querySelector(${JSON.stringify(action.selector)});
    if (!target) return { ok: false, selector: ${JSON.stringify(action.selector)} };
    target.click();
    return {
      ok: true,
      picked: (target.innerText || target.textContent || target.id || ${JSON.stringify(action.selector)})
        .replace(/\\s+/g, " ")
        .trim()
        .slice(0, 140),
    };
  })()`;
}

async function capturePages(session, args, tenantDir) {
  console.log(`Capturing pages into ${tenantDir}`);

  for (const [name, route] of PAGE_ROUTES) {
    await session.navigate(buildTenantUrl(args.baseUrl, args.tenant, route));
    await session.screenshot(path.join(tenantDir, `${name}.png`));
    console.log(`  page: ${name}`);
  }

  for (const [name, route] of AUTH_ROUTES) {
    await session.navigate(buildTenantUrl(args.baseUrl, args.tenant, route));
    await session.screenshot(path.join(tenantDir, `${name}.png`));
    console.log(`  auth: ${name}`);
  }
}

async function captureDialogs(session, args, dialogsDir) {
  console.log(`Capturing dialogs into ${dialogsDir}`);

  for (const scenario of DIALOG_SCENARIOS) {
    await session.navigate(buildTenantUrl(args.baseUrl, args.tenant, scenario.route));
    const expression =
      scenario.action.kind === "selector"
        ? clickBySelectorExpression(scenario.action)
        : clickByMatchExpression(scenario.action);

    const clickResult = await session.evaluate(expression);
    await sleep(1400);
    await session.screenshot(path.join(dialogsDir, `${scenario.name}.png`));

    if (!clickResult?.ok) {
      console.warn(`  dialog: ${scenario.name} captured, but no trigger matched`);
      continue;
    }

    console.log(`  dialog: ${scenario.name}`);
  }
}

async function ensureChromeExists(chromePath) {
  try {
    await fs.access(chromePath);
  } catch {
    if (chromePath !== DEFAULT_CHROME_PATH) {
      throw new Error(`Chrome executable not found at ${chromePath}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  requireArgs(args);
  await ensureChromeExists(args.chromePath);

  const tenantDir = path.resolve(args.outputDir, args.tenant);
  const dialogsDir = path.join(tenantDir, "dialogs");

  await fs.mkdir(tenantDir, { recursive: true });
  if (args.captureDialogs) {
    await fs.mkdir(dialogsDir, { recursive: true });
  }

  const chrome = await launchChrome({
    chromePath: args.chromePath,
    width: args.width,
    height: args.height,
  });

  const session = new CdpSession(chrome.target, {
    width: args.width,
    height: args.height,
  });

  try {
    await session.connect();
    await login(session, args);

    if (args.capturePages) {
      await capturePages(session, args, tenantDir);
    }

    if (args.captureDialogs) {
      await captureDialogs(session, args, dialogsDir);
    }

    console.log(`Done. Screenshots saved to ${tenantDir}`);
  } finally {
    await session.close().catch(() => {});
    await cleanupChrome(chrome).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
