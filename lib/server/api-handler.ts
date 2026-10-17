import { z } from "zod";
import { lockerSchema } from "../locker";
import { AgentService } from "./agent-service";
import { createAgentKey, listAgentKeys, revokeAgentKey } from "./api-keys";
import { LockerError, type LockerStore } from "./locker-store";
import { HttpError, jsonResponse, readJson, sameOrigin } from "./http";

export type Owner = { id: string; name?: string; email?: string };
export async function handleApi(request: Request, user: Owner | null, getStore: () => LockerStore): Promise<Response> {
  if (!user) return jsonResponse({ error: "Sign in to access your locker." }, 401);
  const path = new URL(request.url).pathname;
  if (path === "/api/session" && request.method === "GET") return jsonResponse({ user: { id: user.id, name: user.name ?? "", email: user.email ?? "" } });
  if (!["GET", "PUT", "POST", "DELETE"].includes(request.method)) return jsonResponse({ error: "Method not allowed." }, 405);
  if (request.method !== "GET" && !sameOrigin(request)) return jsonResponse({ error: "Request origin is not allowed." }, 403);
  try {
    const store = getStore();
    if (path === "/api/locker" && request.method === "GET") return jsonResponse(await store.read(user.id));
    if (path === "/api/locker" && request.method === "PUT") {
      const data = z.object({ locker: lockerSchema, version: z.number().int().min(0) }).strict().parse(await readJson(request));
      return jsonResponse({ version: await store.save(user.id, data.locker, data.version) });
    }
    if (path === "/api/agent" && request.method === "POST") {
      const input = z.object({ name: z.string().min(1).max(128), arguments: z.unknown() }).strict().parse(await readJson(request, 64000));
      return jsonResponse(await new AgentService(store, undefined, undefined, new URL(request.url).origin).call(user.id, input.name, input.arguments ?? {}));
    }
    if (path === "/api/agent-keys") {
      if (request.method === "GET") return jsonResponse({ keys: await listAgentKeys(store, user.id) });
      if (request.method === "POST") {
        const input = z.object({ name: z.string().trim().min(1).max(80) }).strict().parse(await readJson(request, 2000));
        return jsonResponse(await createAgentKey(store, user.id, input.name), 201);
      }
      if (request.method === "DELETE") {
        const input = z.object({ id: z.string().uuid() }).strict().parse(await readJson(request, 2000));
        await revokeAgentKey(store, user.id, input.id);
        return jsonResponse({ revoked: true });
      }
    }
    return jsonResponse({ error: "Method not allowed." }, 405);
  } catch (error) {
    if (error instanceof z.ZodError) return jsonResponse({ error: error.issues[0]?.message ?? "Invalid input." }, 400);
    if (error instanceof HttpError || error instanceof LockerError) return jsonResponse({ error: error.message, code: error instanceof LockerError ? error.code : "INVALID_REQUEST" }, error.status);
    return jsonResponse({ error: "Your locker is temporarily unavailable. Please try again." }, 503);
  }
}
