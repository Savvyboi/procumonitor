import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { getFlags, numberOrNull } from './normalize.mjs';
const parser=new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false,attributeNamePrefix:'@_'});
const array=x=>x==null?[]:Array.isArray(x)?x:[x];
const text=x=>typeof x==='object'&&x!==null?String(x['#text']??''):String(x??'');
const amount=x=>({value:numberOrNull(text(x)),currency:x?.['@_currencyID']||null});
export function enrichFromXml(notice,encoded){
 const xml=Buffer.from(encoded,'base64').toString('utf8');
 if(xml.length>5000000||xml.includes('<!DOCTYPE')||XMLValidator.validate(xml)!==true)throw new Error('Invalid or unsafe eForms XML');
 const doc=Object.values(parser.parse(xml)).find(v=>v&&typeof v==='object'&&v.ProcurementProject);
 if(!doc)throw new Error('Unexpected eForms structure');
 const n={...notice,lots:notice.lots.map(l=>({...l}))};
 const total=amount(doc.ProcurementProject?.RequestedTenderTotal?.EstimatedOverallContractAmount);
 if(n.estimatedValue===null&&total.value!==null){n.estimatedValue=total.value;n.estimatedCurrency=total.currency;}
 const extensions=array(doc.UBLExtensions?.UBLExtension).map(e=>e.ExtensionContent?.EformsExtension).find(Boolean)||{};
 const result=extensions.NoticeResult||{};
 const awarded=amount(result.TotalAmount);
 if(n.awardedValue===null&&awarded.value!==null){n.awardedValue=awarded.value;n.awardedCurrency=awarded.currency;}
 for(const lot of array(doc.ProcurementProjectLot)){
  const id=text(lot.ID),existing=n.lots.find(l=>l.id===id);if(!existing)continue;
  const value=amount(lot.ProcurementProject?.RequestedTenderTotal?.EstimatedOverallContractAmount);
  if(existing.estimatedValue===null&&value.value!==null){existing.estimatedValue=value.value;existing.estimatedCurrency=value.currency;}
 }
 for(const lotResult of array(result.LotResult)){
  const id=text(lotResult.TenderLot?.ID),existing=n.lots.find(l=>l.id===id);if(!existing)continue;
  const submissions=array(lotResult.ReceivedSubmissionsStatistics).find(s=>text(s.StatisticsCode)==='tenders');
  if(existing.bids===null&&submissions)existing.bids=numberOrNull(text(submissions.StatisticsNumeric));
 }
 n.fullContentAvailable=true;n.contentCheckedAt=new Date().toISOString();n.flags=getFlags(n);
 return n;
}
