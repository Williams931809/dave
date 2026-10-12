import type { Config } from "@netlify/functions";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { reelItems } from "../../db/schema.js";

export default async () => {
  const items = await db
    .select({
      id: reelItems.id,
      title: reelItems.title,
      category: reelItems.category,
      label: reelItems.label,
      videoUrl: reelItems.videoUrl,
      layout: reelItems.layout,
    })
    .from(reelItems)
    .where(eq(reelItems.published, true))
    .orderBy(asc(reelItems.sortOrder), asc(reelItems.id));

  return Response.json(items, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
};

export const config: Config = {
  path: "/api/reel",
  method: "GET",
};
