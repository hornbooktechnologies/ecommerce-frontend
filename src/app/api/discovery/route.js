import {NextResponse} from 'next/server';
const headers={'Cache-Control':'no-store',Pragma:'no-cache'};
const error=(message,status)=>NextResponse.json({error:{message}},{status,headers});
export async function POST(request){
 if(request.nextUrl.search||request.headers.get('origin')!==request.nextUrl.origin||request.headers.get('content-type')?.split(';')[0]!=='application/json')return error('This request could not be verified.',403);
 try{const reader=request.body?.getReader();let bytes=0;const chunks=[];if(reader)while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>4096){await reader.cancel();return error('Too many products selected.',413);}chunks.push(value);}const body=Buffer.concat(chunks).toString('utf8');try{JSON.parse(body);}catch{return error('Invalid request.',400);}
 const origin=(process.env.STOREFRONT_API_URL||'http://localhost:4000/api/storefront/v1').replace(/\/$/,'');const tenant=encodeURIComponent(process.env.STOREFRONT_TENANT_CODE||'HORNBOOK_RETAIL'),store=encodeURIComponent(process.env.STOREFRONT_STORE_CODE||'MAIN');const upstream=await fetch(`${origin}/${tenant}/stores/${store}/discovery`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});return NextResponse.json(await upstream.json(),{status:upstream.status,headers});
 }catch{return error('Discovery is temporarily unavailable. Please try again.',503);}
}
