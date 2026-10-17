export const privateHeaders={"Cache-Control":"private, no-store","Vary":"Cookie, Authorization","X-Content-Type-Options":"nosniff"};
export function jsonResponse(body:unknown,status=200){return Response.json(body,{status,headers:privateHeaders});}
export function sameOrigin(request:Request,requireOrigin=true){const origin=request.headers.get("origin");if(!origin)return !requireOrigin;return origin===new URL(request.url).origin;}
export async function readJson(request:Request,maxBytes=500000):Promise<unknown>{
 if(request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json")throw new HttpError("Use application/json.",415);
 if(Number(request.headers.get("content-length")??0)>maxBytes)throw new HttpError("Request is too large.",413);
 const reader=request.body?.getReader();if(!reader)throw new HttpError("A JSON body is required.",400);
 const chunks:Uint8Array[]=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw new HttpError("Request is too large.",413);}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError("Invalid JSON.",400);}
}
export class HttpError extends Error{constructor(message:string,public status:number){super(message);}}
