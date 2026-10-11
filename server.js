// A-DAX AI starter backend. Zero dependencies; needs Node 18+.
// API keys are read ONLY from environment variables and never sent to the browser.
const http = require("http"), fs = require("fs"), path = require("path");
const { ANTHROPIC_API_KEY, OPENAI_API_KEY, BRAVE_API_KEY, ACCESS_TOKEN, PORT = 3000 } = process.env;
const CHAT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const IMAGE_MODEL = process.env.IMAGE_MODEL || "gpt-image-1";
const TTS_MODEL = process.env.TTS_MODEL || "gpt-4o-mini-tts";
const PUB = path.join(__dirname, "public");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json" };
const hits = new Map(); // simple per-IP rate limit: 30 API calls / minute
function limited(ip) { const now = Date.now(), a = (hits.get(ip) || []).filter(t => now - t < 60000); a.push(now); hits.set(ip, a); return a.length > 30; }
function send(res, code, obj) { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); }
function body(req) { return new Promise((ok, no) => { let d = ""; req.on("data", c => { d += c; if (d.length > 200000) { no(new Error("Request too large")); req.destroy(); } }); req.on("end", () => { try { ok(JSON.parse(d || "{}")); } catch (e) { no(new Error("Invalid JSON")); } }); }); }
async function upstream(url, opts, what) {
  const r = await fetch(url, opts);
  if (!r.ok) { const t = (await r.text()).slice(0, 300); throw Object.assign(new Error(what + " provider error " + r.status + ": " + t), { status: 502 }); }
  return r;
}
const routes = {
  "POST /api/chat": async (req, res) => {
    if (!ANTHROPIC_API_KEY) return send(res, 503, { error: "Chat is not configured on the server (ANTHROPIC_API_KEY missing)." });
    const { messages } = await body(req);
    if (!Array.isArray(messages) || !messages.length) return send(res, 400, { error: "messages required" });
    const r = await upstream("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: CHAT_MODEL, max_tokens: 4000, messages: messages.slice(-20).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content).slice(0, 12000) })) }) }, "Chat");
    const j = await r.json(); send(res, 200, { text: (j.content || []).filter(b => b.type === "text").map(b => b.text).join("") });
  },
  "POST /api/image": async (req, res) => {
    if (!OPENAI_API_KEY) return send(res, 503, { error: "Image generation is not configured on the server (OPENAI_API_KEY missing)." });
    const { prompt, size } = await body(req);
    if (!prompt) return send(res, 400, { error: "prompt required" });
    const sz = ["1024x1024", "1024x1536", "1536x1024"].includes(size) ? size : "1024x1024";
    const r = await upstream("https://api.openai.com/v1/images/generations", { method: "POST", headers: { authorization: "Bearer " + OPENAI_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ model: IMAGE_MODEL, prompt: String(prompt).slice(0, 3000), size: sz, n: 1 }) }, "Image");
    const j = await r.json(); const b64 = j.data && j.data[0] && j.data[0].b64_json;
    if (!b64) return send(res, 502, { error: "Image provider returned no image." }); send(res, 200, { b64 });
  },
  "POST /api/tts": async (req, res) => {
    if (!OPENAI_API_KEY) return send(res, 503, { error: "Text-to-speech is not configured on the server (OPENAI_API_KEY missing)." });
    const { text, tone, style } = await body(req);
    if (!text) return send(res, 400, { error: "text required" });
    const r = await upstream("https://api.openai.com/v1/audio/speech", { method: "POST", headers: { authorization: "Bearer " + OPENAI_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ model: TTS_MODEL, voice: "alloy", input: String(text).slice(0, 4000), instructions: `Tone: ${tone || "warm"}. Style: ${style || "narrator"}.`, response_format: "mp3" }) }, "TTS");
    res.writeHead(200, { "content-type": "audio/mpeg" }); res.end(Buffer.from(await r.arrayBuffer()));
  },
  "GET /api/search": async (req, res, url) => {
    if (!BRAVE_API_KEY) return send(res, 503, { error: "Search is not configured on the server (BRAVE_API_KEY missing)." });
    const q = (url.searchParams.get("q") || "").slice(0, 300); if (!q) return send(res, 400, { error: "q required" });
    const r = await upstream("https://api.search.brave.com/res/v1/web/search?count=8&q=" + encodeURIComponent(q), { headers: { "x-subscription-token": BRAVE_API_KEY, accept: "application/json" } }, "Search");
    const j = await r.json(); send(res, 200, { results: ((j.web && j.web.results) || []).map(x => ({ title: x.title, url: x.url, snippet: x.description })) });
  },
};
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/api/health") return send(res, 200, { adax: true, chat: !!ANTHROPIC_API_KEY, image: !!OPENAI_API_KEY, tts: !!OPENAI_API_KEY, search: !!BRAVE_API_KEY, tokenRequired: !!ACCESS_TOKEN });
    if (url.pathname.startsWith("/api/")) {
      if (ACCESS_TOKEN && req.headers["x-adax-token"] !== ACCESS_TOKEN) return send(res, 401, { error: "Unauthorized — enter the access token in A-DAX Settings." });
      if (limited(req.socket.remoteAddress)) return send(res, 429, { error: "Too many requests. Wait a minute." });
      const h = routes[req.method + " " + url.pathname];
      return h ? await h(req, res, url) : send(res, 404, { error: "Not found" });
    }
    let f = path.normalize(path.join(PUB, url.pathname === "/" ? "index.html" : url.pathname));
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
  } catch (e) { if (!res.headersSent) send(res, e.status || 500, { error: e.message }); else res.end(); }
}).listen(PORT, () => console.log("A-DAX AI running on port " + PORT));
