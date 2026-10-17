import type { Config } from "@netlify/functions";
import { getLockerStore } from "../../db/index";
import { handleRemoteMcp } from "../../lib/server/mcp-handler";

export default async function mcp(request: Request) { return handleRemoteMcp(request, getLockerStore); }
export const config: Config = {
  path: "/mcp",
  rateLimit: { windowSize: 60, windowLimit: 100, aggregateBy: ["ip", "domain"] },
};
