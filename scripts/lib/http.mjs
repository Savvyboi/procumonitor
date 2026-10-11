import { setTimeout as delay } from 'node:timers/promises';
export async function request(url, options={}) {
 for(let attempt=0;attempt<5;attempt++) {
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(60000)});
  if(response.ok) return response;
  if(![429,500,502,503,504].includes(response.status)) throw new Error('Official API returned HTTP '+response.status);
  if(attempt===4) throw new Error('Official API unavailable after 5 attempts: HTTP '+response.status);
  const retry=Number(response.headers.get('retry-after'));
  await delay(Number.isFinite(retry)&&retry>0?Math.min(retry,120)*1000:1000*2**attempt);
 }
}
export const jsonRequest=async (url, options)=> (await request(url,options)).json();
