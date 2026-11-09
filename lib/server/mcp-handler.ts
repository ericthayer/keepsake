import { AgentService } from "./agent-service";
import { resolveAgentOwner } from "./api-keys";
import { logServerError, privateHeaders } from "./http";
import type { LockerStore } from "./locker-store";
import { handleMcp } from "./mcp-protocol";

export async function handleRemoteMcp(request: Request, getStore: () => LockerStore) {
  if (!request.headers.get("authorization")) return unauthorized();
  try {
    const store = getStore(), ownerId = await resolveAgentOwner(store, request);
    if (!ownerId) return unauthorized();
    const service = new AgentService(store, undefined, undefined, new URL(request.url).origin, error => logServerError("mcp", request, error));
    return await handleMcp(request, (name, args) => service.call(ownerId, name, args));
  } catch (error) {
    const requestId = logServerError("mcp", request, error);
    return Response.json({ error: "The locker service is unavailable.", requestId }, { status: 503, headers: privateHeaders });
  }
}
function unauthorized() {
  return Response.json({ error: "Provide an active Keepsake agent key as Authorization: Bearer <key>." }, { status: 401, headers: { ...privateHeaders, "WWW-Authenticate": 'Bearer realm="Keepsake"' } });
}
