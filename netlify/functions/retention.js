import { getUser } from "@netlify/identity";
import { db } from "../../db/index.js";
import { retentionService } from "../../src/server/retention.js";
const service = retentionService(db);
const reply = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export default async function handler(req) {
  try {
    const user = await getUser();
    if (!user?.id) return reply({ error: "Sign in to continue." }, 401);
    const route = new URL(req.url).pathname.split("/").filter(Boolean).slice(2);
    let body;
    if (req.method === "POST") {
      const text = await req.text();
      if (text.length > 470000) return reply({ error: "That photo is too large." }, 413);
      try { body = JSON.parse(text); } catch { return reply({ error: "Invalid request." }, 400); }
      if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "Invalid request." }, 400);
    }
    if (route[0] === "vibe" && ["GET", "POST", "DELETE"].includes(req.method)) return reply(await (req.method === "DELETE" ? service.clearVibe(user) : service.vibe(user, body)));
    if (route[0] === "history" && req.method === "GET") return reply(await service.history(user));
    if (route[0] === "create" && req.method === "POST") return reply(await service.create(user, body), 201);
    if (route[0] === "traditions" && ["GET", "POST"].includes(req.method)) return reply(await service.tradition(user, route[1], body));
    if (route[0] === "reminder" && req.method === "POST") return reply(await service.reminder(user, route[1], body));
    return reply({ error: "Not found." }, 404);
  } catch (error) {
    if (error.status) return reply({ error: error.message }, error.status);
    if (error.message?.startsWith("Choose ") || error.message?.startsWith("Confirm ") || error.message === "Name your new exchange." || error instanceof RangeError) return reply({ error: error instanceof RangeError ? "Choose a valid date and time zone." : error.message }, 400);
    console.error("Retention request failed", error);
    return reply({ error: "Could not save that change. Please try again." }, 500);
  }
}
export const config = { path: ["/api/retention/vibe", "/api/retention/history", "/api/retention/create", "/api/retention/traditions/:id", "/api/retention/reminder/:id"] };
