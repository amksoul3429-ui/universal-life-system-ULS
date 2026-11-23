export type JournalMood = "Happy" | "Focused" | "Motivated" | "Grateful" | "Calm" | "Stressed" | "Sad" | "Neutral";
export type JournalCategory = "Personal" | "Studies" | "Business" | "Health" | "Growth" | "Gratitude" | "Ideas";
export type JournalEntry = {
  id:string; title:string; created:string; updatedAt:string; date:string; content:string;
  mood:JournalMood; category:JournalCategory; tags:string[]; favorite:boolean; prompt:string;
};
export type JournalFilters = {query?:string;mood?:string;category?:string;favoritesOnly?:boolean;from?:string;to?:string};
const moods:JournalMood[]=["Happy","Focused","Motivated","Grateful","Calm","Stressed","Sad","Neutral"];
const categories:JournalCategory[]=["Personal","Studies","Business","Health","Growth","Gratitude","Ideas"];
const validDate=(value:unknown)=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
export function normalizeJournalEntry(value:unknown):JournalEntry|null{
 if(!value||typeof value!=="object")return null;
 const x=value as Record<string,unknown>;
 if(typeof x.id!=="string"||!x.id||typeof x.title!=="string")return null;
 const created=typeof x.created==="string"?x.created:new Date().toISOString();
 const date=validDate(x.date)?x.date:(created.slice(0,10)||new Date().toISOString().slice(0,10));
 const mood=moods.includes(x.mood as JournalMood)?x.mood as JournalMood:"Neutral";
 const category=categories.includes(x.category as JournalCategory)?x.category as JournalCategory:"Personal";
 const tags=Array.isArray(x.tags)?[...new Set(x.tags.filter((t):t is string=>typeof t==="string").map(t=>t.trim().slice(0,30)).filter(Boolean))].slice(0,12):[];
 return {id,title:title.trim()||"Untitled entry",created,date,updatedAt:typeof x.updatedAt==="string"?x.updatedAt:created,content:typeof x.content==="string"?x.content:"",mood,category,tags,favorite:x.favorite===true,prompt:typeof x.prompt==="string"?x.prompt:""};
}
export function filterJournalEntries(entries:JournalEntry[],filters:JournalFilters={}):JournalEntry[]{
 const q=(filters.query||"").trim().toLocaleLowerCase();
 return entries.filter(e=>{
  if(q&&!([e.title,e.content,e.category,e.mood,...e.tags].join(" ").toLocaleLowerCase().includes(q)))return false;
  if(filters.mood&&filters.mood!=="All"&&e.mood!==filters.mood)return false;
  if(filters.category&&filters.category!=="All"&&e.category!==filters.category)return false;
  if(filters.favoritesOnly&&!e.favorite)return false;
  if(filters.from&&e.date<filters.from)return false;
  if(filters.to&&e.date>filters.to)return false;
  return true;
 }).sort((a,b)=>b.date.localeCompare(a.date)||b.created.localeCompare(a.created));
}
export function journalSummary(entries:JournalEntry[],today:string){
 const words=entries.reduce((n,e)=>n+(e.content.trim()?e.content.trim().split(/\s+/).length:0),0);
 const dates=[...new Set(entries.map(e=>e.date))].sort((a,b)=>b.localeCompare(a));
 let streak=0;
 if(dates.length){
  const latest=dates[0];
  const yesterday=new Date(today+"T12:00:00");yesterday.setDate(yesterday.getDate()-1);
  const yesterdayKey=yesterday.getFullYear()+"-"+String(yesterday.getMonth()+1).padStart(2,"0")+"-"+String(yesterday.getDate()).padStart(2,"0");
  if(latest===today||latest===yesterdayKey){
   let cursor=new Date(latest+"T12:00:00");
   for(const day of dates){const key=cursor.getFullYear()+"-"+String(cursor.getMonth()+1).padStart(2,"0")+"-"+String(cursor.getDate()).padStart(2,"0");if(day!==key)break;streak++;cursor.setDate(cursor.getDate()-1);}
  }
 }
 return {entries:entries.length,words,daysWritten:dates.length,currentStreak:streak,favorites:entries.filter(e=>e.favorite).length};
}
export function upsertJournalEntry(entries:JournalEntry[],entry:JournalEntry):JournalEntry[]{
 const normalized=normalizeJournalEntry(entry);if(!normalized) return entries;
 return [normalized,...entries.filter(e=>e.id!==normalized.id)].sort((a,b)=>b.date.localeCompare(a.date)||b.created.localeCompare(a.created));
}
export function toggleJournalFavorite(entries:JournalEntry[],id:string):JournalEntry[]{
 return entries.map(e=>e.id===id?{...e,favorite:!e.favorite,updatedAt:new Date().toISOString()}:e);
}
export function deleteJournalEntry(entries:JournalEntry[],id:string):JournalEntry[]{return entries.filter(e=>e.id!==id);}
