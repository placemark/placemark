import { parseFeed } from "htmlparser2";
import { env } from "app/lib/env_server";

const DAY = 86400000;
const RECENT = DAY * 7;
const SECOND = 1000;
const MINUTE = SECOND * 60;

type FeedItem = NonNullable<ReturnType<typeof parseFeed>>["items"][number];

let lastResult: null | {
  result: FeedItem | null;
  time: number;
} = null;

export function blogParseInner(text: string) {
  const feed = parseFeed(text);

  if (!feed) return null;

  const latest = feed.items[0];

  if (latest.pubDate) {
    latest.pubDate = new Date(latest.pubDate);
  }

  if (latest && latest.pubDate && +latest.pubDate > +new Date() - RECENT) {
    lastResult = {
      result: latest,
      time: +new Date(),
    };
    return latest;
  } else {
    lastResult = {
      result: null,
      time: +new Date(),
    };
    return null;
  }
}

export default async function getBlog(_ = null): Promise<FeedItem | null> {
  if (lastResult && lastResult.time > +new Date() - MINUTE * 15) {
    return lastResult.result;
  }

  const res = await fetch(env.BLOG_RSS_URL);
  const text = await res.text();
  return blogParseInner(text);
}
