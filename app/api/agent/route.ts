import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { toolFailure } from "../../../lib/agent-contract";
import { getAgentService, sameOrigin, jsonResponse, readJson, HttpError } from "../../../lib/server/http";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return jsonResponse(toolFailure("Sign in to use your locker.","UNAUTHENTICATED"),401);
 if(!sameOrigin(request))return jsonResponse(toolFailure("Request origin is not allowed.","FORBIDDEN"),403);
 try{const input=z.object({name:z.string().min(1).max(128),arguments:z.unknown()}).strict().parse(await readJson(request,64000));return jsonResponse(await getAgentService(new URL(request.url).origin).call(user.userId,input.name,input.arguments??{}));}
 catch(error){if(error instanceof HttpError)return jsonResponse(toolFailure(error.message,"INVALID_REQUEST"),error.status);if(error instanceof z.ZodError)return jsonResponse(toolFailure("Invalid tool call.","INVALID_INPUT"),400);return jsonResponse(toolFailure("Agent service unavailable.","SERVICE_UNAVAILABLE"),503);}
}
