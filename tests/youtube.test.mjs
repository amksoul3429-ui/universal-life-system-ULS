import test from "node:test";
import assert from "node:assert/strict";
import { parseYouTubeDuration, rankYouTubeResults, searchYouTubeEducationalVideos } from "../.test-build/youtube.js";

test("parses YouTube ISO-8601 durations into rounded-up minutes",()=>{
  assert.equal(parseYouTubeDuration("PT1H2M3S"),63);
  assert.equal(parseYouTubeDuration("PT9M"),9);
  assert.equal(parseYouTubeDuration("PT30S"),1);
  assert.equal(parseYouTubeDuration("invalid"),0);
});

test("ranks lesson results using topic relevance and public quality signals",()=>{
  const ranked=rankYouTubeResults([
    {id:"a",title:"Rotational Motion Full JEE Advanced Lecture",description:"Complete physics lesson",channelTitle:"Physics",channelId:"c1",thumbnail:"",publishedAt:new Date().toISOString(),durationMinutes:90,views:500000,likes:25000,comments:2000,channelSubscribers:100000,url:"https://youtube.com/watch?v=a"},
    {id:"b",title:"Cooking recipe",description:"Dinner",channelTitle:"Food",channelId:"c2",thumbnail:"",publishedAt:"2020-01-01",durationMinutes:10,views:100,likes:1,comments:0,channelSubscribers:20,url:"https://youtube.com/watch?v=b"}
  ],"Rotational Motion JEE Advanced");
  assert.equal(ranked[0].id,"a");
  assert.ok(ranked[0].score>ranked[1].score);
  assert.ok(ranked[0].scoreReasons.length>=2);
});

test("requires a configured API key and a non-empty topic",async()=>{
  await assert.rejects(()=>searchYouTubeEducationalVideos("","Physics"),/API key/);
  await assert.rejects(()=>searchYouTubeEducationalVideos("key","  "),/topic/);
});
