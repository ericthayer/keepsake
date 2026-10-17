import { getChatGPTUser } from "../chatgpt-auth";
import { toolFailure } from "../../lib/agent-contract";
import { handleMcp } from "../../lib/server/mcp-protocol";
import { getAgentService, sameOrigin, privateHeaders } from "../../lib/server/http";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 return handleMcp(request,async(name,args)=>{
  const user=await getChatGPTUser();
  if(!user)return toolFailure("A signed-in user identity is required. Connect the Keepsake plugin using the site's authentication flow; service bypass credentials alone cannot read a locker.","UNAUTHENTICATED");
  return getAgentService(new URL(request.url).origin).call(user.userId,name,args);
 });
}
export function GET(){return new Response(null,{status:405,headers:{...privateHeaders,Allow:"POST, OPTIONS"}});}
export function OPTIONS(request:Request){return new Response(null,{status:sameOrigin(request,false)?204:403,headers:{...privateHeaders,Allow:"POST, OPTIONS"}});}
