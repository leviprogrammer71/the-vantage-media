#!/usr/bin/env node
/**
 * The Vantage MCP Server
 *
 * Lets real-estate agents create short-form video reels from listing photos or
 * a Zillow/Airbnb URL entirely through Claude — no dashboard login required.
 *
 * Tools:
 *   - vantage_fetch_listing         (read-only): fetch photos + details from a URL
 *   - vantage_generate_reel         : render a reel from uploaded photos
 *   - vantage_create_reel_from_url  : fetch + render in one call (primary tool)
 *
 * Transport: Streamable HTTP (stateless JSON) for remote hosting, or stdio for
 * local use. Select with the TRANSPORT env var ("http" | "stdio", default http).
 *
 * Auth: each request carries the agent's Vantage session token via the
 * `Authorization: Bearer <token>` (or `x-vantage-token`) header, or the
 * VANTAGE_TOKEN env var for local runs.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import express from "express";

import { registerFetchListing } from "./tools/fetchListing.js";
import { registerGenerateReel } from "./tools/generateReel.js";
import { registerCreateReelFromUrl } from "./tools/createReelFromUrl.js";
import { withRequestContext } from "./tools/shared.js";

const SERVER_NAME = "vantage-mcp-server";
const SERVER_VERSION = "1.0.0";

/** Build a fully-configured MCP server instance with all tools registered. */
function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerFetchListing(server);
  registerGenerateReel(server);
  registerCreateReelFromUrl(server);
  return server;
}

/** Run over Streamable HTTP (stateless JSON) — recommended for remote hosting. */
async function runHttp(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: "12mb" })); // base64 photos can be large

  // Simple health check for load balancers / uptime probes.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: SERVER_NAME, version: SERVER_VERSION });
  });

  // Single MCP request handler. Because Claude's "Add custom connector" dialog
  // has no field for a Bearer token (only a URL + optional OAuth), we ALSO
  // accept the connector token embedded in the URL path — `/mcp/<token>` — or
  // as a `?token=` query param. That makes the connector URL self-authenticating:
  // the user pastes one URL and nothing else. Header auth still works too.
  const handleMcp = async (req: express.Request, res: express.Response): Promise<void> => {
    // Pull a token from the path param or query string, if present, and fold
    // it into the headers the tool handlers read.
    const pathToken = typeof req.params.token === "string" ? req.params.token : undefined;
    const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
    const urlToken = pathToken || queryToken;
    const headers = { ...req.headers };
    if (urlToken && !headers["x-vantage-token"] && !headers["authorization"]) {
      headers["x-vantage-token"] = urlToken;
    }

    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    try {
      await server.connect(transport);
      await withRequestContext({ headers }, async () => {
        await transport.handleRequest(req, res, req.body);
      });
    } catch (error) {
      console.error("[vantage-mcp] request error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  };

  // Streamable HTTP uses POST for JSON-RPC; GET/DELETE are used by some clients
  // for the SSE stream / teardown. Register both the bare and tokenized paths.
  app.post("/mcp", handleMcp);
  app.get("/mcp", handleMcp);
  app.delete("/mcp", handleMcp);
  app.post("/mcp/:token", handleMcp);
  app.get("/mcp/:token", handleMcp);
  app.delete("/mcp/:token", handleMcp);

  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, () => {
    console.error(`${SERVER_NAME} v${SERVER_VERSION} listening on http://localhost:${port}/mcp`);
  });
}

/** Run over stdio — for local CLI / subprocess integration. */
async function runStdio(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
}

const transport = (process.env.TRANSPORT || "http").toLowerCase();
const main = transport === "stdio" ? runStdio : runHttp;
main().catch((error) => {
  console.error("Fatal server error:", error);
  process.exit(1);
});
