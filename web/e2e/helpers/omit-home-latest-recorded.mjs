import { createServer, request } from "node:http";

const upstream = new URL(process.env.MIMIC_API_BASE_URL ?? "");
if (upstream.protocol !== "http:" || upstream.hostname !== "127.0.0.1" ||
    upstream.pathname.replace(/\/$/, "") !== "/api/v1" ||
    upstream.username || upstream.password || upstream.search || upstream.hash) {
  throw new Error("The 2I Home proxy requires a loopback HTTP API base URL ending in /api/v1");
}

const port = Number(process.env.MIMIC_PHASE_2I_PROXY_PORT ?? 32141);
const homePath = "/api/v1/home";
createServer((incoming, outgoing) => {
  if (incoming.url === "/health") {
    outgoing.end("ready");
    return;
  }

  const target = new URL(upstream.origin);
  const requested = new URL(incoming.url, upstream.origin);
  target.pathname = requested.pathname;
  target.search = requested.search;
  const rewriteHome = incoming.method === "GET" && target.pathname === homePath;
  const headers = { ...incoming.headers, host: upstream.host };
  if (rewriteHome) headers["accept-encoding"] = "identity";

  const forwarded = request(target, { method: incoming.method, headers }, async (response) => {
    if (!rewriteHome || response.statusCode !== 200) {
      outgoing.writeHead(response.statusCode, response.headers);
      response.pipe(outgoing);
      return;
    }

    try {
      const chunks = [];
      for await (const chunk of response) chunks.push(chunk);
      const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      for (const card of payload.data.cards) delete card.latest_recorded;
      const body = Buffer.from(JSON.stringify(payload));
      const rewritten = { ...response.headers, "content-length": body.length };
      delete rewritten["transfer-encoding"];
      delete rewritten.etag;
      outgoing.writeHead(200, rewritten);
      outgoing.end(body);
    } catch (error) {
      console.error("Could not rewrite the 2I Home fixture", error);
      outgoing.writeHead(502).end();
    }
  });
  forwarded.on("error", (error) => {
    console.error("Could not reach the loopback test API", error);
    if (!outgoing.headersSent) outgoing.writeHead(502);
    outgoing.end();
  });
  incoming.pipe(forwarded);
}).listen(port, "127.0.0.1");
