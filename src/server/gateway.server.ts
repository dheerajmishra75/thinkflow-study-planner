// Preserve the existing Gemini streaming/structured-output contract.
export const AI_MODEL = 'google/gemini-3.8-flash';
export class GatewayError extends Error { constructor(public status:number,message:string){super(message);} }
export async function gatewayJSON<T>(system:string,user:string,schemaName:string,schema:object):Promise<T>{
 const key=process.env['LOVABLE_API_KEY'];if(!key)throw new GatewayError(401,'AI is not configured.');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {data:blocked,error:readError}=await supabaseAdmin.from('ai_access_state').select('status,message').eq('id','provider').maybeSingle();
 if(readError)throw new GatewayError(503,'AI access could not be checked.');
 if(blocked)throw new GatewayError(blocked.status,blocked.message);
 const res=await fetch('https://ai.gateway.lovable.dev/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Lovable-API-Key':key,Authorization:`Bearer ${key}`,'X-Lovable-AIG-SDK':'fetch'},body:JSON.stringify({model:AI_MODEL,stream:true,messages:[{role:'system',content:system},{role:'user',content:user}],response_format:{type:'json_schema',json_schema:{name:schemaName,strict:true,schema}}})});
 if(!res.ok||!res.body){let msg=`AI request failed (${res.status}).`,type='';try{const j=await res.json();msg=j?.error?.message??j?.message??msg;type=j?.error?.type??j?.type??'';}catch{}if(res.status===403&&!['provider_not_available_in_region','model_requires_retention_consent','model_vendor_not_enabled','credit_limit_reached','ai_disabled'].includes(type)){await supabaseAdmin.from('ai_access_state').upsert({id:'provider',status:403,message:msg,updated_at:new Date().toISOString()});}throw new GatewayError(res.status,msg);}
 const reader=res.body.getReader(),dec=new TextDecoder();let buf='',text='',refused=false;
 const processLine=(line:string)=>{const l=line.trim();if(!l.startsWith('data:'))return;const data=l.slice(5).trim();if(data==='[DONE]')return;let chunk;try{chunk=JSON.parse(data);}catch{return;}if(chunk.error)throw new GatewayError(chunk.error.status??502,chunk.error.message??'AI request failed.');const choice=chunk.choices?.[0];if(choice?.delta?.refusal||choice?.finish_reason==='content_filter')refused=true;text+=choice?.delta?.content??'';};
 try{for(;;){const {done,value}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});const lines=buf.split('\n');buf=lines.pop()??'';for(const line of lines)processLine(line);}buf+=dec.decode();if(buf.trim())processLine(buf);}finally{reader.releaseLock();}
 if(refused)throw new GatewayError(403,'The AI provider declined this request.');if(!text.trim())throw new GatewayError(502,'The AI returned an empty answer.');try{return JSON.parse(text) as T;}catch{throw new GatewayError(502,'The AI answer could not be read.');}
}
