import type { Config, Context } from "@netlify/functions";
import { asc, desc, eq } from "drizzle-orm";
import { getUser, verifyRequestOrigin } from "@netlify/identity";
import { db } from "../../db/index.js";
import { inquiries, reelItems } from "../../db/schema.js";

const CATEGORIES = ["film", "event", "social", "artist"];
const LAYOUTS = ["", "b", "c", "tall", "b tall", "c tall"];
const STATUSES = ["new", "replied", "archived"];

function str(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export default async (req: Request, context: Context) => {
  const user = await getUser();
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });
  if (!user.roles?.includes("admin")) return Response.json({ error: "This account is not an admin" }, { status: 403 });
  if (req.method !== "GET") {
    try {
      verifyRequestOrigin(req);
    } catch {
      return Response.json({ error: "Bad origin" }, { status: 403 });
    }
  }

  const { resource, id } = context.params;
  const rowId = id ? Number(id) : null;
  if (id && !Number.isInteger(rowId)) return Response.json({ error: "Bad id" }, { status: 400 });
  const body = ["POST", "PATCH"].includes(req.method) ? await req.json().catch(() => ({})) : {};

  if (resource === "inquiries") {
    if (req.method === "GET") {
      return Response.json(await db.select().from(inquiries).orderBy(desc(inquiries.createdAt)));
    }
    if (req.method === "PATCH" && rowId) {
      if (!STATUSES.includes(body.status)) return Response.json({ error: "Bad status" }, { status: 422 });
      const [row] = await db.update(inquiries).set({ status: body.status }).where(eq(inquiries.id, rowId)).returning();
      return row ? Response.json(row) : Response.json({ error: "Not found" }, { status: 404 });
    }
    if (req.method === "DELETE" && rowId) {
      await db.delete(inquiries).where(eq(inquiries.id, rowId));
      return new Response(null, { status: 204 });
    }
  }

  if (resource === "reel") {
    if (req.method === "GET") {
      return Response.json(await db.select().from(reelItems).orderBy(asc(reelItems.sortOrder), asc(reelItems.id)));
    }
    if (req.method === "POST") {
      const title = str(body.title, 160);
      const videoUrl = str(body.videoUrl, 500);
      const category = str(body.category, 20);
      if (!title || !/^https?:\/\//.test(videoUrl) || !CATEGORIES.includes(category)) {
        return Response.json({ error: "Add a title, a category and a video link starting with http" }, { status: 422 });
      }
      const layout = LAYOUTS.includes(str(body.layout, 20)) ? str(body.layout, 20) : "";
      const [row] = await db
        .insert(reelItems)
        .values({
          title,
          videoUrl,
          category,
          layout,
          label: str(body.label, 60),
          sortOrder: Number.isFinite(Number(body.sortOrder)) ? Math.trunc(Number(body.sortOrder)) : 0,
        })
        .returning();
      return Response.json(row, { status: 201 });
    }
    if (req.method === "PATCH" && rowId) {
      const updates: Partial<typeof reelItems.$inferInsert> = {};
      if (typeof body.published === "boolean") updates.published = body.published;
      if (Number.isFinite(Number(body.sortOrder)) && body.sortOrder !== undefined) {
        updates.sortOrder = Math.trunc(Number(body.sortOrder));
      }
      if (!Object.keys(updates).length) return Response.json({ error: "Nothing to update" }, { status: 422 });
      const [row] = await db.update(reelItems).set(updates).where(eq(reelItems.id, rowId)).returning();
      return row ? Response.json(row) : Response.json({ error: "Not found" }, { status: 404 });
    }
    if (req.method === "DELETE" && rowId) {
      await db.delete(reelItems).where(eq(reelItems.id, rowId));
      return new Response(null, { status: 204 });
    }
  }

  return Response.json({ error: "Not found" }, { status: 404 });
};

export const config: Config = {
  path: ["/api/admin/:resource", "/api/admin/:resource/:id"],
};
