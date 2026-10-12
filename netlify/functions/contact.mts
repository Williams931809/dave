import type { Config } from "@netlify/functions";
import { db } from "../../db/index.js";
import { inquiries } from "../../db/schema.js";

const SERVICES = ["advertising", "production", "strategy", "other"];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function field(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export default async (req: Request) => {
  let body: Record<string, unknown>;
  try {
    const type = req.headers.get("content-type") || "";
    body = type.includes("application/json")
      ? await req.json()
      : Object.fromEntries(await req.formData());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  // Honeypot: real visitors never fill this hidden field
  if (field(body.website, 200)) return Response.json({ ok: true });

  const name = field(body.name, 120);
  const email = field(body.email, 200);
  const message = field(body.message, 5000);
  const company = field(body.company, 200) || null;
  const budget = field(body.budget, 60) || null;
  const service = SERVICES.includes(field(body.service, 30)) ? field(body.service, 30) : null;

  if (!name || !message || !EMAIL_RE.test(email)) {
    return Response.json(
      { error: "Please add your name, a valid email and a message." },
      { status: 422 },
    );
  }

  await db.insert(inquiries).values({ name, email, company, service, budget, message });
  return Response.json({ ok: true }, { status: 201 });
};

export const config: Config = {
  path: "/api/contact",
  method: "POST",
};
