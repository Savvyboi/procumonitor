import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalize, markSuperseded } from './lib/normalize.mjs';
import { jsonRequest } from './lib/http.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'public/data');
const key=process.env.HILMA_API_KEY;
if(!key) throw new Error('HILMA_API_KEY must be provided as an environment variable or GitHub repository secret.');
const now=new Date(), days=Number(process.env.RETENTION_DAYS||180), pageSize=100;
if(!Number.isInteger(days)||days<1||days>730) throw new Error('RETENTION_DAYS must be 1–730.');
await mkdir(dir,{recursive:true});
let previous;
try{previous=JSON.parse(await readFile(path.join(dir,'notices.json'),'utf8'));}catch{previous=null;}
const cutoff=new Date(now.getTime()-days*86400000).toISOString();
// Overlap catches late publications and amendments. Search is bounded at start time for stable pagination.
const since=previous?.fetchedAt && !process.argv.includes('--full') ? new Date(Math.max(Date.parse(cutoff),Date.parse(previous.fetchedAt)-2*86400000)).toISOString():cutoff;
const notices=new Map((previous?.notices||[]).filter(n=>n.published>=cutoff).map(n=>[n.id,n]));
let fetched=0, count=0, skip=0;
while(true){
 const result=await jsonRequest('https://api.hankintailmoitukset.fi/avp/eformnotices/docs/search',{method:'POST',headers:{'Content-Type':'application/json','Ocp-Apim-Subscription-Key':key},body:JSON.stringify({search:'*',filter:"dateModified ge "+since+" and dateModified le "+now.toISOString(),orderby:'dateModified asc, id asc',top:pageSize,skip,count:true})});
 if(!Array.isArray(result.value)) throw new Error('Unexpected Hilma search response; previous snapshot preserved.');
 count=result['@odata.count']??count;
 for(const raw of result.value){const notice=normalize(raw,now); if(notice.published>=cutoff) { const old=notices.get(notice.id); notices.set(notice.id,old?.modified===notice.modified && old.fullContentAvailable ? {...old,status:notice.status,superseded:false,relatedIds:notice.relatedIds}:notice); }}
 fetched+=result.value.length;
 console.log('Read '+fetched+' / '+count+' changed notices');
 if(result.value.length<pageSize || fetched>=count) break;
 skip+=pageSize;
 if(skip>=100000) throw new Error('Azure Search pagination limit reached; snapshot preserved. Narrow RETENTION_DAYS.');
 await delay(120);
}
// Recompute time-dependent status when no new publication exists.
const refreshed=[...notices.values()].map(n=>({...n,status:n.status==='Active'&&n.deadline&&Date.parse(n.deadline)<=now.getTime()?'Closed':n.status}));
const snapshot={schemaVersion:1,fetchedAt:now.toISOString(),windowDays:days,coverageStart:cutoff,totalInSource:null,changedInSource:count,notices:markSuperseded(refreshed).sort((a,b)=>b.published.localeCompare(a.published)),source:'Hilma (hankintailmoitukset.fi)'};
await writeFile(path.join(dir,'notices.json'),JSON.stringify(snapshot));
console.log('Saved '+snapshot.notices.length+' official notices. No credentials or raw contact records written.');
// PRH enrichment is bounded, cached, and deliberately excludes municipal/regional buyers.
let companies={}; try{companies=JSON.parse(await readFile(path.join(dir,'companies.json'),'utf8'));}catch{}
const ids=[...new Set(snapshot.notices.filter(n=>['Public body','Public undertaking','Other buyer'].includes(n.buyerType)).map(n=>n.businessId).filter(id=>/^\d{7}-\d$/.test(id||'')))];
let lookedUp=0;
for(const id of ids){
 if(companies[id]&&Date.parse(companies[id].checkedAt)>now.getTime()-30*86400000) continue;
 if(lookedUp>=100) break;
 try{
 const result=await jsonRequest('https://avoindata.prh.fi/opendata-ytj-api/v3/companies?businessId='+encodeURIComponent(id));
 const c=result.companies?.[0], address=c?.addresses?.find(a=>a.type===1)||c?.addresses?.[0];
 companies[id]={businessId:id,found:!!c,name:c?.names?.find(n=>n.type==='1'&&!n.endDate)?.name||null,city:address?.postOffices?.find(p=>p.languageCode==='1')?.city||null,form:c?.companyForms?.find(f=>!f.endDate)?.descriptions?.find(d=>d.languageCode==='3')?.description||null,source:'PRH / YTJ open data (CC BY 4.0)',checkedAt:now.toISOString()};
 lookedUp++; await delay(650);
 }catch(e){console.warn('PRH enrichment unavailable; keeping Hilma buyer details.');break;}
}
await writeFile(path.join(dir,'companies.json'),JSON.stringify(companies));
