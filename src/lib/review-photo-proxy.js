import 'server-only';
import {NextResponse} from 'next/server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[457][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers={'Cache-Control':'private, no-store',Pragma:'no-cache','X-Content-Type-Options':'nosniff'};
const error=(message,status)=>NextResponse.json({error:{message}},{status,headers});
export function photoBase(){const origin=(process.env.STOREFRONT_API_URL||'http://localhost:4000/api/storefront/v1').replace(/\/$/,'');return `${origin}/${encodeURIComponent(process.env.STOREFRONT_TENANT_CODE||'HORNBOOK_RETAIL')}/stores/${encodeURIComponent(process.env.STOREFRONT_STORE_CODE||'MAIN')}`;}
export async function boundedBody(request,limit){const reader=request.body?.getReader();const chunks=[];let bytes=0;if(reader){while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>limit){await reader.cancel();return null;}chunks.push(value);}}return Buffer.concat(chunks);}
export async function photoResponse(upstream,binary=false){
 if(binary&&upstream.ok){if(upstream.headers.get('content-type')?.split(';')[0]!=='image/webp')return error('Photo unavailable.',502);const body=await boundedBody(upstream,3*1024*1024);if(!body)return error('Photo unavailable.',502);return new NextResponse(body,{headers:{...headers,'Content-Type':'image/webp'}});}
 const payload=await upstream.json();return NextResponse.json(payload,{status:upstream.status,headers});
}
export async function customerPhotoProxy(request,path){
 const list=path.length===3&&path[2]==='photos';
 const item=path.length===4&&path[2]==='photos'&&uuid.test(path[3]);
 const file=path.length===5&&path[2]==='photos'&&uuid.test(path[3])&&path[4]==='file';
 const upload=item&&request.method==='POST',remove=item&&request.method==='DELETE';
 if(path[0]!=='reviews'||!uuid.test(path[1])||!((list||file)&&request.method==='GET'||upload||remove))return error('Not found.',404);
 const query=request.nextUrl.searchParams;
 if((!upload&&query.size)||(upload&&([...query.keys()].some(key=>key!=='alt')||query.getAll('alt').length>1||(query.get('alt')||'').length>190)))return error('Invalid photo fields.',422);
 const token=request.cookies.get('commerce_customer')?.value;if(!/^[a-f0-9]{64}$/.test(token||''))return error('Sign in to manage review photos.',401);
 const mime=request.headers.get('content-type')?.split(';')[0];
 if((upload||remove)&&request.headers.get('origin')!==request.nextUrl.origin)return error('Reload the page and try again.',403);
 if(upload&&!['image/jpeg','image/png','image/webp'].includes(mime))return error('Choose a JPEG, PNG or WebP photo.',415);
 if(remove&&mime!=='application/json')return error('Invalid request.',415);
 try{
  const body=upload||remove?await boundedBody(request,upload?5*1024*1024:1024):undefined;
  if(body===null)return error('The photo must be 5 MB or smaller.',413);
  if(remove){let parsed;try{parsed=JSON.parse(body.toString('utf8'));}catch{return error('Invalid request.',400);}if(!Number.isInteger(parsed.version)||parsed.version<1||Object.keys(parsed).length!==1)return error('Invalid photo version.',422);}
  const upstream=await fetch(`${photoBase()}/account/${path.map(encodeURIComponent).join('/')}${upload?`?${query.toString()}`:''}`,{method:request.method,headers:{Authorization:`Bearer ${token}`,Accept:file?'image/webp':'application/json',...(body?{'Content-Type':mime}:{})},body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000)});
  const response=await photoResponse(upstream,file);
  if(upstream.status===401)response.cookies.set('commerce_customer','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api/customer',maxAge:0});
  return response;
 }catch{return error('Photo services are temporarily unavailable. Refresh the photo list before retrying.',503);}
}
export async function publicPhotoProxy(request,photoId){
 if(!uuid.test(photoId)||request.nextUrl.search)return error('Not found.',404);
 try{return await photoResponse(await fetch(`${photoBase()}/review-photos/${photoId}`,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(30000),headers:{Accept:'image/webp'}}),true);}catch{return error('Photo services are temporarily unavailable.',503);}
}
