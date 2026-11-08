import { getUser } from "@netlify/identity";
import type { Config } from "@netlify/functions";
import { getLockerStore } from "../../db/index";
import { handleApi } from "../../lib/server/api-handler";

export default async function api(request: Request) { return handleApi(request, await getUser(), getLockerStore); }
export const config: Config = {
  path: ["/api/session", "/api/locker", "/api/lockers", "/api/locker-sharing", "/api/locker-invites/accept", "/api/agent", "/api/agent-keys"],
  rateLimit: { windowSize: 60, windowLimit: 120, aggregateBy: ["ip", "domain"] },
};
