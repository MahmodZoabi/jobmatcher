const express = require("express");
const { chromium } = require("playwright");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.SCRAPER_API_KEY || "";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

function authMiddleware(req, res, next) {
  if (!API_KEY) return next();
  const key = req.headers["x-api-key"];
  if (key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/scrape", authMiddleware, async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: 'Missing or invalid "url" in request body' });
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return res.status(400).json({ error: "URL must start with http:// or https://" });
    }
  } catch {
    return res.status(400).json({ error: "That doesn't look like a valid URL." });
  }

  let browser;
  try {
    console.log("[scraper] Launching Chromium for", url);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(3_000);

    const text = await page.evaluate(() => document.body.innerText || "");
    console.log("[scraper] Extracted", text.length, "chars");

    return res.json({ text });
  } catch (err) {
    console.error("[scraper] Failed:", err?.message);
    const isTimeout =
      err?.message?.toLowerCase().includes("timeout") ||
      err?.message?.toLowerCase().includes("timed out");
    return res.status(502).json({
      error: isTimeout
        ? "Page took too long to load."
        : "Couldn't load that page.",
    });
  } finally {
    await browser?.close().catch(() => {});
  }
});

app.listen(PORT, () => {
  console.log(`[scraper] Listening on port ${PORT}`);
});
