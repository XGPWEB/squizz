import { env } from 'cloudflare:workers';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){try{
 const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response('Introuvable',{status:404});
 if(!env.BUCKET)return new Response('Stockage indisponible',{status:503});
 const object=await env.BUCKET.get(id,{range:req.headers});if(!object)return new Response('Introuvable',{status:404});
 const headers=new Headers({'Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'});object.writeHttpMetadata(headers);headers.set('ETag',object.httpEtag);
 if(object.range&&'offset' in object.range&&'length' in object.range&&typeof object.range.offset==='number'&&typeof object.range.length==='number'){const {offset,length}=object.range;headers.set('Content-Range',`bytes ${offset}-${offset+length-1}/${object.size}`);headers.set('Content-Length',String(length));return new Response(object.body,{status:206,headers});}
 headers.set('Content-Length',String(object.size));return new Response(object.body,{headers});
 }catch(e){console.error(e);return new Response('Média indisponible',{status:503});}}
