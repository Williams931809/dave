import { sql } from "drizzle-orm";
import { pgTable, serial, text, timestamp, integer, boolean, check } from "drizzle-orm/pg-core";

export const inquiries = pgTable("inquiries", {
  id: serial().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
  company: text(),
  service: text(),
  budget: text(),
  message: text().notNull(),
  status: text().notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reelItems = pgTable("reel_items", {
  id: serial().primaryKey(),
  title: text().notNull(),
  category: text().notNull(),
  label: text().notNull().default(""),
  videoUrl: text("video_url").notNull(),
  layout: text().notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean().notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Single row: the first account that signs up becomes the site admin
export const adminAccount = pgTable(
  "admin_account",
  {
    id: integer().primaryKey().default(1),
    userId: text("user_id").notNull(),
    email: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("admin_account_single_row", sql`${t.id} = 1`)],
);
