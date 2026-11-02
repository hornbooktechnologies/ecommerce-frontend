export async function questionRequest(path,body,signal){
 const response=await fetch(`/api/customer/questions/${path}`,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});
 const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error?.message||'Unable to update product questions.'),{status:response.status,details:result.error?.details||[]});return result.data;
}
export function questionTime(value){const time=new Date(value);return Number.isFinite(time.getTime())?new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeZone:'Asia/Kolkata'}).format(time):'Date unavailable';}
