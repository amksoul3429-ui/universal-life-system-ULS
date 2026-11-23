export type MissionStatus = "Available" | "Active" | "Completed";
export type Mission = { id:string; title:string; created:string; description?:string; category?:string; difficulty?:string; status?:MissionStatus; done?:boolean; xp?:number; deadline?:string; priority?:string; completedAt?:string; [key:string]:unknown };
export type PlannerTask = { id:string; title:string; created:string; date:string; category:string; priority:string; done:boolean; missionId:string };
export const XP_BY_DIFFICULTY:Record<string,number>={Easy:25,Medium:50,Hard:100,Elite:200};
export function normalizeMission<T extends Mission>(mission:T):T {
 const status:MissionStatus=mission.status==="Completed"||mission.done?"Completed":mission.status==="Active"?"Active":"Available";
 return {...mission,status,done:status==="Completed",xp:Math.max(0,Math.floor(Number(mission.xp??XP_BY_DIFFICULTY[mission.difficulty||"Medium"]??50)||0))};
}
export function transitionMission<T extends Mission>(missions:T[],id:string,next:MissionStatus,completedAt=new Date().toISOString()) {
 const mission=missions.find(item=>item.id===id);
 if(!mission)return {ok:false as const,missions,reason:"Mission not found"};
 const current=normalizeMission(mission).status;
 const allowed=(current==="Available"&&next==="Active")||(current==="Active"&&next==="Available")||(current==="Active"&&next==="Completed");
 if(!allowed)return {ok:false as const,missions,reason:current==="Completed"?"Completed missions cannot be reopened here":"Invalid mission status transition"};
 const updated=missions.map(item=>item.id===id?({...normalizeMission(item),status:next,done:next==="Completed",...(next==="Completed"?{completedAt}:{})} as T):item);
 return {ok:true as const,missions:updated,reason:next==="Completed"?"Mission completed":next==="Active"?"Mission activated":"Mission returned to available"};
}
export function assignMissionToPlanner(missions:Mission[],tasks:PlannerTask[],missionId:string,today:string,newId:string) {
 const mission=missions.find(item=>item.id===missionId);
 if(!mission)return {ok:false as const,tasks,reason:"Mission not found"};
 if(normalizeMission(mission).status==="Completed")return {ok:false as const,tasks,reason:"Completed missions cannot be added to the planner"};
 if(tasks.some(task=>task.missionId===missionId))return {ok:false as const,tasks,reason:"This mission is already in your planner"};
 const task:PlannerTask={id:newId,title:mission.title,created:new Date().toISOString(),date:mission.deadline||today,category:mission.category||"Personal",priority:mission.priority||"Medium",done:false,missionId};
 return {ok:true as const,tasks:[task,...tasks],reason:"Mission added to planner"};
}
export function missionReward(mission:Mission) {
 const xp=Math.max(0,Math.floor(Number(mission.xp)||0));
 return {xp,credits:Math.max(1,Math.floor(xp/10))};
}
