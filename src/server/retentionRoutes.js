import { db } from "../../db/index.js";
import { retentionService } from "./retention.js";
const service = retentionService(db);
const reply = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function handleRetention(req, user, body) {
  try {
    if (!user?.id) return reply({ error: "Sign in to continue." }, 401);
    const route = new URL(req.url).pathname.split("/").filter(Boolean).slice(2);
    if (req.method === "POST" && (!body || typeof body !== "object" || Array.isArray(body))) return reply({ error: "Invalid request." }, 400);
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
