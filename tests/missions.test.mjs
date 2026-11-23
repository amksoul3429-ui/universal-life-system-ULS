import test from "node:test";
import assert from "node:assert/strict";
import {normalizeMission,transitionMission,assignMissionToPlanner,missionReward} from "../.test-build/missions.js";
const m={id:"m1",title:"Revise calculus",created:"2026-11-23",difficulty:"Hard",xp:100,deadline:"2026-11-25",category:"Studies"};
test("mission lifecycle only permits Available to Active to Completed",()=>{
 const active=transitionMission([m],"m1","Active");assert.equal(active.ok,true);assert.equal(active.missions[0].status,"Active");
 const complete=transitionMission(active.missions,"m1","Completed","2026-11-23T12:00:00Z");assert.equal(complete.ok,true);assert.equal(complete.missions[0].done,true);assert.equal(complete.missions[0].completedAt,"2026-11-23T12:00:00Z");
 const reopen=transitionMission(complete.missions,"m1","Active");assert.equal(reopen.ok,false);
});
test("legacy done records normalize to Completed and old records default to Available",()=>{
 assert.equal(normalizeMission({...m,done:true}).status,"Completed");assert.equal(normalizeMission(m).status,"Available");
});
test("planner assignment copies mission details and blocks duplicate links",()=>{
 const assigned=assignMissionToPlanner([m],[],"m1","2026-11-23","t1");assert.equal(assigned.ok,true);assert.equal(assigned.tasks[0].missionId,"m1");assert.equal(assigned.tasks[0].date,m.deadline);
 const duplicate=assignMissionToPlanner([m],assigned.tasks,"m1","2026-11-23","t2");assert.equal(duplicate.ok,false);assert.equal(duplicate.tasks.length,1);
});
test("mission reward calculation is deterministic and non-negative",()=>{
 assert.deepEqual(missionReward(m),{xp:100,credits:10});assert.deepEqual(missionReward({...m,xp:-5}),{xp:0,credits:1});
});
