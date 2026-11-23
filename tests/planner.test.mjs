import test from "node:test";
import assert from "node:assert/strict";
import {normalizePlannerTask,sortPlannerTasks,getDaySummary,getOverdueTasks,getScheduleConflicts,syncMissionTask,removeMissionTasks} from "../.test-build/planner.js";
const task=(id,extra={})=>({id,title:id,created:"2026-11-23",date:"2026-11-23",...extra});
test("legacy planner tasks normalize without losing identity or completion",()=>{
 const old=task("old",{done:true,category:"Studies"});
 const n=normalizePlannerTask(old);
 assert.equal(n.id,"old");assert.equal(n.done,true);assert.equal(n.startTime,"");assert.equal(n.durationMinutes,30);assert.equal(n.category,"Studies");
});
test("normalization validates date, time, priority and duration",()=>{
 const n=normalizePlannerTask(task("bad",{date:"tomorrow",startTime:"25:90",priority:"urgent",durationMinutes:9999}));
 assert.equal(n.date,"");assert.equal(n.startTime,"");assert.equal(n.priority,"Medium");assert.equal(n.durationMinutes,1440);
});
test("planner sorting supports time, priority, title and duration",()=>{
 const tasks=[task("later",{startTime:"12:00"}),task("none"),task("early",{startTime:"08:30"}),task("critical",{startTime:"08:30",priority:"Critical"}),task("long",{durationMinutes:120})];
 assert.deepEqual(sortPlannerTasks(tasks).map(x=>x.id),["critical","early","later","long","none"]);
 assert.deepEqual(sortPlannerTasks(tasks,"priority").map(x=>x.id),["critical","long","early","later","none"]);
 assert.deepEqual(sortPlannerTasks(tasks,"title").map(x=>x.id),["critical","early","later","long","none"]);
 assert.equal(sortPlannerTasks(tasks,"duration")[0].id,"long");
});
test("daily summary counts completion, schedule coverage and planned duration",()=>{
 const summary=getDaySummary([task("a",{startTime:"09:00",durationMinutes:60,done:true}),task("b",{durationMinutes:30}),task("c",{date:"2026-11-24"})],"2026-11-23");
 assert.deepEqual(summary,{total:2,completed:1,remaining:1,scheduled:1,plannedMinutes:60,percent:50});
});
test("overdue tasks include only unfinished tasks before today",()=>{
 const overdue=getOverdueTasks([task("old",{date:"2026-11-20"}),task("done",{date:"2026-11-20",done:true}),task("today"),task("future",{date:"2026-11-25"}),task("undated",{date:""})],"2026-11-23");
 assert.deepEqual(overdue.map(t=>t.id),["old"]);
});
test("schedule overlap detection reports overlapping unfinished timed tasks",()=>{
 const conflicts=getScheduleConflicts([task("a",{startTime:"09:00",durationMinutes:60}),task("b",{startTime:"09:45",durationMinutes:30}),task("c",{startTime:"10:30",durationMinutes:30}),task("done",{startTime:"09:15",durationMinutes:90,done:true}),task("free")]);
 assert.equal(conflicts.length,1);assert.equal(conflicts[0].first.id,"a");assert.equal(conflicts[0].second.id,"b");
});
test("mission edits synchronize linked task details without changing its schedule time",()=>{
 const existing=task("linked",{missionId:"m1",startTime:"10:15",durationMinutes:45});
 const result=syncMissionTask([existing],{id:"m1",title:"New title",category:"Studies",priority:"High",deadline:"2026-11-25"});
 assert.equal(result[0].title,"New title");assert.equal(result[0].date,"2026-11-25");assert.equal(result[0].startTime,"10:15");
});
test("mission deletion removes only linked planner tasks",()=>{
 const result=removeMissionTasks([task("a",{missionId:"m1"}),task("b",{missionId:"m2"}),task("c")],"m1");
 assert.deepEqual(result.map(x=>x.id),["b","c"]);
});