import type { Config } from "@netlify/functions";
import { db } from "../../db/index.js";
import { adminAccount } from "../../db/schema.js";

// Tells the login page whether to offer "create admin account"
export default async () => {
  const rows = await db.select({ id: adminAccount.id }).from(adminAccount).limit(1);
  return Response.json({ hasAdmin: rows.length > 0 }, { headers: { "Cache-Control": "no-store" } });
};

export const config: Config = {
  path: "/api/admin-status",
  method: "GET",
};
