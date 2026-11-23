import test from "node:test";
import assert from "node:assert/strict";
import { normalizeVideo, parseVideoUrl, videoChapterTimestamp, videoEmbedUrl, videoSummary, updateVideoStatus } from "../.test-build/video.js";
const base={id:"v1",title:"Algebra lecture",created:"2026-11-23",url:"https://www.youtube.com/watch?v=dQw4w9WgXcQ",subject:"Mathematics",level:"Beginner",durationMinutes:42,status:"Saved",resources:[],chapters:[]};

test("accepts canonical YouTube and short links and builds privacy-enhanced embeds",()=>{
  const a=parseVideoUrl(base.url), b=parseVideoUrl("https://youtu.be/dQw4w9WgXcQ?t=90");
  assert.equal(a?.provider,"YouTube");
  assert.equal(a?.embedUrl,"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(b?.embedUrl,"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90");
});
test("accepts Vimeo links and creates an official player embed",()=>{
  const result=parseVideoUrl("https://vimeo.com/123456789");
  assert.equal(result?.provider,"Vimeo");
  assert.equal(result?.embedUrl,"https://player.vimeo.com/video/123456789");
});
test("rejects insecure, unsupported and malformed video URLs",()=>{
  assert.equal(parseVideoUrl("http://youtube.com/watch?v=dQw4w9WgXcQ"),null);
  assert.equal(parseVideoUrl("https://example.com/video"),null);
  assert.equal(parseVideoUrl("https://youtube.com/watch?v=bad"),null);
});
test("normalizes video metadata, resource links and chapters while rejecting invalid records",()=>{
  const video=normalizeVideo({...base,transcript:"Key explanation",resources:[{id:"r1",label:"Notes",url:"https://example.org/notes"},{id:"r2",label:"Bad",url:"javascript:alert(1)"}],chapters:[{id:"c1",title:"Introduction",seconds:65}]});
  assert.ok(video);
  assert.equal(video.provider,"YouTube");
  assert.equal(video.resources.length,1);
  assert.equal(video.chapters[0].seconds,65);
  assert.equal(video.transcript,"Key explanation");
  assert.equal(normalizeVideo({...base,url:"https://not-youtube.example"}),null);
  assert.equal(normalizeVideo({...base,title:""}),null);
});
test("status transitions retain watched timestamp and summaries aggregate correctly",()=>{
  const video=normalizeVideo(base);
  assert.ok(video);
  const inProgress=updateVideoStatus([video],"v1","In Progress");
  assert.equal(inProgress[0].status,"In Progress");
  const watched=updateVideoStatus(inProgress,"v1","Watched");
  assert.equal(watched[0].status,"Watched");
  assert.ok(watched[0].watchedAt);
  assert.deepEqual(videoSummary(watched),{total:1,watched:1,inProgress:0,minutes:42});
  assert.equal(updateVideoStatus(watched,"v1","Watched")[0].watchedAt,watched[0].watchedAt);
});
test("chapter timestamp formatting handles minute and hour boundaries",()=>{
  assert.equal(videoChapterTimestamp(0),"0:00");
  assert.equal(videoChapterTimestamp(125),"2:05");
  assert.equal(videoChapterTimestamp(3661),"61:01");
});
test("embed URLs are derived only from a validated provider URL",()=>{
  const video=normalizeVideo(base);
  assert.ok(video);
  assert.equal(videoEmbedUrl(video),"https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
});
