import { getChatGPTUser } from "../../chatgpt-auth";
import { lockerSchema } from "../../../lib/locker";
import { getLockerStore, jsonResponse, readJson, sameOrigin, HttpError } from "../../../lib/server/http";
import { LockerError } from "../../../lib/server/locker-store";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET() {
 const user=await getChatGPTUser();if(!user)return jsonResponse({error:"Sign in to access your locker."},401);
 try{return jsonResponse(await getLockerStore().read(user.userId));}catch{return jsonResponse({error:"Your locker could not be loaded. Please try again."},503);}
}
export async function PUT(request:Request) {
 const user=await getChatGPTUser();if(!user)return jsonResponse({error:"Sign in to save your locker."},401);
 if(!sameOrigin(request))return jsonResponse({error:"Request origin is not allowed."},403);
 try{
  const parsed=z.object({locker:lockerSchema,version:z.number().int().min(0)}).strict().safeParse(await readJson(request));
  if(!parsed.success)return jsonResponse({error:parsed.error.issues[0]?.message??"Check the record details."},400);
  return jsonResponse({version:await getLockerStore().save(user.userId,parsed.data.locker,parsed.data.version)});
 }catch(error){if(error instanceof HttpError||error instanceof LockerError)return jsonResponse({error:error.message},error.status);return jsonResponse({error:"Could not save. Your changes have not been stored; please try again."},503);}
}
