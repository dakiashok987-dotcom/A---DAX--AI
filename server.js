// A-DAX AI Backend
// Node.js 18+
// No external dependencies required.
// API keys must remain in server environment variables.

const http = require("http");
const https = require("https");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || "";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || "";

const OPENAI_CHAT_MODEL =
  process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini";

const IMAGE_MODEL =
  process.env.IMAGE_MODEL || "gpt-image-1";

const TTS_MODEL =
  process.env.TTS_MODEL || "gpt-4o-mini-tts";

const ALLOWED_ORIGINS = [
  "https://cool-axolotl-22b926.netlify.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
];

const requestCounts = new Map();

function send(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });

  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;

    req.on("data", chunk => {
      size += chunk.length;

      if (size > 200 * 1024) {
        reject(new Error("Request too large"));
        req.destroy();
        return;
      }

      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function callAPI(url, method, headers, data) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);

    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method,
        headers,
        timeout: 120000
      },
      response => {
        let body = "";

        response.setEncoding("utf8");

        response.on("data", chunk => {
          body += chunk;
        });

        response.on("end", () => {
          let result;

          try {
            result = JSON.parse(body);
          } catch {
            result = { error: "Invalid upstream response" };
          }

          resolve({
            status: response.statusCode,
            data: result
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("API request timed out"));
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

function clientIP(req) {
  // Do not trust arbitrary forwarded IP headers.
  return req.socket.remoteAddress || "unknown";
}

function rateLimit(req) {
  const ip = clientIP(req);
  const now = Date.now();

  let entry = requestCounts.get(ip);

  if (!entry || now - entry.start > 60000) {
    entry = { start: now, count: 0 };
  }

  entry.count++;
  requestCounts.set(ip, entry);

  return entry.count <= 30;
}

function validText(value, maxLength = 10000) {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength;
}

async function openAIRequest(path, payload) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return callAPI(
    "https://api.openai.com" + path,
    "POST",
    {
      "Authorization": "Bearer " + OPENAI_API_KEY,
      "Content-Type": "application/json"
    },
    payload
  );
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-adax-token"
  );

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  let pathname;

  try {
    pathname = new URL(
      req.url,
      "http://localhost"
    ).pathname;
  } catch {
    return send(res, 400, { error: "Invalid URL" });
  }

  if (pathname === "/api/health" && req.method === "GET") {
    return send(res, 200, {
      adax: true,
      chat: Boolean(OPENAI_API_KEY),
      image: Boolean(OPENAI_API_KEY),
      tts: Boolean(OPENAI_API_KEY),
      search: Boolean(BRAVE_API_KEY),
      tokenRequired: Boolean(ACCESS_TOKEN)
    });
  }

  if (
    !pathname.startsWith("/api/") ||
    ![
      "/api/chat",
      "/api/image",
      "/api/tts",
      "/api/search"
    ].includes(pathname)
  ) {
    return send(res, 404, { error: "API route not found" });
  }

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return send(res, 403, { error: "Origin not allowed" });
  }

  if (
    ACCESS_TOKEN &&
    req.headers["x-adax-token"] !== ACCESS_TOKEN
  ) {
    return send(res, 401, { error: "Unauthorized" });
  }

  if (!rateLimit(req)) {
    return send(res, 429, {
      error: "Too many requests. Please wait."
    });
  }

  try {
    // ------------------------------
    // REAL AI CHAT
    // POST /api/chat
    // ------------------------------

    if (pathname === "/api/chat" && req.method === "POST") {
      const body = await readBody(req);

      const prompt =
        body.message || body.prompt || body.text;

      if (!validText(prompt)) {
        return send(res, 400, {
          error: "Please provide a valid message."
        });
      }

      const result = await openAIRequest(
        "/v1/chat/completions",
        {
          model: OPENAI_CHAT_MODEL,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        }
      );

      if (result.status < 200 || result.status >= 300) {
        console.error("Chat API error:", result.status);

        return send(res, 502, {
          error: "AI chat request failed.",
          details: result.data.error?.message || "Upstream error"
        });
      }

      return send(res, 200, {
        text: result.data.choices?.[0]?.message?.content || "",
        reply: result.data.choices?.[0]?.message?.content || ""
      });
    }

    // ------------------------------
    // REAL AI IMAGE GENERATION
    // POST /api/image
    // ------------------------------

    if (pathname === "/api/image" && req.method === "POST") {
      const body = await readBody(req);

      const prompt = body.prompt;

      if (!validText(prompt, 4000)) {
        return send(res, 400, {
          error: "Please enter an image description."
        });
      }

      const allowedSizes = [
        "1024x1024",
        "1536x1024",
        "1024x1536"
      ];

      const size = allowedSizes.includes(body.size)
        ? body.size
        : "1024x1024";

      const result = await openAIRequest(
        "/v1/images/generations",
        {
          model: IMAGE_MODEL,
          prompt: prompt,
          size: size
        }
      );

      if (result.status < 200 || result.status >= 300) {
        console.error("Image API error:", result.status);

        return send(res, 502, {
          error: "Image generation failed.",
          details: result.data.error?.message || "Upstream error"
        });
      }

      const image = result.data.data?.[0];

      if (!image?.b64_json) {
        return send(res, 502, {
          error: "The image service did not return image data."
        });
      }

      return send(res, 200, {
        success: true,
        b64: image.b64_json,
        image: "data:image/png;base64," + image.b64_json
      });
    }

    // ------------------------------
    // TEXT TO SPEECH
    // POST /api/tts
    // ------------------------------

    if (pathname === "/api/tts" && req.method === "POST") {
      const body = await readBody(req);

      const text = body.text;

      if (!validText(text, 4000)) {
        return send(res, 400, {
          error: "Please provide narration text."
        });
      }

      const voices = [
        "alloy",
        "ash",
        "coral",
        "echo",
        "fable",
        "nova",
        "onyx",
        "sage",
        "shimmer"
      ];

      const voice = voices.includes(body.voice)
        ? body.voice
        : "alloy";

      const result = await openAIRequest(
        "/v1/audio/speech",
        {
          model: TTS_MODEL,
          voice: voice,
          input: text,
          response_format: "mp3"
        }
      );

      if (result.status < 200 || result.status >= 300) {
        console.error("TTS API error:", result.status);

        return send(res, 502, {
          error: "Speech generation failed.",
          details: result.data.error?.message || "Upstream error"
        });
      }

      return send(res, 200, {
        success: true,
        audio: "data:audio/mpeg;base64," +
          Buffer.from(result.data).toString("base64")
      });
    }

    // ------------------------------
    // WEB SEARCH
    // GET /api/search?q=...
    // ------------------------------

    if (pathname === "/api/search" && req.method === "GET") {
      if (!BRAVE_API_KEY) {
        return send(res, 503, {
          error: "Search is not configured."
        });
      }

      const query = new URL(
        req.url,
        "http://localhost"
      ).searchParams.get("q");

      if (!validText(query, 500)) {
        return send(res, 400, {
          error: "Please enter a search query."
        });
      }

      const result = await callAPI(
        "https://api.search.brave.com/res/v1/web/search?q=" +
          encodeURIComponent(query),
        "GET",
        {
          "Accept": "application/json",
          "X-Subscription-Token": BRAVE_API_KEY
        },
        null
      );

      if (result.status < 200 || result.status >= 300) {
        return send(res, 502, {
          error: "Search request failed."
        });
      }

      return send(res, 200, {
        results: result.data.web?.results || []
      });
    }

    return send(res, 405, {
      error: "Method not allowed"
    });

  } catch (error) {
    console.error("Backend error:", error.message);

    const status = error.message === "Request too large"
      ? 413
      : error.message === "Invalid JSON"
        ? 400
        : 500;

    return send(res, status, {
      error: status === 500
        ? "An internal server error occurred."
        : error.message
    });
  }
});

server.listen(PORT, () => {
  console.log("A-DAX AI backend running on port " + PORT);
});
