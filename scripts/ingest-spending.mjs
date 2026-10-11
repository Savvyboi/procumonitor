import { Readable } from 'node:stream';
import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parse } from 'csv-parse';
import { jsonRequest, request } from './lib/http.mjs';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/data');
const catalogue='https://avoindata.suomi.fi/data/api/3/action/package_show?id=ba96a638-67bf-4747-b084-c78ccfe052e9';
const sourceUrl='https://avoindata.suomi.fi/data/fi/dataset/ba96a638-67bf-4747-b084-c78ccfe052e9';
let old;try{old=JSON.parse(await readFile(path.join(dir,'spending.json'),'utf8'));}catch{}
if(old?.fetchedAt && Date.now()-Date.parse(old.fetchedAt)<7*86400000 && !process.argv.includes('--force')) { console.log('Invoice snapshot less than seven days old.'); process.exit(0); }
const meta=await jsonRequest(catalogue);
if(!meta.success) throw new Error('Invoice catalogue unavailable.');
const resources=meta.result.resources.filter(r=>/th_data_\d{4}\.csv/i.test(r.url)).sort((a,b)=>Number(b.url.match(/th_data_(\d{4})/)[1])-Number(a.url.match(/th_data_(\d{4})/)[1]));
const resource=resources[0];if(!resource) throw new Error('No invoice resource in official catalogue.');
const year=Number(resource.url.match(/th_data_(\d{4})/)[1]);
if(!resource.url.startsWith('https://avoindata.suomi.fi/')) throw new Error('Unexpected official invoice host.');
console.log('Streaming official '+year+' invoice file.');
const response=await request(resource.url);
const buyers=new Map(),suppliers=new Map(),categories=new Map();
let rows=0,total=0,periodStart=null,periodEnd=null;
function add(map,key,name,amount,businessId=null) { const v=map.get(key)||{name,total:0,rows:0,...(businessId?{businessId}:{})};v.total+=amount;v.rows++;map.set(key,v); }
const parser=Readable.fromWeb(response.body).pipe(parse({columns:true,bom:true,delimiter:';',skip_empty_lines:true,relax_quotes:true}));
for await(const row of parser){
 const amount=Number(String(row.tiliointisumma).replace(',','.'));
 if(!Number.isFinite(amount)) throw new Error('Invalid invoice amount; previous snapshot preserved.');
 if(!row.hankintayksikko||!row.tositepvm) throw new Error('Invoice schema changed; previous snapshot preserved.');
 rows++;total+=amount;
 const date=row.tositepvm.slice(0,10); periodStart=!periodStart||date<periodStart?date:periodStart;periodEnd=!periodEnd||date>periodEnd?date:periodEnd;
 add(buyers,row.hankintayksikko_tunnus+'|'+row.hankintayksikko,row.hankintayksikko,amount);
 const id=/^\d{7}-\d$/.test(row.toimittaja_y_tunnus)?row.toimittaja_y_tunnus:null;
 add(suppliers,(id||'')+'|'+row.toimittaja_nimi,row.toimittaja_nimi||'Unpublished supplier',amount,id);
 add(categories,row.hankintakategoria,row.hankintakategoria||'Unclassified',amount);
}
const sorted=map=>[...map.values()].map(r=>({...r,total:Math.round(r.total*100)/100})).sort((a,b)=>b.total-a.total);
const snapshot={fetchedAt:new Date().toISOString(),year,periodStart,periodEnd,rows,total:Math.round(total*100)/100,buyers:sorted(buyers),suppliers:sorted(suppliers).slice(0,250),categories:sorted(categories),sourceUrl,resourceUrl:resource.url,status:'ok',coverage:'State budget entities and selected municipalities. Excludes confidential purchases and some authorities. Invoice accounting lines; credit notes are included. Supplier rankings show the top 250. Invoice data cannot be attributed to a tender without a shared contract identifier.'};
await writeFile(path.join(dir,'spending.json'),JSON.stringify(snapshot));
console.log('Aggregated '+rows+' invoice lines; raw records were not retained.');
