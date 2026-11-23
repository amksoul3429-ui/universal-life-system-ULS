export type YouTubeSearchItem = {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  thumbnail: string;
  publishedAt: string;
  durationMinutes: number;
  views: number;
  likes: number;
  comments: number;
  channelSubscribers: number;
  url: string;
  score: number;
  scoreReasons: string[];
};

type YouTubeSearchResponse = { items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; description?: string; channelTitle?: string; channelId?: string; publishedAt?: string; thumbnails?: Record<string,{url?:string}> } }> };
type YouTubeVideosResponse = { items?: Array<{ id?: string; snippet?: { title?: string; description?: string; channelTitle?: string; channelId?: string; publishedAt?: string; thumbnails?: Record<string,{url?:string}> }; contentDetails?: { duration?: string }; statistics?: { viewCount?: string; likeCount?: string; commentCount?: string } }> };
type YouTubeChannelsResponse = { items?: Array<{ id?: string; statistics?: { subscriberCount?: string } }> };

const safeCount = (value: string | undefined) => Math.max(0, Number(value) || 0);
export function parseYouTubeDuration(value: string): number {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Math.ceil((Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0)) / 60);
}
function relevance(title: string, description: string, query: string): number {
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length > 2);
  if (!terms.length) return 0;
  const t = title.toLowerCase(), d = description.toLowerCase();
  const hits = terms.reduce((sum, term) => sum + (t.includes(term) ? 2 : d.includes(term) ? 1 : 0), 0);
  return Math.min(100, Math.round(hits / (terms.length * 2) * 100));
}
export function rankYouTubeResults(items: Omit<YouTubeSearchItem,"score"|"scoreReasons">[], query: string): YouTubeSearchItem[] {
  return items.map(item => {
    const rel = relevance(item.title, item.description, query);
    const views = Math.min(100, Math.log10(item.views + 1) / 7 * 100);
    const engagement = item.views ? Math.min(100, ((item.likes + item.comments) / item.views) * 1000) : 0;
    const channel = Math.min(100, Math.log10(item.channelSubscribers + 1) / 7 * 100);
    const duration = item.durationMinutes >= 8 && item.durationMinutes <= 180 ? 100 : item.durationMinutes > 0 && item.durationMinutes < 8 ? 45 : 65;
    const ageDays = item.publishedAt ? Math.max(0, (Date.now() - new Date(item.publishedAt).getTime()) / 86400000) : 3650;
    const freshness = Math.max(20, 100 - Math.min(80, ageDays / 45));
    const score = Math.round(rel * .45 + views * .15 + engagement * .15 + channel * .1 + duration * .1 + freshness * .05);
    const scoreReasons = [
      rel >= 65 ? "Strong topic match" : "Topic match",
      item.durationMinutes >= 8 ? "Lecture-length format" : "Short-format lesson",
      item.views >= 10000 ? "Established viewership" : "Viewership signal",
    ];
    return { ...item, score, scoreReasons };
  }).sort((a,b) => b.score-a.score);
}
export async function searchYouTubeEducationalVideos(apiKey: string, query: string, level = "All levels", maxResults = 15): Promise<YouTubeSearchItem[]> {
  const key = apiKey.trim(), topic = query.trim();
  if (!key) throw new Error("Add your YouTube Data API key to enable automatic video discovery.");
  if (!topic) throw new Error("Enter a subject or lesson topic to find videos.");
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.search = new URLSearchParams({ part:"snippet", type:"video", maxResults:String(Math.min(25,Math.max(5,maxResults))), q:topic+" "+(level==="All levels"?"educational lecture":level+" lesson lecture"), order:"relevance", safeSearch:"strict", videoEmbeddable:"true", videoSyndicated:"true", key }).toString();
  const searchResponse = await fetch(searchUrl.toString());
  const searchData = await searchResponse.json() as YouTubeSearchResponse & { error?: { message?: string } };
  if (!searchResponse.ok) throw new Error(searchData.error?.message || "YouTube search failed. Check the API key, quota and API restrictions.");
  const ids = (searchData.items || []).map(x=>x.id?.videoId).filter((x):x is string=>!!x);
  if (!ids.length) return [];
  const videoUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videoUrl.search = new URLSearchParams({ part:"snippet,contentDetails,statistics", id:ids.join(","), key }).toString();
  const videoResponse = await fetch(videoUrl.toString());
  const videoData = await videoResponse.json() as YouTubeVideosResponse & { error?: { message?: string } };
  if (!videoResponse.ok) throw new Error(videoData.error?.message || "Could not load video details.");
  const channelIds = [...new Set((videoData.items||[]).map(x=>x.snippet?.channelId).filter((x):x is string=>!!x))];
  const channelCounts = new Map<string,number>();
  if (channelIds.length) {
    const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelUrl.search = new URLSearchParams({ part:"statistics", id:channelIds.join(","), key }).toString();
    const channelResponse = await fetch(channelUrl.toString());
    if (channelResponse.ok) {
      const channelData = await channelResponse.json() as YouTubeChannelsResponse;
      (channelData.items||[]).forEach(x=>{ if(x.id) channelCounts.set(x.id,safeCount(x.statistics?.subscriberCount)); });
    }
  }
  const results = (videoData.items||[]).map(item=>{
    const snippet=item.snippet||{}, id=item.id||"", stats=item.statistics||{};
    const thumbs=snippet.thumbnails||{};
    return {
      id,title:snippet.title||"Untitled video",description:snippet.description||"",channelTitle:snippet.channelTitle||"YouTube channel",
      channelId:snippet.channelId||"",thumbnail:thumbs.high?.url||thumbs.medium?.url||thumbs.default?.url||"",
      publishedAt:snippet.publishedAt||"",durationMinutes:parseYouTubeDuration(item.contentDetails?.duration||""),
      views:safeCount(stats.viewCount),likes:safeCount(stats.likeCount),comments:safeCount(stats.commentCount),
      channelSubscribers:channelCounts.get(snippet.channelId||"")||0,url:"https://www.youtube.com/watch?v="+id,
    };
  }).filter(x=>x.id && x.durationMinutes>0);
  return rankYouTubeResults(results,topic);
}
