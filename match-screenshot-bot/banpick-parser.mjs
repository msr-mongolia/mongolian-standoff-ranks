// Draft ban/pick and schedule extraction for MSL Discord channels.
// Only explicit agreed details are considered confirmed. No automatic publishing.
export function extractMatchPlan(text) {
 const raw=String(text||'').normalize('NFKC');
 const maps=[...raw.matchAll(/(?:map\s*[123]?|газрын\s*зураг|мэп)\s*[:：-]\s*([\p{L}\p{N}_ -]{3,35})/giu)].map(m=>m[1].trim());
 const time=raw.match(/(?:at|цагт|эхлэх|start|time)\s*[:：-]?\s*([01]?\d|2[0-3]):([0-5]\d)/i)||raw.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
 const date=raw.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
 const pick=raw.match(/\b(?:pick|picked|сонгосон)\s*[:：-]?\s*([\p{L}\p{N}_ -]{3,35})/iu);
 const ban=raw.match(/\b(?:ban|banned|хассан)\s*[:：-]?\s*([\p{L}\p{N}_ -]{3,35})/iu);
 return {maps:[...new Set(maps)].slice(0,3),time:time?time[1].padStart(2,'0')+':'+time[2]:null,date:date?date[1]+'-'+date[2].padStart(2,'0')+'-'+date[3].padStart(2,'0'):null,pick:pick?.[1]?.trim()||null,ban:ban?.[1]?.trim()||null,needsReview:true};
}
