import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { toCSV } from './lib/normalize.mjs';
const data=JSON.parse(await readFile('public/data/notices.json','utf8'));
await mkdir('dist/exports',{recursive:true});await mkdir('dist/feeds/regions',{recursive:true});await mkdir('dist/feeds/buyers',{recursive:true});await mkdir('dist/data/months',{recursive:true});await mkdir('dist/data/days',{recursive:true});await mkdir('dist/notices',{recursive:true});
const xml=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&apos;");
const slug=v=>v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const site=process.env.SITE_URL?.replace(/\/?$/,'/')||'';
await writeFile('dist/exports/notices.csv',toCSV(data.notices));await writeFile('dist/exports/notices.json',JSON.stringify(data));await writeFile('dist/data/notices.json.gz',gzipSync(JSON.stringify(data)));
const manifest={generatedAt:data.fetchedAt,monthly:[],daily:[],feeds:[]};
for(const [kind,length] of [['months',7],['days',10]]) {
 const groups=Object.groupBy(data.notices,n=>n.published.slice(0,length));
 for(const [date,notices] of Object.entries(groups)){
  const file='data/'+kind+'/'+date+'.json';await writeFile('dist/'+file,JSON.stringify(notices));await writeFile('dist/'+file+'.gz',gzipSync(JSON.stringify(notices)));
  manifest[kind==='months'?'monthly':'daily'].push({date,file,count:notices.length});
 }
}
async function feed(title,notices,file){
 const content='<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>'+xml(title)+'</title><link>'+xml(site||'https://www.hankintailmoitukset.fi')+'</link><description>Official Hilma notice summaries collected by Avoin. Rolling '+data.windowDays+' day window.</description><language>fi</language>'+notices.slice(0,100).map(n=>'<item><title>'+xml(n.title)+'</title><link>'+xml(n.sourceUrl)+'</link><guid isPermaLink="false">'+xml(n.id)+'</guid><pubDate>'+new Date(n.published).toUTCString()+'</pubDate><description>'+xml(n.buyer+' · '+n.region+' · '+n.status)+'</description></item>').join('')+'</channel></rss>';
 await writeFile('dist/'+file,content);manifest.feeds.push({title,file,count:notices.length});
}
await feed('Avoin — all Finnish procurement notices',data.notices,'feeds/all.xml');
for(const region of [...new Set(data.notices.flatMap(n=>n.regions))]) await feed(region,data.notices.filter(n=>n.regions.includes(region)),'feeds/regions/'+slug(region)+'.xml');
for(const type of [...new Set(data.notices.map(n=>n.buyerType))]) await feed(type,data.notices.filter(n=>n.buyerType===type),'feeds/buyers/'+slug(type)+'.xml');
for(const n of data.notices){
 const value=n.estimatedValue===null?'Not reported':n.estimatedValue+' '+(n.estimatedCurrency||'unknown currency');
 const html='<!doctype html><html lang="fi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>'+xml(n.title)+' | Avoin</title><style>body{margin:0;background:#f7f9f2;color:#38512e;font:14px/1.9 system-ui,sans-serif}main{max-width:800px;margin:40px auto;padding:35px;background:#fff;border:1px solid #e0e8d6;border-radius:10px}h1{font-size:30px;line-height:1.4;letter-spacing:-1px;font-weight:500}p{white-space:pre-line;color:#849775}a{color:#416736;text-decoration:none;border-bottom:1px solid #bdcfae}a:hover{color:#243d1c}@media(max-width:600px){main{margin:15px;padding:23px}h1{font-size:25px}}</style><main data-pagefind-body><a href="../" data-pagefind-ignore>Avoin · Back to the explorer</a><h1>'+xml(n.title)+'</h1><p>'+xml(n.buyer)+' · '+xml(n.region)+' · '+xml(n.category)+'</p><p>'+xml(n.description)+'</p><p>Estimated value: '+xml(value)+'</p><a href="../?notice='+encodeURIComponent(n.id)+'">Open in explorer</a><p><a href="'+xml(n.sourceUrl)+'">Official Hilma notice</a></p></main></html>';
 await writeFile('dist/notices/'+encodeURIComponent(n.id)+'.html',html);
}
await writeFile('dist/data/manifest.json',JSON.stringify(manifest));
await writeFile('dist/.nojekyll','');
console.log('Built exports, compressed daily/monthly data, RSS feeds and searchable notice pages.');

const searchHtml='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Full-text search — Avoin</title><link href="./pagefind/pagefind-ui.css" rel="stylesheet"><style>:root{--pagefind-ui-primary:#28553e;--pagefind-ui-text:#4e6640;--pagefind-ui-background:#fff;--pagefind-ui-border:#dce6cf;--pagefind-ui-tag:#edf3e3;--pagefind-ui-font:system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;background:#f7f9f1;color:#35512b;font-family:system-ui,sans-serif}header{border-bottom:1px solid #e0e8d6;padding:24px 8%;display:flex;align-items:center;justify-content:space-between}a{color:#567746;text-decoration:none;font-size:13px}b{font-size:29px;letter-spacing:-1.5px}main{max-width:1000px;padding:45px 25px;margin:auto}small{letter-spacing:2px;font-size:10px;color:#90a17d}h1{font-size:42px;font-weight:500;letter-spacing:-1.5px;line-height:1.2}p{color:#93a17f;line-height:1.8;font-size:13px;margin-bottom:30px}.pagefind-ui__result-link{font-weight:500!important}.pagefind-ui__result-excerpt{color:#94a37f!important}@media(max-width:600px){h1{font-size:32px}header{padding:20px}main{padding-top:30px}}</style></head><body><header><a href="./"><b>avoin.</b></a><a href="./">← Back to the explorer</a></header><main data-pagefind-ignore><small>EVERY NOTICE. EVERY WORD.</small><h1>Follow your curiosity.</h1><p>Search the full descriptions of all imported notices. Results open the indexed source summary, with a link back to the explorer and the official Hilma notice.</p><div id="search"></div><noscript>JavaScript is required for full-text search. <a href="./exports/notices.csv">Download CSV</a></noscript></main><script src="./pagefind/pagefind-ui.js"></script><script>new PagefindUI({element:"#search",showSubResults:false,showImages:false,resetStyles:true});</script></body></html>';
await writeFile('dist/search.html',searchHtml);
